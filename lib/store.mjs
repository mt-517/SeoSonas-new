import { randomUUID, createHash } from 'node:crypto';
import { HttpError, validateCatalogue } from './catalogue.mjs';
export function storeName(env=process.env) {
  // Never let an unspecified/local/preview context access the production store.
  if(env.CONTEXT==='production') return 'seosonas-catalogue-production';
  const context=env.CONTEXT || 'local';
  const scope=env.REVIEW_ID || env.BRANCH || 'local';
  return `seosonas-catalogue-${context}-${createHash('sha256').update(scope).digest('hex').slice(0,16)}`;
}
export class CatalogueStore {
  constructor(store,seed) { this.store=store;this.seed=validateCatalogue(seed);this.seedRevision='seed-'+createHash('sha256').update(JSON.stringify(this.seed)).digest('hex').slice(0,20); }
  async read() {
    const result=await this.store.getWithMetadata('state',{type:'json'});
    return result?{state:result.data,etag:result.etag}:{state:{draft:this.seed,published:this.seed,publishedRevision:this.seedRevision,history:[],updatedAt:null},etag:'initial'};
  }
  async validateImages(catalogue) {
    const known=new Set([...this.seed.products.flatMap(p=>p.images),...Object.values(this.seed.collections).flat()]);
    const images=[...new Set([...catalogue.products.flatMap(p=>p.images),...Object.values(catalogue.collections).flat()])];
    for(const src of images) {
      if(src.startsWith('/media/')) {
        if(!await this.store.getMetadata(src.slice(1))) throw new HttpError(400,'An uploaded photograph is missing from this environment. Upload it here before saving.');
      } else if(!known.has(src)) throw new HttpError(400,'An image file is not available in this deployment. Upload it through the studio.');
    }
  }
  async write(action,{etag,catalogue,historyId,pricesReviewed=false},actor) {
    const current=await this.read();
    if(etag!==current.etag) throw new HttpError(409,'Someone saved a newer version. Export your changes, then reload the draft before saving.');
    const state=structuredClone(current.state);
    if(action==='save') state.draft=validateCatalogue(catalogue);
    else if(action==='restore') {
      if(!state.history.some(h=>h.id===historyId)) throw new HttpError(404,'That backup is not available.');
      state.draft=validateCatalogue(await this.store.get(`history/${historyId}`,{type:'json'}));
    } else if(action==='publish') {
      validateCatalogue(state.draft);
      if(JSON.stringify(state.draft.pricing)!==JSON.stringify(state.published.pricing)&&pricesReviewed!==true) throw new HttpError(400,'Confirm that every enabled Lopay link charges the displayed total, including delivery.');
      const id=randomUUID();
      await this.store.setJSON(`history/${id}`,state.published,{onlyIfNew:true});
      state.history=[{id,publishedRevision:state.publishedRevision,savedAt:new Date().toISOString()},...state.history].slice(0,30);
      state.published=structuredClone(state.draft);state.publishedRevision=randomUUID();
    } else throw new HttpError(400,'Unknown action.');
    await this.validateImages(state.draft);
    state.updatedAt=new Date().toISOString();state.updatedBy=actor;
    const result=await this.store.setJSON('state',state,current.etag==='initial'?{onlyIfNew:true}:{onlyIfMatch:current.etag});
    if(!result.modified) throw new HttpError(409,'A newer version was saved while you were editing. Reload before saving.');
    return {state,etag:result.etag};
  }
}
export function requireAdmin(user) {
  if(!user) throw new HttpError(401,'Please sign in.');
  if(!user.roles?.includes('admin')) throw new HttpError(403,'This account does not have the owner admin role.');
  return user;
}
export function requireOrigin(request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) throw new HttpError(403,'This request must come from this website.');
}
export async function readJSON(request,limit=1500000) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415,'Send JSON.');
  if(Number(request.headers.get('content-length'))>limit) throw new HttpError(413,'The catalogue is too large.');
  const body=await request.text();
  if(Buffer.byteLength(body)>limit) throw new HttpError(413,'The catalogue is too large.');
  try { const value=JSON.parse(body); if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error(); return value; } catch { throw new HttpError(400,'Invalid JSON object.'); }
}
export const headers={'Cache-Control':'no-store','Netlify-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export const json=(data,status=200)=>Response.json(data,{status,headers});
export function failure(error) {
  if(!error.status) console.error('Catalogue request failed:',error.message);
  return json({error:error.status?error.message:'The catalogue service is unavailable. Please try again.'},error.status||503);
}
export function imageType(bytes) {
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255) return {extension:'jpg',mime:'image/jpeg'};
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {extension:'png',mime:'image/png'};
  if(['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString())) return {extension:'gif',mime:'image/gif'};
  if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP') return {extension:'webp',mime:'image/webp'};
  throw new HttpError(415,'Upload a JPEG, PNG, WebP or GIF photograph.');
}
