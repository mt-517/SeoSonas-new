import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pages = {
  'index.html': {title:'Handmade Fairies, Wish Witches & Magical Gifts | SeoSonas',description:'Meet Helen’s handmade faeries, wish witches, kitchen witches and magical characters. Explore the SeoSonas collection and find a little handmade magic.',name:'Home',image:'images/hero.jpeg'},
  'faeries.html': {title:'Handmade Fairies & Seasonal Faeries | SeoSonas',description:'Explore handmade faeries inspired by seasons, woodland and folklore. Meet Autumn Fae, Summer Fae, Jack Frost and more in Helen’s SeoSonas collection.',name:'Handmade Faeries',image:'images/faeries/collection/img1.jpg'},
  'wish-witches.html': {title:'Handmade Wish Witches with Secret Messages | SeoSonas',description:'Meet SeoSonas Wish Witches, handmade figures with a secret message hidden in their broomsticks. Explore the collection and choose a magical gift.',name:'Wish Witches',image:'images/wish-witches/collection/img1.jpg'},
  'kitchen-witches.html': {title:'Handmade Kitchen Witches in Eight Colours | SeoSonas',description:'Discover handmade Kitchen Witches for hearth and home. Explore eight colours, from black to yellow, and choose a magical companion for your kitchen.',name:'Kitchen Witches',image:'images/kitchen-witches/collection/img1.jpg'},
  'fictional-magical-characters.html': {title:'Handmade Magical Character Figures | SeoSonas',description:'Explore Helen’s handmade magical character figures inspired by favourite books, films and stories, from wizarding folk to festive Christmas characters.',name:'Magical Characters',image:'images/fictional-magical-characters/collection/img1.jpg'},
  'more.html': {title:'Peg Dolls & Musical Box Miniatures — Coming Soon | SeoSonas',description:'Discover SeoSonas peg dolls and musical box miniatures in development. Read about these handmade creations and register your interest with Helen.',name:'More Creations',image:'images/more/collection/img1.jpg'},
  'order.html': {title:'Order Handmade Faeries & Witches | SeoSonas',description:'Choose your SeoSonas faeries, wish witches, kitchen witches or magical characters. View prices and delivery, share your order details and continue to payment.',name:'Order',image:'images/hero.jpeg',noindex:true}
};
export function siteOrigin(config, env = process.env) {
  const value = env.SITE_URL || config.url || (env.NETLIFY === 'true' ? env.URL : '') || '';
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || /^(localhost|127\.|\[::1\])/.test(url.hostname)) throw new Error('Site URL must be the public HTTPS origin, with no path, query or fragment.');
  return url.origin;
}
export function renderGalleries(html, manifest) {
  return html.replace(/<div\b([^>]*\bdata-gallery="([^"]+)"[^>]*)>[\s\S]*?<\/div>/g, (_, attrs, key) => {
    const count = Number(attrs.match(/data-count="(\d+)"/)?.[1] ?? 0);
    const folder = manifest[key];
    const all = folder?.images || [];
    const selected = count === 0 ? all : all.slice(0,count);
    const content = selected.length ? selected.map((src,i) => `<a href="${esc(folder.href)}"><img src="${esc(src)}" alt="${esc(folder.name)} — handmade SeoSonas creation, photograph ${i+1}" loading="lazy" decoding="async"></a>`).join('') : '<p class="gallery-status">Photographs coming soon</p>';
    return `<div${attrs.replace(/\sdata-gallery-rendered="[^"]*"/g,'')} data-gallery-rendered="true">${content}</div>`;
  });
}
export function metadata(file, config, origin, preview = false) {
  const p = pages[file];
  const url = origin ? `${origin}/${file === 'index.html' ? '' : file}` : '';
  const organization = {'@type':'Organization',name:config.name,description:config.description,sameAs:config.profiles,...(origin ? {'@id':`${origin}/#organization`,url:`${origin}/`} : {})};
  const graph = [organization];
  if (origin) {
    graph.push({'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:config.name,publisher:{'@id':`${origin}/#organization`}});
    graph.push({'@type':file === 'index.html' || p.noindex ? 'WebPage' : 'CollectionPage','@id':`${url}#webpage`,url,name:p.title,description:p.description,isPartOf:{'@id':`${origin}/#website`},about:{'@id':`${origin}/#organization`}});
    if (file !== 'index.html') graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${origin}/`},{'@type':'ListItem',position:2,name:p.name,item:url}]});
  }
  return `<!-- seo:start -->
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="${preview || p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
${origin ? `<link rel="canonical" href="${esc(url)}">\n<meta property="og:url" content="${esc(url)}">\n<meta property="og:image" content="${esc(origin+'/'+p.image)}">\n<meta property="og:image:alt" content="${esc(config.description)}">` : ''}

<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c')}</script>
<!-- seo:end -->`;
}
export async function buildSEO(root, manifest) {
  const config = JSON.parse(await readFile(path.join(root,'data/site.json'),'utf8'));
  const origin = siteOrigin(config);
  const preview = !!process.env.CONTEXT && process.env.CONTEXT !== 'production';
  const shared = await readFile(path.join(root,'snippets/header-footer.html'),'utf8');
  const header = shared.match(/<header>[\s\S]*?<\/header>/)[0];
  const footer = shared.match(/<footer>[\s\S]*?<\/footer>/)[0];
  for (const file of Object.keys(pages)) {
    let html = await readFile(path.join(root,file),'utf8');
    html = html.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->\s*/g,'').replace(/<title>[\s\S]*?<\/title>\s*/g,'');
    html = html.replace('</head>',metadata(file,config,origin,preview)+'\n</head>');
    for (const [name,markup] of [['header',header],['footer',footer]]) {
      if (file === 'index.html' && html.includes('class="home-page"')) continue;
      const block = `<!-- shared:${name}:start -->\n${markup}\n<!-- shared:${name}:end -->`;
      const pattern = new RegExp(`<!-- shared:${name}:start -->[\\s\\S]*?<!-- shared:${name}:end -->`);
      html = pattern.test(html) ? html.replace(pattern,()=>block) : name === 'header' ? html.replace(/<body>/,`<body>\n${block}`) : html.replace('</body>',`${block}\n</body>`);
    }
    html = html.replace(/<!-- breadcrumbs:start -->[\s\S]*?<!-- breadcrumbs:end -->\n?/g,'');
    if (file !== 'index.html') html = html.replace(/<main>\n?/, `<main>\n<!-- breadcrumbs:start --><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(pages[file].name)}</span></nav><!-- breadcrumbs:end -->\n`);
    await writeFile(path.join(root,file),renderGalleries(html,manifest));
  }
  await writeFile(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\n${origin && !preview ? `\nSitemap: ${origin}/sitemap.xml\n` : ''}`);
  if (origin && !preview) {
    const entries = Object.entries(pages).filter(([,p])=>!p.noindex).map(([file]) => {
      const images = [...new Set(Object.values(manifest).filter(f=>f.href.split('#')[0]===file).flatMap(f=>f.images))];
      return `<url><loc>${esc(origin+'/'+(file==='index.html'?'':file))}</loc>${images.map(src=>`<image:image><image:loc>${esc(origin+'/'+src)}</image:loc></image:image>`).join('')}</url>`;
    });
    await writeFile(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`);
  } else {
    await unlink(path.join(root,'sitemap.xml')).catch(e=>{if(e.code!=='ENOENT') throw e;});
    if (!origin) console.log('SEO: set data/site.json url or SITE_URL to generate production canonical URLs and sitemap.');
  }
}
