// Reuse a folder anywhere: data-gallery="faeries/autumn-fae" data-count="0".
// 0 means all; positive integers select the first N naturally sorted filenames.
function setupGalleryPreviews(root) {
  root.querySelectorAll('.compact-catalogue .product-pictures').forEach(details => {
    const summary = details.querySelector('summary');
    const photos = details.querySelectorAll('[data-gallery] img');
    if (!summary) return;
    const previews = document.createElement('span');
    previews.className = 'gallery-preview';
    previews.setAttribute('aria-hidden', 'true');
    photos.forEach(photo => {
      const thumbnail = document.createElement('img');
      thumbnail.src = photo.getAttribute('src');
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      previews.append(thumbnail);
    });
    const label = document.createElement('span');
    label.className = 'gallery-preview-label';
    label.textContent = 'view all';
    const collapseLabel = document.createElement('span');
    collapseLabel.className = 'gallery-collapse-label';
    collapseLabel.textContent = 'view less';
    summary.replaceChildren(previews, label, collapseLabel);
  });
}

async function setupGalleries(root = document, suppliedFolders = null) {
  const containers = root.querySelectorAll('[data-gallery]:not([data-gallery-rendered])');
  document.querySelectorAll('.product-pictures').forEach(details => {
    const gallery = details.querySelector('[data-gallery-rendered]');
    if (gallery) details.hidden = gallery.querySelectorAll('img').length < 2;
  });
  setupGalleryPreviews(root);
  if (!containers.length) return;
  try {
    let folders = suppliedFolders;
    if (!folders) {
      const response = await fetch('data/images.json');
      if (!response.ok) throw new Error('Could not load photographs');
      folders = await response.json();
    }
    containers.forEach(container => {
      const folder = folders[container.dataset.gallery];
      const count = Number(container.dataset.count ?? 0);
      if (!Number.isInteger(count) || count < 0) return;
      const images = folder?.images || [];
      const disclosure = container.closest('.product-pictures');
      if (disclosure) disclosure.hidden = images.length < 2;
      container.replaceChildren();
      if (!images.length) {
        const message = document.createElement('p');
        message.className = 'gallery-status';
        message.textContent = 'Photographs coming soon';
        container.append(message);
        return;
      }
      (count === 0 ? images : images.slice(0, count)).forEach((src, index) => {
        const link = document.createElement('a');
        link.href = folder.href;
        const img = document.createElement('img');
        img.src = src;
        img.alt = `${folder.name} — photograph ${index + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => {
          link.textContent = `View ${folder.name}`;
          link.className = 'gallery-status';
        }, { once: true });
        link.append(img);
        container.append(link);
      });
    });
    setupGalleryPreviews(root);
  } catch (error) {
    console.error(error);
    containers.forEach(container => {
      if (!container.textContent.trim()) container.textContent = 'Photographs are temporarily unavailable.';
    });
  }
}
document.addEventListener('DOMContentLoaded', () => setupGalleries());
