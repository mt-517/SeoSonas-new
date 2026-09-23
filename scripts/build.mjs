import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const categories = ['faeries', 'wish-witches', 'kitchen-witches', 'fictional-magical-characters', 'more'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const sortImages = names => names.sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }) || a.localeCompare(b, 'en'));
export function validateProducts(products) {
  const ids = new Set();
  for (const p of products) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) || ids.has(p.id)) throw new Error(`Invalid or duplicate product ID: ${p.id}`);
    ids.add(p.id);
    if (!categories.includes(p.category) || p.page !== `${p.category}.html` || p.orderTab !== (p.category === 'fictional-magical-characters' ? 'fictional-characters' : p.category)) throw new Error(`Invalid category/page/tab: ${p.id}`);
    if (typeof p.name !== 'string' || !p.name.trim() || typeof p.active !== 'boolean' || !Array.isArray(p.blocks) || p.blocks.some(b => !['p','li'].includes(b.type) || typeof b.text !== 'string')) throw new Error(`Invalid product content: ${p.id}`);
  }
}
export async function scanImages(folder, prefix = '') {
  const result = {};
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    const directory = path.join(folder, entry.name);
    const files = (await readdir(directory, { withFileTypes: true })).filter(e => e.isFile() && /\.(webp|avif|png|jpe?g|gif)$/i.test(e.name)).map(e => e.name);
    result[key] = sortImages(files).map(name => `images/${key.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(name)}`);
    Object.assign(result, await scanImages(directory, key));
  }
  return result;
}
function gallery(p, count, className = 'product-gallery') {
  return `<div class="${className}" data-gallery="${p.category}/${p.id}" data-count="${count}"><p class="gallery-status">Photographs of ${escape(p.name)} will appear here.</p></div>`;
}
function productMarkup(p, cards) {
  const content = p.blocks.map(b => b.type === 'li' ? `<ul><li>${escape(b.text.replace(/^•\s*/, ''))}</li></ul>` : `<p>${escape(b.text)}</p>`).join('\n');
  const order = `<a class="order-button product-order" href="order.html?product=${encodeURIComponent(p.id)}#${p.orderTab}">${p.category === 'more' ? 'Enquire about this creation' : 'Order '+escape(p.name)}</a>`;
  const images = gallery(p, cards ? 0 : 1);
  const extras = cards ? '' : `<details class="product-pictures"><summary>View all photographs</summary>${gallery(p, 0)}</details>`;
  return cards ? `<article class="product-card" id="${p.id}">${images}<div class="product-info"><h3 class="product-name">${escape(p.name)}</h3>${content}${order}</div></article>` : `<section class="faery-section" id="${p.id}"><h2>${escape(p.name)}</h2><div class="faery-content">${images}<div class="faery-text">${content}${order}</div></div>${extras}</section>`;
}
export async function build() {
  const products = JSON.parse(await readFile(path.join(root, 'data/products.json'), 'utf8'));
  validateProducts(products);
  const folders = await scanImages(path.join(root, 'images'));
  const manifest = {};
  for (const p of products.filter(p => p.active)) manifest[`${p.category}/${p.id}`] = { name:p.name, href:`${p.page}#${p.id}`, images:folders[`${p.category}/${p.id}`] || [] };
  for (const category of categories) manifest[`${category}/collection`] = {name:category.replaceAll('-', ' '),href:`${category}.html`,images:folders[`${category}/collection`] || []};
  await writeFile(path.join(root, 'data/images.json'), JSON.stringify(manifest, null, 2)+'\n');
  for (const category of categories) {
    const file = path.join(root, `${category}.html`);
    const source = await readFile(file, 'utf8');
    const items = products.filter(p => p.active && p.category === category);
    const cards = ['wish-witches', 'kitchen-witches'].includes(category);
    const nav = cards || category === 'more' ? '' : `<nav class="catalogue-nav" aria-label="Browse this collection">${items.map(p => `<a href="#${p.id}">${escape(p.name)}</a>`).join('\n')}</nav>`;
    const markup = nav + (cards ? '<div class="product-grid">' : '') + items.map(p => productMarkup(p,cards)).join('\n') + (cards ? '</div>' : '');
    const pattern = new RegExp(`(<!-- catalogue:${category}:start -->)[\\s\\S]*?(<!-- catalogue:${category}:end -->)`);
    if (!pattern.test(source)) throw new Error(`Missing catalogue markers in ${file}`);
    await writeFile(file, source.replace(pattern, (_, start, end) => `${start}\n${markup}\n${end}`));
  }
  console.log(`Built ${products.filter(p=>p.active).length} products and ${Object.keys(manifest).length} image folders.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
