// Reuse a folder anywhere: data-gallery="faeries/autumn-fae" data-count="0".
// 0 means all; positive integers select the first N naturally sorted filenames.
async function setupGalleries(root = document, suppliedFolders = null) {
  const containers = root.querySelectorAll('[data-gallery]:not([data-gallery-rendered])');
  document.querySelectorAll('.product-pictures').forEach(details => {
    const gallery = details.querySelector('[data-gallery-rendered]');
    if (gallery) details.hidden = gallery.querySelectorAll('img').length < 2;
  });
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
  } catch (error) {
    console.error(error);
    containers.forEach(container => {
      if (!container.textContent.trim()) container.textContent = 'Photographs are temporarily unavailable.';
    });
  }
}
document.addEventListener('DOMContentLoaded', () => setupGalleries());
