// Invitation and password-recovery emails can land on the home page.
if (/(?:^#|&)(?:invite_token|recovery_token)=/.test(location.hash)) {
  location.replace('/admin/' + location.hash);
}
function setupOrderTabs() {
  const buttons = [...document.querySelectorAll('.order-tab-button')];
  if (!buttons.length) return;
  const sections = [...document.querySelectorAll('.order-section')];
  document.querySelector('.order-tabs').setAttribute('role', 'tablist');
  document.querySelector('.order-tabs').setAttribute('aria-label', 'Product category');
  function activate(id) {
    const selected = buttons.find(button => button.dataset.tab === id) || buttons[0];
    buttons.forEach(button => {
      const active = button === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    sections.forEach(section => {
      const active = section.id === selected.dataset.tab;
      section.classList.toggle('active', active);
      section.hidden = !active;
    });
  }
  buttons.forEach((button, index) => {
    button.id = `tab-${button.dataset.tab}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', button.dataset.tab);
    const section = document.getElementById(button.dataset.tab);
    section.setAttribute('role', 'tabpanel');
    section.setAttribute('aria-labelledby', button.id);
    button.addEventListener('click', () => {
      history.pushState(null, '', `#${button.dataset.tab}`);
      activate(button.dataset.tab);
    });
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next !== undefined) { event.preventDefault(); buttons[next].focus(); buttons[next].click(); }
    });
  });
  const sync = () => activate(location.hash.slice(1));
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  sync();
  const productId = new URLSearchParams(location.search).get('product');
  if (productId) {
    const embedded = document.getElementById('selected-product');
    const products = embedded ? Promise.resolve([JSON.parse(embedded.textContent)]) : fetch('data/products.json').then(response => {
      if (!response.ok) throw new Error('Could not load product');
      return response.json();
    });
    products.then(products => {
      const product = products.find(p => p.active && p.id === productId);
      if (!product) return;
      const field = document.querySelector(`#${product.orderTab} textarea[name="description"]`);
      if (field && !field.value) field.value = `I would like to order: ${product.name}.`;
    }).catch(console.error);
  }
}
document.addEventListener('DOMContentLoaded', setupOrderTabs);
