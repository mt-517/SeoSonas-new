import { categories, tabFor, imageManifest, renderProducts, renderPrices, money, esc } from './catalogue.mjs';
import { renderGalleries } from '../scripts/seo.mjs';
export function renderPage(template,file,catalogue,revision,{preview=false}={}) {
  let html=template;
  for(const category of categories) {
    const pattern=new RegExp(`(<!-- catalogue:${category}:start -->)[\\s\\S]*?(<!-- catalogue:${category}:end -->)`);
    html=html.replace(pattern,(_,start,end)=>`${start}\n${renderProducts(catalogue,category)}\n${end}`);
  }
  html=renderGalleries(html,imageManifest(catalogue));
  for(const category of categories) {
    const tab=tabFor(category);
    const pattern=new RegExp(`(<!-- pricing:${tab}:start -->)[\\s\\S]*?(<!-- pricing:${tab}:end -->)`);
    html=html.replace(pattern,(_,a,b)=>a+renderPrices(catalogue.pricing,tab)+b);
  }
  html=html.replace(/<span data-delivery>.*?<\/span>/g,`<span data-delivery>${money(catalogue.pricing.deliveryPence)}</span>`);
  html=html.replace('</head>',`<meta name="catalogue-revision" content="${esc(revision)}">\n</head>`);
  if(preview) {
    html=html.replace(/<meta name="robots"[^>]+>/g,'<meta name="robots" content="noindex, nofollow">');
    html=html.replace('<head>','<head><base href="/">');
    html=html.replace('<body>','<body><aside class="preview-banner">Draft preview — not published. Order submission is disabled.</aside>');
    html=html.replace(/<button type="submit"/g,'<button type="submit" disabled');
  }
  return html;
}
export function renderSitemap(catalogue,origin) {
  const manifest=imageManifest(catalogue);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${['index',...categories].map(c=>`<url><loc>${origin}/${c==='index'?'':c+'.html'}</loc>${[...new Set(Object.values(manifest).filter(f=>f.href.split('#')[0]===c+'.html').flatMap(f=>f.images))].map(src=>`<image:image><image:loc>${esc(new URL(src,origin+'/').href)}</image:loc></image:image>`).join('')}</url>`).join('')}</urlset>`;
}
