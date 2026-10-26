export const categories = ['faeries','wish-witches','kitchen-witches','fictional-magical-characters','more'];
export const tabFor = category => category === 'fictional-magical-characters' ? 'fictional-characters' : category;
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class HttpError extends Error { constructor(status,message) { super(message); this.status=status; } }
const insist = (ok,message) => { if(!ok) throw new HttpError(400,message); };
const text = (v,max=10000) => typeof v==='string' && v.length<=max;
const slug = v => typeof v==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length<=100;
export function validImage(src) {
  try { return typeof src==='string' && ( /^images\/(?:[a-z0-9-]+\/)+[^/]+\.(webp|avif|png|jpe?g|gif)$/i.test(src) && !decodeURIComponent(src).split('/').some(s=>s==='..') && !/[<>"\\?#]/.test(src) || /^\/media\/[0-9a-f-]{36}\.(webp|png|jpg|gif)$/.test(src)); } catch { return false; }
}
export function validateCatalogue(input) {
  insist(input && input.version===1,'Unsupported catalogue format.');
  insist(Array.isArray(input.products)&&input.products.length<=500,'Maximum 500 products.');
  const ids=new Set();
  for(const p of input.products) {
    insist(p && typeof p==='object','Invalid product.');
    insist(slug(p.id)&&!ids.has(p.id),'Product IDs must be unique lowercase words separated by hyphens.'); ids.add(p.id);
    insist(categories.includes(p.category)&&p.page===`${p.category}.html`&&p.orderTab===tabFor(p.category),'Invalid category.');
    insist(text(p.name,150)&&p.name.trim()&&typeof p.active==='boolean','Each product needs a name and visibility.');
    insist(Array.isArray(p.blocks)&&p.blocks.length<=100&&p.blocks.every(b=>b&&['p','li'].includes(b.type)&&text(b.text)),'Invalid product description.');
    insist(Array.isArray(p.images)&&p.images.length<=40&&p.images.every(validImage),'Invalid product photograph.');
  }
  insist(input.collections&&categories.every(c=>Array.isArray(input.collections[c])&&input.collections[c].length<=40&&input.collections[c].every(validImage)),'Invalid collection photographs.');
  const prices=input.pricing;
  const money=v=>Number.isInteger(v)&&v>=0&&v<=1000000;
  insist(prices&&money(prices.deliveryPence),'Delivery must be a valid price.');
  for(const category of categories) {
    const opts=prices.options?.[tabFor(category)]; const used=new Set();
    insist(Array.isArray(opts)&&opts.length<=30,'Invalid price options.');
    insist(category!=='more'||opts.length===0,'More is an enquiry-only category.');
    for(const o of opts) {
      insist(o&&typeof o==='object','Invalid price option.');
      insist(slug(o.id)&&!used.has(o.id)&&text(o.label,150)&&o.label.trim()&&money(o.pricePence)&&typeof o.enabled==='boolean','Invalid price option.'); used.add(o.id);
      insist(text(o.paymentLink,500)&&(!o.paymentLink||/^https:\/\/lopay\.app\/[a-zA-Z0-9/_-]+$/.test(o.paymentLink)),'Use a valid https://lopay.app payment link.');
      insist(!o.enabled||o.paymentLink,'Enabled price options require a Lopay payment link.');
    }
  }
  // Whitelist fields to keep arbitrary properties out of stored/rendered content.
  return {version:1,products:input.products.map(p=>({id:p.id,name:p.name,category:p.category,page:p.page,orderTab:p.orderTab,active:p.active,blocks:p.blocks.map(b=>({type:b.type,text:b.text})),images:[...p.images]})),collections:Object.fromEntries(categories.map(c=>[c,[...input.collections[c]]])),pricing:{deliveryPence:prices.deliveryPence,options:Object.fromEntries(categories.map(c=>[tabFor(c),prices.options[tabFor(c)].map(o=>({id:o.id,label:o.label,pricePence:o.pricePence,paymentLink:o.paymentLink,enabled:o.enabled}))]))}};
}
export function imageManifest(catalogue) {
  return Object.fromEntries([...catalogue.products.filter(p=>p.active).map(p=>[`${p.category}/${p.id}`,{name:p.name,href:`${p.page}#${p.id}`,images:p.images}]),...categories.map(c=>[`${c}/collection`,{name:c.replaceAll('-',' '),href:`${c}.html`,images:catalogue.collections[c]}])]);
}
export const money = p => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
export function renderGallery(p,count=0) {
  const imgs=count?p.images.slice(0,count):p.images;
  return `<div class="product-gallery" data-gallery="${p.category}/${p.id}" data-count="${count}" data-gallery-rendered="true">${imgs.length?imgs.map((src,i)=>`<a href="${esc(p.page)}#${p.id}"><img src="${esc(src)}" alt="${esc(p.name)} — photograph ${i+1}" loading="lazy" decoding="async"></a>`).join(''):'<p class="gallery-status">Photographs coming soon</p>'}</div>`;
}
export function renderProducts(catalogue,category) {
  const items=catalogue.products.filter(p=>p.active&&p.category===category);const cards=['wish-witches','kitchen-witches'].includes(category);
  if(!items.length)return '<p class="intro-section">New creations are on their way. Please check back soon.</p>';
  const nav=cards||category==='more'?'':`<nav class="catalogue-nav" aria-label="Browse this collection">${items.map(p=>`<a href="#${p.id}">${esc(p.name)}</a>`).join('')}</nav>`;
  const content=items.map(p=>{
    const description=p.blocks.map(b=>b.type==='li'?`<ul><li>${esc(b.text.replace(/^•\s*/,''))}</li></ul>`:`<p>${esc(b.text)}</p>`).join('');
    const button=`<a class="order-button product-order" href="order.html?product=${p.id}#${p.orderTab}">${category==='more'?'Enquire about this creation':`Order ${esc(p.name)}`}</a>`;
    return cards?`<article class="product-card" id="${p.id}">${renderGallery(p)}<div class="product-info"><h3 class="product-name">${esc(p.name)}</h3>${description}${button}</div></article>`:`<section class="faery-section" id="${p.id}"><h2>${esc(p.name)}</h2><div class="faery-content">${renderGallery(p,1)}<div class="faery-text">${description}${button}</div></div>${p.images.length>1?`<details class="product-pictures"><summary>View all photographs</summary>${renderGallery(p)}</details>`:''}</section>`;
  }).join('');
  return nav+(cards?`<div class="product-grid">${content}</div>`:content)||'<p class="intro-section">New creations are on their way. Please check back soon.</p>';
}
export function renderPrices(pricing,tab) {
  return pricing.options[tab].map(o=>`<label class="radio-item"><input type="radio" id="${esc(tab+'-'+o.id)}" name="${tab}-option" value="${esc(o.id)}" data-link="${esc(o.paymentLink)}" ${o.enabled?'':'disabled'}><span class="radio-item-content"><span class="radio-item-title">${esc(o.label)}</span><span class="radio-item-price">${money(o.pricePence)} + ${money(pricing.deliveryPence)} delivery = ${money(o.pricePence+pricing.deliveryPence)}${o.enabled?'':' (Unavailable)'}</span></span></label>`).join('');
}
