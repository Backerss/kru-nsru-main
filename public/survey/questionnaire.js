// Questionnaire Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize animations
  initAnimations();
  
  // Handle survey card interactions
  handleSurveyCards();
  
  // Check if surveys exist
  checkSurveysAvailability();

  // Handle logout buttons
  initLogoutHandlers();
});

function initAnimations() {
  // Fade in page header
  const pageHeader = document.querySelector('.page-header');
  if (pageHeader) {
    pageHeader.style.opacity = '0';
    pageHeader.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      pageHeader.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      pageHeader.style.opacity = '1';
      pageHeader.style.transform = 'translateY(0)';
    }, 100);
  }

  // Animate survey cards
  const surveyCards = document.querySelectorAll('.survey-card');
  surveyCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 200 + (index * 100));
  });
}

function handleSurveyCards() {
  const surveyCards = document.querySelectorAll('.survey-card');
  
  surveyCards.forEach(card => {
    // Add hover effect enhancement
    card.addEventListener('mouseenter', function() {
      const icon = this.querySelector('.survey-icon');
      if (icon) {
        icon.style.transform = 'scale(1.05)';
        icon.style.transition = 'transform 0.2s ease';
      }
    });
    
    card.addEventListener('mouseleave', function() {
      const icon = this.querySelector('.survey-icon');
      if (icon) {
        icon.style.transform = 'scale(1)';
      }
    });

    // Handle button clicks
    const startBtn = card.querySelector('.btn-primary');
    if (startBtn) {
      startBtn.addEventListener('click', function(e) {
        const surveyId = card.getAttribute('data-survey-id');
        console.log('Starting survey:', surveyId);
        // The link will handle navigation
      });
    }
  });
}

function checkSurveysAvailability() {
  const surveyCards = document.querySelectorAll('.survey-card');
  const emptyState = document.getElementById('emptyState');
  
  // Show empty state if no surveys available
  if (surveyCards.length === 0 && emptyState) {
    emptyState.classList.remove('d-none');
  }
}

function initLogoutHandlers() {
  const logoutButtons = document.querySelectorAll('[data-logout], .btn-logout, a[href="/logout"]');
  logoutButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogout();
    });
  });
}

function handleLogout() {
  Swal.fire({
    title: 'ออกจากระบบ?',
    text: 'คุณต้องการออกจากระบบใช่หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ออกจากระบบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6'
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = '/logout';
    }
  });
}

// Add ripple effect to buttons
document.querySelectorAll('.btn').forEach(button => {
  button.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    this.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});

// Add ripple animation styles dynamically
const style = document.createElement('style');
style.textContent = `
  .btn {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
