// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize components
  initPasswordToggles();
  handlePersonalInfoEdit();
  handlePasswordChange();
  initAnimations();
  initLogoutHandlers();
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
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        text: 'กรุณากรอกชื่อและนามสกุล',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // Show loading
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Simulate API call
    setTimeout(() => {
      originalFirstName = newFirstName;
      originalLastName = newLastName;
      
      firstName.disabled = true;
      lastName.disabled = true;
      actions.classList.add('d-none');
      editBtn.style.display = 'block';
      
      Swal.fire({
        icon: 'success',
        title: 'บันทึกข้อมูลสำเร็จ',
        timer: 2000,
        showConfirmButton: false
      });
      
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
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (newPwd.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'รหัสผ่านไม่ถูกต้อง',
        text: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (newPwd !== confirmPwd) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ตรงกัน',
        text: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (currentPwd === newPwd) {
      Swal.fire({
        icon: 'warning',
        title: 'รหัสผ่านเหมือนเดิม',
        text: 'รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านเดิม',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // Show loading
    Swal.fire({
      title: 'กำลังเปลี่ยนรหัสผ่าน...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Simulate API call
    setTimeout(() => {
      // In production, verify current password with backend
      const isCurrentPasswordCorrect = true; // Mock
      
      if (!isCurrentPasswordCorrect) {
        Swal.fire({
          icon: 'error',
          title: 'รหัสผ่านไม่ถูกต้อง',
          text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
          confirmButtonText: 'ตกลง'
        });
        return;
      }
      
      // Success
      form.reset();
      
      Swal.fire({
        icon: 'success',
        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
        text: 'รหัสผ่านของคุณได้รับการเปลี่ยนแปลงเรียบร้อยแล้ว',
        confirmButtonText: 'ตกลง'
      });
      
      // Log to console (in production, send to backend)
      console.log('Password changed successfully');
    }, 1500);
  });
}

// Initialize logout handlers
function initLogoutHandlers() {
  const logoutButtons = document.querySelectorAll('[data-logout], .btn-logout, a[href="/logout"]');
  logoutButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogout();
    });
  });
}

// Handle logout
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
