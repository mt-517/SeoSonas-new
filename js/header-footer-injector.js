// Shared navigation is rendered at build time so it works without JavaScript.
document.addEventListener('DOMContentLoaded', () => {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('header a, .main-nav a').forEach(link => {
    if (link.getAttribute('href') === current || link.getAttribute('href') === current + '.html') {
      link.setAttribute('aria-current', 'page');
    }
  });
});
