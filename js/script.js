// Order page tab functionality
function setupOrderTabs() {
  const tabButtons = document.querySelectorAll('.order-tab-button');
  const orderSections = document.querySelectorAll('.order-section');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');

      // Remove active class from all buttons and sections
      tabButtons.forEach(btn => btn.classList.remove('active'));
      orderSections.forEach(section => section.classList.remove('active'));

      // Add active class to clicked button and corresponding section
      button.classList.add('active');
      const activeSection = document.getElementById(tabId);
      if (activeSection) {
        activeSection.classList.add('active');
      }
    });
  });

  // Set first tab as active by default
  if (tabButtons.length > 0) {
    tabButtons[0].click();
  }
}

// Smooth scroll for anchor links
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Form submission handling
function setupFormHandlers() {
  const forms = document.querySelectorAll('.order-form');
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      // Validate required fields
      if (!data.name || !data.email) {
        alert('Please fill in all required fields');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        alert('Please enter a valid email address');
        return;
      }
      
      // Log form data (in production, send to server)
      console.log('Order submitted:', data);
      alert('Thank you for your order! We will contact you soon.');
      form.reset();
    });
  });
}

// Initialize faeries navigation (for faeries.html)
function setupFaeriesNavigation() {
  const iconItems = document.querySelectorAll('.faeries-icon-item');
  
  iconItems.forEach(item => {
    item.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight the clicked icon
        iconItems.forEach(icon => icon.style.opacity = '0.6');
        this.style.opacity = '1';
      }
    });
  });
}

// Initialize fictional characters navigation
function setupFictionalCharactersNavigation() {
  const iconItems = document.querySelectorAll('.characters-icon-item');
  
  iconItems.forEach(item => {
    item.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        iconItems.forEach(icon => icon.style.opacity = '0.6');
        this.style.opacity = '1';
      }
    });
  });
}

// Navigation highlight on scroll
function setupNavigationHighlight() {
  const navLinks = document.querySelectorAll('.nav-links a');
  
  window.addEventListener('scroll', () => {
    let current = '';
    
    document.querySelectorAll('section').forEach(section => {
      const sectionTop = section.offsetTop;
      if (pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').slice(1) === current) {
        link.classList.add('active');
      }
    });
  });
}

// More images show/hide functionality
function setupMoreImagesToggle() {
  const moreImagesContainers = document.querySelectorAll('.more-images-container');
  
  moreImagesContainers.forEach(container => {
    const showButton = container.querySelector('.button-more-images.show');
    const hideButtons = container.querySelectorAll('.button-more-images.hide');
    const moreImagesDiv = container.querySelector('.more-images');
    
    // Show images button click
    if (showButton) {
      showButton.addEventListener('click', function() {
        moreImagesDiv.classList.add('visible');
        showButton.classList.add('hidden');
        hideButtons.forEach(btn => btn.classList.add('visible'));
      });
    }
    
    // Hide images buttons click
    hideButtons.forEach(hideButton => {
      hideButton.addEventListener('click', function() {
        moreImagesDiv.classList.remove('visible');
        if (showButton) {
          showButton.classList.remove('hidden');
        }
        hideButtons.forEach(btn => btn.classList.remove('visible'));
      });
    });
  });
}

// Initialize all functionality on page load
document.addEventListener('DOMContentLoaded', () => {
  setupOrderTabs();
  setupSmoothScroll();
  setupFormHandlers();
  setupFaeriesNavigation();
  setupFictionalCharactersNavigation();
  setupNavigationHighlight();
  setupMoreImagesToggle();
});

// Utility function to create image placeholder
function getImagePlaceholder(category = 'image') {
  const placeholders = {
    faery: '🧚',
    witch: '🧙‍♀️',
    character: '✨',
    image: '🖼️'
  };
  
  return placeholders[category] || placeholders.image;
}
