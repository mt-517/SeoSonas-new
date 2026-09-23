import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sortImages, scanImages, validateProducts, build } from '../scripts/build.mjs';

test('filenames use natural name order', () => {
  assert.deepEqual(sortImages(['img10.webp','img2.webp','img1.webp']), ['img1.webp','img2.webp','img10.webp']);
});
test('scanner discovers new images, excludes non-images, encodes spaces and handles empty folders', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'seosonas-'));
  try {
    await mkdir(path.join(dir, 'faeries/autumn-fae'), {recursive:true});
    await mkdir(path.join(dir, 'faeries/empty'));
    for (const name of ['img10.webp','img2.jpg','img 1.png','notes.txt']) await writeFile(path.join(dir,'faeries/autumn-fae',name),'');
    const result = await scanImages(dir);
    assert.deepEqual(result['faeries/autumn-fae'], ['images/faeries/autumn-fae/img%201.png','images/faeries/autumn-fae/img2.jpg','images/faeries/autumn-fae/img10.webp']);
    assert.deepEqual(result['faeries/empty'], []);
  } finally { await rm(dir, { recursive:true, force:true }); }
});
test('catalogue IDs, category links, and content are validated', async () => {
  const products = JSON.parse(await readFile('data/products.json','utf8'));
  validateProducts(products);
  assert.throws(() => validateProducts([...products,products[0]]), /duplicate/);
  assert.throws(() => validateProducts([{...products[0],id:'../bad'}]), /Invalid/);
  assert.throws(() => validateProducts([{...products[0],orderTab:'wrong'}]), /Invalid/);
});
test('every active product has a section, correct order link and image destination; builds are repeatable', async () => {
  await build();
  const products = JSON.parse(await readFile('data/products.json','utf8'));
  const manifest = JSON.parse(await readFile('data/images.json','utf8'));
  const pages = {};
  for (const p of products.filter(p=>p.active)) {
    pages[p.page] ??= await readFile(p.page,'utf8');
    assert.ok(pages[p.page].includes(`id="${p.id}"`));
    assert.ok(pages[p.page].includes(`order.html?product=${p.id}#${p.orderTab}`));
    assert.equal(manifest[`${p.category}/${p.id}`].href, `${p.page}#${p.id}`);
    for (const src of manifest[`${p.category}/${p.id}`].images) await readFile(decodeURIComponent(src));
  }
  await build();
  for (const [page, content] of Object.entries(pages)) assert.equal(await readFile(page,'utf8'), content);
});
