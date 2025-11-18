// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize components
  initPasswordToggles();
  handlePersonalInfoEdit();
  handlePasswordChange();
  initAnimations();
});

// Initialize password visibility toggles
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = this.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      }
    });
  });
}

// Handle personal information edit
function handlePersonalInfoEdit() {
  const editBtn = document.getElementById('editPersonalBtn');
  const cancelBtn = document.getElementById('cancelPersonalBtn');
  const form = document.getElementById('personalInfoForm');
  const actions = document.getElementById('personalActions');
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  
  let originalFirstName = firstName.value;
  let originalLastName = lastName.value;
  
  // Enable editing
  editBtn.addEventListener('click', function() {
    firstName.disabled = false;
    lastName.disabled = false;
    actions.classList.remove('d-none');
    editBtn.style.display = 'none';
    
    firstName.focus();
  });
  
  // Cancel editing
  cancelBtn.addEventListener('click', function() {
    firstName.value = originalFirstName;
    lastName.value = originalLastName;
    firstName.disabled = true;
    lastName.disabled = true;
    actions.classList.add('d-none');
    editBtn.style.display = 'block';
  });
  
  // Submit form
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newFirstName = firstName.value.trim();
    const newLastName = lastName.value.trim();
    
    if (!newFirstName || !newLastName) {
      showAlert('กรุณากรอกชื่อและนามสกุล', 'danger');
      return;
    }
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...';
    
    // Simulate API call
    setTimeout(() => {
      originalFirstName = newFirstName;
      originalLastName = newLastName;
      
      firstName.disabled = true;
      lastName.disabled = true;
      actions.classList.add('d-none');
      editBtn.style.display = 'block';
      
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      
      showAlert('บันทึกข้อมูลสำเร็จ', 'success');
      
      // Log to console (in production, send to backend)
      console.log('Personal info updated:', { firstName: newFirstName, lastName: newLastName });
    }, 1000);
  });
}

// Handle password change
function handlePasswordChange() {
  const form = document.getElementById('changePasswordForm');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const currentPwd = currentPassword.value;
    const newPwd = newPassword.value;
    const confirmPwd = confirmNewPassword.value;
    
    // Validation
    if (!currentPwd || !newPwd || !confirmPwd) {
      showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'danger');
      return;
    }
    
    if (newPwd.length < 6) {
      showAlert('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'danger');
      return;
    }
    
    if (newPwd !== confirmPwd) {
      showAlert('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'danger');
      return;
    }
    
    if (currentPwd === newPwd) {
      showAlert('รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านเดิม', 'danger');
      return;
    }
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังเปลี่ยนรหัสผ่าน...';
    
    // Simulate API call
    setTimeout(() => {
      // In production, verify current password with backend
      const isCurrentPasswordCorrect = true; // Mock
      
      if (!isCurrentPasswordCorrect) {
        showAlert('รหัสผ่านปัจจุบันไม่ถูกต้อง', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
      }
      
      // Success
      form.reset();
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      
      showAlert('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
      
      // Log to console (in production, send to backend)
      console.log('Password changed successfully');
    }, 1500);
  });
}

// Show alert message
function showAlert(message, type) {
  const container = document.getElementById('alertContainer');
  
  const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="bi bi-${icon}"></i>
    <span>${message}</span>
  `;
  
  container.innerHTML = '';
  container.appendChild(alert);
  
  // Scroll to alert
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    alert.style.transition = 'opacity 0.3s';
    alert.style.opacity = '0';
    setTimeout(() => {
      alert.remove();
    }, 300);
  }, 5000);
}

// Initialize animations
function initAnimations() {
  const cards = document.querySelectorAll('.settings-card, .contact-admin-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 + (index * 100));
  });
}

// Add form validation visual feedback
document.querySelectorAll('input[required]').forEach(input => {
  input.addEventListener('blur', function() {
    if (!this.disabled && this.value.trim() === '') {
      this.classList.add('is-invalid');
    } else {
      this.classList.remove('is-invalid');
    }
  });
  
  input.addEventListener('input', function() {
    this.classList.remove('is-invalid');
  });
});
