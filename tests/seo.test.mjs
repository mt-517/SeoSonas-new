import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pages, siteOrigin, metadata, renderGalleries, buildSEO } from '../scripts/seo.mjs';
const config = {name:'SeoSonas',url:'https://seosonas.co.uk',description:'Handmade magical creations',profiles:['https://www.etsy.com/shop/SeoSonas','https://www.facebook.com/p/SeoSonas-61558121173117/']};
test('canonical origins reject unsuitable addresses and prefer explicit production configuration', () => {
  assert.equal(siteOrigin(config, {URL:'https://preview.netlify.app'}),config.url);
  assert.equal(siteOrigin({url:''}, {}),'');
  assert.equal(siteOrigin({url:''},{NETLIFY:'true',URL:'https://shop.netlify.app'}),'https://shop.netlify.app');
  for(const url of ['http://localhost','https://site.com/path','https://site.com/?x=1','https://user:pass@site.com','https://site.com/#a']) assert.throws(()=>siteOrigin({url},{}));
});
test('metadata is unique, canonical and linked to supplied shop profiles without invented product claims', () => {
  const titles = new Set(); const descriptions = new Set();
  for (const [file,p] of Object.entries(pages)) {
    const html = metadata(file,config,config.url);
    titles.add(p.title); descriptions.add(p.description);
    assert.ok(html.includes(`href="${config.url}/${file === 'index.html' ? '' : file}"`));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.deepEqual(schema['@graph'][0].sameAs,config.profiles);
    assert.ok(!html.includes('aggregateRating'));
    assert.equal(html.includes('noindex'),file==='order.html');
    assert.ok(metadata(file,config,config.url,true).includes('noindex, follow'));
  }
  assert.equal(titles.size,7); assert.equal(descriptions.size,7);
});
test('gallery HTML exposes linked photos without JavaScript and stays repeatable', () => {
  const manifest = {'faeries/test':{name:'Test & Fairy',href:'faeries.html#test',images:['images/a.webp','images/b.webp','images/c.webp']}};
  for(const count of [0,1,2]) {
    const result = renderGalleries(`<div class="product-gallery" data-gallery="faeries/test" data-count="${count}"></div>`,manifest);
    assert.equal((result.match(/<img /g)||[]).length,count||3);
    assert.ok(result.includes('href="faeries.html#test"'));
    assert.ok(result.includes('alt="Test &amp; Fairy'));
    assert.equal(renderGalleries(result,manifest),result);
    assert.ok(!renderGalleries(result,{}).includes('<img'));
  }
});
test('generated sitemap contains canonical content and images; preview builds remain unindexable', async () => {
  const dir = await mkdtemp(path.join(tmpdir(),'seosonas-seo-'));
  const oldContext = process.env.CONTEXT;
  try {
    await mkdir(path.join(dir,'data')); await mkdir(path.join(dir,'snippets'));
    await writeFile(path.join(dir,'data/site.json'),JSON.stringify(config));
    await writeFile(path.join(dir,'snippets/header-footer.html'),'<header><a href="index.html">Home</a></header><footer>SeoSonas</footer>');
    for (const file of Object.keys(pages)) await writeFile(path.join(dir,file),'<html><head><title>Old</title></head><body><main><h1>Test</h1></main></body></html>');
    const manifest = {'faeries/test':{href:'faeries.html#test',images:['images/test.webp']}};
    process.env.CONTEXT='production';
    await buildSEO(dir,manifest);
    const sitemap=await readFile(path.join(dir,'sitemap.xml'),'utf8');
    assert.equal((sitemap.match(/<url>/g)||[]).length,6);
    assert.ok(!sitemap.includes('order.html')); assert.ok(!sitemap.includes('#test'));
    assert.ok(sitemap.includes('<image:loc>https://seosonas.co.uk/images/test.webp</image:loc>'));
    assert.ok((await readFile(path.join(dir,'robots.txt'),'utf8')).includes('Sitemap:'));
    const before=await readFile(path.join(dir,'index.html'),'utf8');
    await buildSEO(dir,manifest);
    assert.equal(await readFile(path.join(dir,'index.html'),'utf8'),before);
    assert.equal((before.match(/<header>/g)||[]).length,1);
    process.env.CONTEXT='deploy-preview';
    await buildSEO(dir,manifest);
    assert.ok((await readFile(path.join(dir,'faeries.html'),'utf8')).includes('noindex, follow'));
    await assert.rejects(readFile(path.join(dir,'sitemap.xml')), {code:'ENOENT'});
  } finally {
    if(oldContext===undefined) delete process.env.CONTEXT; else process.env.CONTEXT=oldContext;
    await rm(dir,{recursive:true,force:true});
  }
});
