// Load and inject header and footer from snippets/header-footer.html
document.addEventListener('DOMContentLoaded', function() {
  fetch('./snippets/header-footer.html')
    .then(response => response.text())
    .then(html => {
      // Parse the fetched HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract header and footer elements
      const header = doc.querySelector('header');
      const footer = doc.querySelector('footer');
      
      if (header) {
        // Clone the header to avoid moving the original
        const headerClone = header.cloneNode(true);
        // Insert header at the beginning of body
        document.body.insertBefore(headerClone, document.body.firstChild);
      }
      
      if (footer) {
        // Clone the footer to avoid moving the original
        const footerClone = footer.cloneNode(true);
        // Append footer at the end of body
        document.body.appendChild(footerClone);
      }
    })
    .catch(error => console.error('Error loading header/footer:', error));
});
