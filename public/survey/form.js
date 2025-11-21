// Survey Form JavaScript

document.addEventListener('DOMContentLoaded', function() {
  initForm();
  initProgressTracking();
  handleFormSubmit();
});

// Initialize form
function initForm() {
  // Add animations to question cards
  const questionCards = document.querySelectorAll('.question-card');
  questionCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 + (index * 50));
  });

  // Track answer changes
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('change', function() {
      updateProgress();
      markQuestionAsAnswered(this);
    });
  });
}

// Initialize progress tracking
function initProgressTracking() {
  updateProgress();
}

// Update progress bar and counter
function updateProgress() {
  const questions = document.querySelectorAll('.question-card');
  const totalQuestions = questions.length;
  let answeredQuestions = 0;

  questions.forEach(card => {
    const questionNum = card.getAttribute('data-question');
    const inputs = card.querySelectorAll('input[type="radio"], textarea');
    
    let isAnswered = false;
    inputs.forEach(input => {
      if (input.type === 'radio' && input.checked) {
        isAnswered = true;
      } else if (input.type === 'textarea' && input.value.trim() !== '') {
        isAnswered = true;
      }
    });

    if (isAnswered) {
      answeredQuestions++;
    }
  });

  // Update progress bar
  const percentage = (answeredQuestions / totalQuestions) * 100;
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }

  // Update progress text
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = `${answeredQuestions}/${totalQuestions}`;
  }
}

// Mark question as answered
function markQuestionAsAnswered(input) {
  const questionCard = input.closest('.question-card');
  if (questionCard) {
    const questionNum = questionCard.getAttribute('data-question');
    const allInputs = questionCard.querySelectorAll('input[type="radio"], textarea');
    
    let isAnswered = false;
    allInputs.forEach(inp => {
      if (inp.type === 'radio' && inp.checked) {
        isAnswered = true;
      } else if (inp.type === 'textarea' && inp.value.trim() !== '') {
        isAnswered = true;
      }
    });

    if (isAnswered) {
      questionCard.classList.add('answered');
    } else {
      questionCard.classList.remove('answered');
    }
  }
}

// Handle form submission
function handleFormSubmit() {
  const form = document.getElementById('surveyForm');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validate all required fields
    if (!validateForm()) {
      return;
    }

    // Get survey ID from URL
    const urlParts = window.location.pathname.split('/');
    const surveyId = urlParts[urlParts.length - 1];

    // Get form data
    const formData = new FormData(form);
    const answers = {};
    
    // Transform form data into proper format
    for (let [key, value] of formData.entries()) {
      // Convert q1, q2, etc. to question_1, question_2
      const questionKey = key.replace('q', 'question_');
      
      // Try to convert numeric values
      if (!isNaN(value) && value !== '') {
        answers[questionKey] = parseInt(value);
      } else {
        answers[questionKey] = value;
      }
    }

    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังส่ง...';

    try {
      // Send to backend
      const response = await fetch(`/survey/submit/${surveyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(answers)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Show success modal
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();

        // Clear form to prevent accidental resubmission
        form.reset();

        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = '/survey/questionnaire';
        }, 3000);
      } else {
        throw new Error(result.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      
      // Show error alert
      showAlert(error.message || 'เกิดข้อผิดพลาดในการส่งแบบสอบถาม กรุณาลองใหม่อีกครั้ง', 'danger');
    }
  });
}

// Validate form
function validateForm() {
  const questions = document.querySelectorAll('.question-card');
  let isValid = true;
  let firstInvalidQuestion = null;

  questions.forEach(card => {
    const requiredInputs = card.querySelectorAll('input[required], textarea[required]');
    let questionAnswered = false;

    requiredInputs.forEach(input => {
      if (input.type === 'radio') {
        const radioGroup = card.querySelectorAll(`input[name="${input.name}"]`);
        radioGroup.forEach(radio => {
          if (radio.checked) {
            questionAnswered = true;
          }
        });
      } else if (input.type === 'textarea') {
        if (input.value.trim().length >= 10) {
          questionAnswered = true;
        }
      }
    });

    if (!questionAnswered && requiredInputs.length > 0) {
      isValid = false;
      card.style.border = '2px solid #ef4444';
      
      if (!firstInvalidQuestion) {
        firstInvalidQuestion = card;
      }

      setTimeout(() => {
        card.style.border = '';
      }, 3000);
    }
  });

  if (!isValid && firstInvalidQuestion) {
    // Scroll to first invalid question
    firstInvalidQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Show error message
    showAlert('กรุณาตอบคำถามให้ครบถ้วน', 'danger');
  }

  return isValid;
}

// Show alert message
function showAlert(message, type) {
  // Create alert
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.right = '20px';
  alert.style.zIndex = '9999';
  alert.style.maxWidth = '400px';
  alert.innerHTML = `
    <i class="bi bi-exclamation-triangle-fill me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alert);

  // Auto dismiss after 5 seconds
  setTimeout(() => {
    alert.style.transition = 'opacity 0.3s';
    alert.style.opacity = '0';
    setTimeout(() => {
      alert.remove();
    }, 300);
  }, 5000);
}

// Add smooth scroll behavior for long forms
const navbar = document.querySelector('.navbar');
if (navbar) {
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
      navbar.style.transform = 'translateY(-100%)';
    } else {
      navbar.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
  });
}

// Warn before leaving if form is partially filled
window.addEventListener('beforeunload', function(e) {
  const answeredCount = document.querySelectorAll('.question-card.answered').length;
  
  if (answeredCount > 0) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// Handle back button
const backLinks = document.querySelectorAll('a[href="/survey/questionnaire"]');
backLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    const answeredCount = document.querySelectorAll('.question-card.answered').length;
    
    if (answeredCount > 0) {
      const confirm = window.confirm('คุณมีคำตอบที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?');
      if (!confirm) {
        e.preventDefault();
      }
    }
  });
});
