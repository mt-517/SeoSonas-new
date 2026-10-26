import { readFile,writeFile,mkdir,cp,rm } from 'node:fs/promises';
import { categories, validateCatalogue } from '../lib/catalogue.mjs';
export async function packageSite(root) {
  const read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
  const products=await read('data/products.json');const images=await read('data/images.json');
  const seed=validateCatalogue({version:1,products:products.map(p=>({...p,images:images[`${p.category}/${p.id}`]?.images||[]})),collections:Object.fromEntries(categories.map(c=>[c,images[`${c}/collection`]?.images||[]])),pricing:await read('data/pricing.json')});
  const templates={};
  for(const name of ['index',...categories,'order']) templates[name+'.html']=await readFile(new URL(name+'.html',root),'utf8');
  await mkdir(new URL('netlify/generated/',root),{recursive:true});
  await writeFile(new URL('netlify/generated/site.json',root),JSON.stringify({seed,templates,site:await read('data/site.json'),environment:{CONTEXT:process.env.CONTEXT||'local',BRANCH:process.env.BRANCH||'local',REVIEW_ID:process.env.REVIEW_ID||''}}));
  // Only public assets go into the deploy. Source, tests and drafts never do.
  await rm(new URL('dist/',root),{recursive:true,force:true});
  await mkdir(new URL('dist/',root),{recursive:true});
  for(const item of ['css','js','images','admin','404.html','order-received.html','robots.txt',...Object.keys(templates)]) await cp(new URL(item,root),new URL('dist/'+item,root),{recursive:true,filter:src=>!src.endsWith('.DS_Store')&&!src.endsWith('.gitkeep')});
  await mkdir(new URL('dist/data/',root),{recursive:true});
  for(const name of ['products','images']) await cp(new URL(`data/${name}.json`,root),new URL(`dist/data/${name}.json`,root));
  await cp(new URL('sitemap.xml',root),new URL('dist/sitemap.xml',root)).catch(e=>{if(e.code!=='ENOENT') throw e;});
}
