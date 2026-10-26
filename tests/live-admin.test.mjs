import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CatalogueStore,storeName} from '../lib/store.mjs';
import {validateCatalogue,validImage} from '../lib/catalogue.mjs';
import {createHandlers} from '../lib/handlers.mjs';
import {MemoryStore} from './support/memory-store.mjs';
const products=JSON.parse(await readFile('data/products.json','utf8'));
const images=JSON.parse(await readFile('data/images.json','utf8'));
const pricing=JSON.parse(await readFile('data/pricing.json','utf8'));
const seed={version:1,products:products.map(p=>({...p,images:images[`${p.category}/${p.id}`]?.images||[]})),collections:Object.fromEntries(['faeries','wish-witches','kitchen-witches','fictional-magical-characters','more'].map(c=>[c,images[`${c}/collection`].images])),pricing};
const template=await readFile('faeries.html','utf8');
const order=await readFile('order.html','utf8');
const home=await readFile('index.html','utf8');
function setup(user={id:'owner',roles:['admin'],email:'owner@example.invalid'}) {
  const repository=new CatalogueStore(new MemoryStore(),seed);
  const handlers=createHandlers({repository,getUser:async()=>user,auth:{},templates:{'index.html':home,'faeries.html':template,'order.html':order},site:{url:'https://seosonas.co.uk'},context:'production'});
  return {repository,handlers};
}
const req=(path,body,origin='https://shop.example')=>new Request('https://shop.example'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
test('only admin accounts can read or write drafts; cross-origin writes fail',async()=>{
  assert.equal((await setup(null).handlers.admin(req('/api/admin'))).status,401);
  assert.equal((await setup({roles:['member']}).handlers.admin(req('/api/admin'))).status,403);
  const {handlers}=setup();
  assert.equal((await handlers.admin(req('/api/admin',{action:'save'},'https://evil.example'))).status,403);
  assert.equal((await handlers.admin(new Request('https://shop.example/api/admin',{method:'POST',body:'{}'}))).status,403);
});
test('drafts stay private, publication updates HTML, hidden/deleted products disappear, and backup restoration is draft-only',async()=>{
  const {repository,handlers}=setup();let {state,etag}=await repository.read();
  const draft=structuredClone(state.draft);draft.products[0].name='Autumn woodland magic';draft.products[1].active=false;
  let saved=await repository.write('save',{etag,catalogue:draft},'owner');
  assert.equal((await repository.read()).state.published.products[0].name,seed.products[0].name);
  assert.ok(!(await (await handlers.page(req('/faeries.html'))).text()).includes('Autumn woodland magic'));
  let published=await repository.write('publish',{etag:saved.etag},'owner');
  const html=await (await handlers.page(req('/faeries.html'))).text();
  assert.ok(html.includes('Autumn woodland magic'));assert.ok(!html.includes('id="earth-faery"'));
  assert.ok(!html.includes('href="#earth-faery"'));assert.ok(html.includes('<img src='));
  let restored=await repository.write('restore',{etag:published.etag,historyId:published.state.history[0].id},'owner');
  assert.equal(restored.state.draft.products[0].name,seed.products[0].name);
  assert.equal(restored.state.published.products[0].name,'Autumn woodland magic');
});
test('concurrent saves and stale publication fail atomically',async()=>{
  const {repository}=setup();
  const results=await Promise.allSettled([repository.write('save',{etag:'initial',catalogue:seed},'one'),repository.write('save',{etag:'initial',catalogue:seed},'two')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  await assert.rejects(repository.write('publish',{etag:'initial'},'owner'),{status:409});
});
test('price changes require Lopay review and stale checkout requests cannot proceed',async()=>{
  const {repository,handlers}=setup();const draft=structuredClone(seed);draft.pricing.deliveryPence=500;
  const saved=await repository.write('save',{etag:'initial',catalogue:draft},'owner');
  await assert.rejects(repository.write('publish',{etag:saved.etag},'owner'),{status:400});
  const pub=await repository.write('publish',{etag:saved.etag,pricesReviewed:true},'owner');
  assert.equal((await handlers.checkout(req('/api/checkout',{revision:'seed',category:'faeries',option:'faeries-1'}))).status,409);
  const check=await handlers.checkout(req('/api/checkout',{revision:pub.state.publishedRevision,category:'faeries',option:'faeries-1'}));
  assert.equal(check.status,200);assert.equal((await check.json()).total,'£25.50');
  assert.equal((await handlers.checkout(req('/api/checkout',{revision:pub.state.publishedRevision,category:'kitchen-witches',option:'kitchen-2'}))).status,400);
  const html=await (await handlers.page(req('/order.html'))).text();assert.ok(html.includes('£25.50'));assert.ok(html.includes('<span data-delivery>£5.00</span>'));
});
test('uploads require admin, validate image signatures, and unpublished photos remain private',async()=>{
  const {handlers,repository}=setup();
  const bytes=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const upload=()=>new Request('https://shop.example/api/upload',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'image/png'},body:bytes});
  assert.equal((await setup(null).handlers.upload(upload())).status,401);
  assert.equal((await handlers.upload(new Request('https://shop.example/api/upload',{method:'POST',headers:{Origin:'https://shop.example'},body:'<svg onload="evil()"></svg>'}))).status,415);
  const response=await handlers.upload(upload());assert.equal(response.status,201);const {src}=await response.json();
  const publicHandlers=createHandlers({repository,getUser:async()=>null});
  assert.equal((await publicHandlers.media(req(src))).status,401);
  const draft=structuredClone(seed);draft.products[0].images=[src];const saved=await repository.write('save',{etag:'initial',catalogue:draft},'owner');await repository.write('publish',{etag:saved.etag},'owner');
  assert.equal((await publicHandlers.media(req(src))).status,200);
});
test('validation rejects dangerous content paths, missing uploads, duplicate IDs and non-Lopay payment links',async()=>{
  for(const src of ['javascript:alert(1)','https://evil.example/photo.png','images/a/../../x.jpg','images/a/%zz.jpg','/media/evil.svg'])assert.equal(validImage(src),false);
  const bad=structuredClone(seed);bad.products.push(bad.products[0]);assert.throws(()=>validateCatalogue(bad));
  const prices=structuredClone(seed);prices.pricing.options.faeries[0].paymentLink='https://lopay.app.evil.example/pay';assert.throws(()=>validateCatalogue(prices));
  const missing=structuredClone(seed);missing.products[0].images=['/media/00000000-0000-0000-0000-000000000000.png'];
  await assert.rejects(setup().repository.write('save',{etag:'initial',catalogue:missing},'owner'),{status:400});
});
test('preview is protected, unindexable and disables ordering; markup is escaped',async()=>{
  assert.equal((await setup(null).handlers.page(req('/api/preview?page=order.html'))).status,401);
  const {repository,handlers}=setup();const draft=structuredClone(seed);draft.products[0].name='<img src=x onerror=alert(1)>';
  await repository.write('save',{etag:'initial',catalogue:draft},'owner');
  const preview=await handlers.page(req('/api/preview?page=faeries.html'));
  assert.equal(preview.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.ok((await preview.text()).includes('&lt;img src=x onerror=alert(1)&gt;'));
  const orderPreview=await (await handlers.page(req('/api/preview?page=order.html'))).text();assert.ok(orderPreview.includes('type="submit" disabled'));
});
test('preview, branch and local storage never select production; branches stay isolated',()=>{
  const production=storeName({CONTEXT:'production'});
  for(const env of [{},{CONTEXT:'dev'},{CONTEXT:'deploy-preview',REVIEW_ID:'1'},{CONTEXT:'branch-deploy',BRANCH:'main'}])assert.notEqual(storeName(env),production);
  assert.notEqual(storeName({CONTEXT:'deploy-preview',REVIEW_ID:'1'}),storeName({CONTEXT:'deploy-preview',REVIEW_ID:'2'}));
});
test('extensionless collection addresses read the live catalogue rather than static fallback',async()=>{
  const {repository,handlers}=setup();const draft=structuredClone(seed);draft.products[0].name='Live path test';
  const saved=await repository.write('save',{etag:'initial',catalogue:draft},'owner');await repository.write('publish',{etag:saved.etag},'owner');
  for(const url of ['/faeries','/faeries/','/faeries.html'])assert.ok((await (await handlers.page(req(url))).text()).includes('Live path test'));
});
test('seed revisions change if a deployment changes initial prices before the first publication',async()=>{
  const first=setup().repository;const changed=structuredClone(seed);changed.pricing.deliveryPence=700;
  const second=new CatalogueStore(new MemoryStore(),changed);
  assert.notEqual((await first.read()).state.publishedRevision,(await second.read()).state.publishedRevision);
});

test('homepage HTML and browser catalogue reflect publication while previews retain drafts', async () => {
  const {repository,handlers}=setup();
  const draft=structuredClone(seed);
  draft.products[0].name='Homepage published rename';
  draft.products[0].images=[];
  draft.products[1].active=false;
  draft.products.push({...draft.products[0],id:'new-home-product',name:'New homepage creation'});
  const saved=await repository.write('save',{etag:'initial',catalogue:draft},'owner');
  const preview=await (await handlers.page(req('/api/preview?page=index.html'))).text();
  assert.ok(preview.includes('New homepage creation'));
  assert.ok(preview.includes('preview-banner'));
  assert.ok(!(await (await handlers.page(req('/'))).text()).includes('Homepage published rename'));
  await repository.write('publish',{etag:saved.etag},'owner');
  const html=await (await handlers.page(req('/'))).text();
  const api=await (await handlers.page(req('/api/catalogue'))).json();
  assert.ok(html.includes('Homepage published rename'));
  assert.ok(html.includes('New homepage creation'));
  assert.ok(html.includes('Photographs coming soon'));
  assert.ok(!html.includes(`data-gallery="${draft.products[1].category}/${draft.products[1].id}"`));
  assert.equal((html.match(/class="home-card"/g)||[]).length,api.products.length);
  assert.equal(api.products[0].name,'Homepage published rename');
  assert.deepEqual(api.products[0].images,[]);
  assert.ok(html.includes('js/home.js'));
});
