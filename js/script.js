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

}
document.addEventListener('DOMContentLoaded', setupOrderTabs);

function setupCompactHomeHeader() {
  const header = document.querySelector('.home-header');
  if (!header) return;
  // Separate thresholds keep the header from flickering as its height changes.
  const syncHeader = () => {
    if (window.scrollY > 160) header.classList.add('is-compact');
    else if (window.scrollY < 10) header.classList.remove('is-compact');
  };
  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('pageshow', syncHeader);
  syncHeader();
}
document.addEventListener('DOMContentLoaded', setupCompactHomeHeader);
