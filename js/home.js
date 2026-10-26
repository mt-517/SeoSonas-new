// Keep generated HTML for SEO, no-JavaScript browsing and network failures.
// Published updates use one catalogue snapshot for both cards and photographs.
function setupHomeCatalogue() {
  const grid = document.querySelector('.home-grid');
  if (!grid || location.pathname === '/api/preview' || document.querySelector('.preview-banner')) return;
  let revision = document.querySelector('meta[name="catalogue-revision"]')?.content;
  let refreshing = false;

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const response = await fetch('/api/catalogue', { cache: 'no-store' });
      if (!response.ok) throw new Error('Catalogue unavailable');
      const catalogue = await response.json();
      if (!Array.isArray(catalogue.products)) throw new Error('Invalid catalogue');
      if (catalogue.revision && catalogue.revision === revision) return;
      const fragment = document.createDocumentFragment();
      const folders = {};
      for (const product of catalogue.products.filter(product => product.active)) {
        const key = `${product.category}/${product.id}`;
        const href = `${product.page}#${product.id}`;
        folders[key] = { name: product.name, href, images: product.images || [] };
        const card = document.createElement('article');
        card.className = 'home-card';
        const photo = document.createElement('div');
        photo.className = 'home-card-photo';
        photo.dataset.gallery = key;
        photo.dataset.count = '1';
        const label = document.createElement('a');
        label.className = 'home-card-label';
        label.href = href;
        label.textContent = product.name;
        card.append(photo, label);
        fragment.append(card);
      }
      await setupGalleries(fragment, folders);
      grid.replaceChildren(fragment);
      revision = catalogue.revision;
    } catch (error) {
      // A static local server has no API; retain its generated catalogue too.
      console.warn('Keeping the existing homepage catalogue.', error);
    } finally {
      refreshing = false;
    }
  }

  refresh();
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
}
document.addEventListener('DOMContentLoaded', setupHomeCatalogue);
