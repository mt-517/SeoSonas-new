import { randomUUID } from 'node:crypto';
import { HttpError, imageManifest, money } from './catalogue.mjs';
import { requireAdmin, requireOrigin, readJSON, headers, json, failure, imageType } from './store.mjs';
import { renderPage, renderSitemap } from './render.mjs';
export function createHandlers({repository,getUser,auth,templates,site,context='local'}) {
  return {
    async admin(request) {
      try {
        const user=requireAdmin(await getUser());
        if(request.method==='GET') return json({...await repository.read(),environment:context});
        if(request.method!=='POST') throw new HttpError(405,'Method not allowed.');
        requireOrigin(request);const body=await readJSON(request);
        return json(await repository.write(body.action,body,user.id));
      } catch(e) { return failure(e); }
    },
    async session(request) {
      try {
        if(request.method==='GET') {const user=await getUser();return json({user:user?{email:user.email,admin:user.roles?.includes('admin')}:null});}
        if(request.method!=='POST') throw new HttpError(405,'Method not allowed.');
        requireOrigin(request);const b=await readJSON(request,12000);
        if(!['login','logout','invite','recover','reset'].includes(b.action)) throw new HttpError(400,'Unknown sign-in action.');
        if(['login','invite','reset'].includes(b.action)&&(typeof b.password!=='string'||b.password.length<8||b.password.length>256)) throw new HttpError(400,'Use a password of 8–256 characters.');
        if(['login','recover'].includes(b.action)&&(typeof b.email!=='string'||b.email.length>254||!b.email.includes('@'))) throw new HttpError(400,'Enter your email address.');
        if(['invite','reset'].includes(b.action)&&(typeof b.token!=='string'||b.token.length>4000)) throw new HttpError(400,'Invalid invitation or recovery link.');
        try {
          if(b.action==='logout') await auth.logout();
          if(b.action==='login') await auth.login(b.email,b.password);
          if(b.action==='invite') await auth.acceptInvite(b.token,b.password);
          if(b.action==='reset') await auth.recoverPassword(b.token,b.password);
          if(b.action==='recover') {try {await auth.requestPasswordRecovery(b.email);} catch {} }
        } catch {throw new HttpError(401,'Unable to sign in or use this link. Check your details, or request a new invitation/recovery email.');}
        return json({ok:true});
      } catch(e) {return failure(e);}
    },
    async upload(request) {
      try {
        requireAdmin(await getUser());
        if(request.method!=='POST') throw new HttpError(405,'Method not allowed.');
        requireOrigin(request);
        if(Number(request.headers.get('content-length'))>4000000) throw new HttpError(413,'Please use a photograph smaller than 4 MB.');
        const bytes=Buffer.from(await request.arrayBuffer());
        if(bytes.length>4000000||bytes.length<12) throw new HttpError(413,'Please use a photograph between 12 bytes and 4 MB.');
        const type=imageType(bytes);const id=`${randomUUID()}.${type.extension}`;
        await repository.store.set(`media/${id}`,bytes,{metadata:{contentType:type.mime},onlyIfNew:true});
        return json({src:`/media/${id}`},201);
      } catch(e) {return failure(e);}
    },
    async media(request) {
      try {
        const id=new URL(request.url).pathname.split('/').pop();
        if(!/^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(id)) throw new HttpError(404,'Photograph not found.');
        const {state}=await repository.read();const src=`/media/${id}`;
        const published=Object.values(imageManifest(state.published)).some(f=>f.images.includes(src));
        if(!published) requireAdmin(await getUser());
        const entry=await repository.store.getWithMetadata(`media/${id}`,{type:'arrayBuffer'});
        if(!entry) throw new HttpError(404,'Photograph not found.');
        return new Response(entry.data,{headers:{...headers,'Content-Type':entry.metadata.contentType,'Content-Security-Policy':"default-src 'none'",'X-Robots-Tag':published?'all':'noindex'}});
      } catch(e) {return failure(e);}
    },
    async checkout(request) {
      try {
        if(request.method!=='POST') throw new HttpError(405,'Method not allowed.');
        requireOrigin(request);const b=await readJSON(request,4000);const {state}=await repository.read();
        if(b.revision!==state.publishedRevision) throw new HttpError(409,'The catalogue or prices have changed. Reload this page before ordering.');
        const option=state.published.pricing.options[b.category]?.find(o=>o.id===b.option&&o.enabled);
        if(!option) throw new HttpError(400,'This payment option is no longer available.');
        return json({paymentLink:option.paymentLink,label:option.label,total:money(option.pricePence+state.published.pricing.deliveryPence)});
      } catch(e) {return failure(e);}
    },
    async page(request) {
      try {
        if(!['GET','HEAD'].includes(request.method)) throw new HttpError(405,'Method not allowed.');
        const url=new URL(request.url);const preview=url.pathname==='/api/preview';
        if(preview) requireAdmin(await getUser());
        const {state}=await repository.read();const data=preview?state.draft:state.published;
        const publicHeaders={...headers,...(preview||context!=='production'?{'X-Robots-Tag':'noindex, nofollow'}:{})};
        if(url.pathname==='/api/catalogue') return json({products:data.products.filter(p=>p.active),revision:state.publishedRevision});
        if(url.pathname==='/data/products.json') return json(data.products.filter(p=>p.active));
        if(url.pathname==='/data/images.json') return json(imageManifest(data));
        if(url.pathname==='/sitemap.xml') return new Response(renderSitemap(data,site.url),{headers:{...publicHeaders,'Content-Type':'application/xml; charset=utf-8'}});
        let file=preview?url.searchParams.get('page')||'index.html':url.pathname==='/'?'index.html':url.pathname.slice(1);
        if(!preview) { file=file.replace(/\/$/,''); if(!file.endsWith('.html')) file+='.html'; }
        if(!Object.hasOwn(templates,file)) throw new HttpError(404,'Page not found.');
        let html=renderPage(templates[file],file,data,state.publishedRevision,{preview});
        // Prefill from the same snapshot as the rendered page, without a stale JSON request.
        const product=data.products.find(p=>p.active&&p.id===url.searchParams.get('product'));
        if(product&&file==='order.html') {
          const safe=JSON.stringify({id:product.id,name:product.name,orderTab:product.orderTab}).replaceAll('<','\\u003c');
          html=html.replace('</head>',`<script id="selected-product" type="application/json">${safe}</script></head>`);
        }
        return new Response(request.method==='HEAD'?null:html,{headers:{...publicHeaders,'Content-Type':'text/html; charset=utf-8'}});
      } catch(e) {
        if(e.status===404) return new Response('Page not found',{status:404,headers});
        return failure(e);
      }
    }
  };
}
