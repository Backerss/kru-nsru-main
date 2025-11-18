// Survey Home Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Add smooth transitions
  initSmoothTransitions();
  
  // Handle responsive navbar
  handleNavbar();
  
  // Add active state to current page
  setActiveNavLink();
});

function initSmoothTransitions() {
  // Add fade-in animation to cards
  const cards = document.querySelectorAll('.card, .welcome-card, .quick-action-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

function handleNavbar() {
  // Add click ripple effect to mobile nav items
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  mobileNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      // Remove active from all
      mobileNavItems.forEach(i => i.classList.remove('active'));
      // Add active to clicked
      this.classList.add('active');
    });
  });
}

function setActiveNavLink() {
  const currentPath = window.location.pathname;
  
  // Desktop navbar
  const desktopNavLinks = document.querySelectorAll('.desktop-navbar .nav-link');
  desktopNavLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
  
  // Mobile bottom nav
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  mobileNavItems.forEach(item => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (href === currentPath) {
      item.classList.add('active');
    }
  });
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    // Nothing specific needed for resize
  }, 250);
});
