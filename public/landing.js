// Landing Page Interactive JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize AOS (Animate On Scroll)
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    offset: 100
  });

  // Navbar scroll effect
  initNavbarScroll();
  
  // Smooth scrolling for anchor links
  initSmoothScroll();
  
  // Counter animation
  initCounterAnimation();
  
  // Parallax effect
  initParallaxEffect();
  
  // Mobile menu close on link click
  initMobileMenuClose();
});

// Navbar scroll effect
function initNavbarScroll() {
  const navbar = document.getElementById('mainNav');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// Smooth scrolling
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      
      if (target) {
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Counter animation
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-number');
  const speed = 200; // Animation speed
  
  const animateCounter = (counter) => {
    const target = parseInt(counter.getAttribute('data-count'));
    const increment = target / speed;
    let current = 0;
    
    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.textContent = Math.ceil(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target;
      }
    };
    
    updateCounter();
  };
  
  // Intersection Observer for counter animation
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        if (counter.textContent === '0') {
          animateCounter(counter);
        }
        counterObserver.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => {
    counterObserver.observe(counter);
  });
}

// Parallax effect for hero section
function initParallaxEffect() {
  const heroSection = document.querySelector('.hero-section');
  
  if (!heroSection) return;
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxSpeed = 0.5;
    
    // Parallax for hero content
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && scrolled < window.innerHeight) {
      heroContent.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
      heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.8;
    }
    
    // Parallax for visual elements
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual && scrolled < window.innerHeight) {
      heroVisual.style.transform = `translateY(${scrolled * parallaxSpeed * 0.8}px)`;
    }
  });
}

// Close mobile menu when link is clicked
function initMobileMenuClose() {
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.querySelector('.navbar-collapse');
  
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
          toggle: false
        });
        bsCollapse.hide();
      }
    });
  });
}

// Add hover effect to feature cards
document.addEventListener('DOMContentLoaded', () => {
  const featureCards = document.querySelectorAll('.feature-card, .survey-card');
  
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
});

// Animate visual circles on scroll
function animateVisualCircles() {
  const circles = document.querySelectorAll('.visual-circle');
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    
    circles.forEach((circle, index) => {
      const speed = (index + 1) * 0.1;
      circle.style.transform = `rotate(${scrolled * speed}deg)`;
    });
  });
}

animateVisualCircles();

// Add loading animation
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  
  // Trigger animations after page load
  setTimeout(() => {
    const heroElements = document.querySelectorAll('.hero-content > *');
    heroElements.forEach((el, index) => {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }, 100);
});

// Handle CTA button clicks with animation
document.addEventListener('DOMContentLoaded', () => {
  const ctaButtons = document.querySelectorAll('.btn-hero, .cta-card .btn');
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Create ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      this.appendChild(ripple);
      
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
});

// Add scroll progress indicator
function addScrollProgress() {
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 4px;
    background: linear-gradient(90deg, #2C08C9, #4318FF);
    z-index: 9999;
    transition: width 0.1s ease;
  `;
  document.body.appendChild(progressBar);
  
  window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (window.pageYOffset / windowHeight) * 100;
    progressBar.style.width = scrolled + '%';
  });
}

addScrollProgress();

// Intersection Observer for fade-in animations
const observeElements = () => {
  const elements = document.querySelectorAll('.feature-card, .survey-card, .contact-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
  });
};

observeElements();

// Add dynamic gradient to hero background
function addDynamicGradient() {
  const heroBg = document.querySelector('.hero-bg-animation');
  if (!heroBg) return;
  
  let mouseX = 0;
  let mouseY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
    
    heroBg.style.background = `
      radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
      radial-gradient(circle at ${(1 - mouseX) * 100}% ${(1 - mouseY) * 100}%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
    `;
  });
}

addDynamicGradient();

// Animate floating cards
function animateFloatingCards() {
  const cards = document.querySelectorAll('.floating-card');
  
  cards.forEach((card, index) => {
    let direction = 1;
    let position = 0;
    
    setInterval(() => {
      position += direction * 0.5;
      
      if (position > 15 || position < -15) {
        direction *= -1;
      }
      
      card.style.transform = `translateY(${position}px) rotate(${position * 0.2}deg)`;
    }, 50 + index * 10);
  });
}

animateFloatingCards();

// Easter egg: Konami code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
  konamiCode.push(e.key);
  konamiCode = konamiCode.slice(-10);
  
  if (konamiCode.join(',') === konamiSequence.join(',')) {
    activateEasterEgg();
  }
});

function activateEasterEgg() {
  // Add confetti or special animation
  const colors = ['#2C08C9', '#4318FF', '#FFD700', '#FFA500'];
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      createConfetti(colors[Math.floor(Math.random() * colors.length)]);
    }, i * 30);
  }
  
  // Show special message
  setTimeout(() => {
    const message = document.createElement('div');
    message.textContent = '🎉 คุณพบ Easter Egg แล้ว! 🎉';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #2C08C9, #4318FF);
      color: white;
      padding: 2rem 3rem;
      border-radius: 20px;
      font-size: 1.5rem;
      font-weight: 700;
      z-index: 10000;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: bounceIn 0.6s ease;
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.style.animation = 'bounceOut 0.6s ease';
      setTimeout(() => message.remove(), 600);
    }, 3000);
  }, 1500);
}

function createConfetti(color) {
  const confetti = document.createElement('div');
  confetti.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    background: ${color};
    top: -10px;
    left: ${Math.random() * 100}%;
    opacity: 1;
    z-index: 9999;
    animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
  `;
  document.body.appendChild(confetti);
  
  setTimeout(() => confetti.remove(), 4000);
}

// Add CSS animations for confetti
const style = document.createElement('style');
style.textContent = `
  @keyframes confettiFall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
  
  @keyframes bounceIn {
    0% {
      transform: translate(-50%, -50%) scale(0);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
    }
  }
  
  @keyframes bounceOut {
    0% {
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      transform: translate(-50%, -50%) scale(0);
    }
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: rippleEffect 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes rippleEffect {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log('🎓 Landing Page Loaded Successfully!');
console.log('💡 Try the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A');
