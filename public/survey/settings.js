// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize components
  initPasswordToggles();
  handlePersonalInfoEdit();
  handlePasswordChange();
  handleGoogleDisconnect();
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
  const faculty = document.getElementById('faculty');
  const major = document.getElementById('major');
  const year = document.getElementById('year');
  
  let originalFirstName = firstName.value;
  let originalLastName = lastName.value;
  let originalFaculty = faculty.value;
  let originalMajor = major.value;
  let originalYear = year.value;
  
  // Check if any academic field can be edited
  const canEditFaculty = !faculty.hasAttribute('readonly');
  const canEditMajor = !major.hasAttribute('readonly');
  const canEditYear = !year.hasAttribute('disabled') || year.value === 'ยังไม่ระบุ';
  
  // Enable editing
  editBtn.addEventListener('click', function() {
    firstName.disabled = false;
    lastName.disabled = false;
    
    // Enable academic fields only if they can be edited
    if (canEditFaculty && faculty.value === 'ยังไม่ระบุ') {
      faculty.disabled = false;
    }
    if (canEditMajor && major.value === 'ยังไม่ระบุ') {
      major.disabled = false;
    }
    if (canEditYear && year.value === 'ยังไม่ระบุ') {
      year.disabled = false;
    }
    
    actions.classList.remove('d-none');
    editBtn.style.display = 'none';
    
    firstName.focus();
  });
  
  // Cancel editing
  cancelBtn.addEventListener('click', function() {
    firstName.value = originalFirstName;
    lastName.value = originalLastName;
    faculty.value = originalFaculty;
    major.value = originalMajor;
    year.value = originalYear;
    
    firstName.disabled = true;
    lastName.disabled = true;
    faculty.disabled = true;
    major.disabled = true;
    year.disabled = true;
    
    actions.classList.add('d-none');
    editBtn.style.display = 'block';
  });
  
  // Submit form
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newFirstName = firstName.value.trim();
    const newLastName = lastName.value.trim();
    const newFaculty = faculty.value.trim();
    const newMajor = major.value.trim();
    const newYear = year.value;
    
    if (!newFirstName || !newLastName) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        text: 'กรุณากรอกชื่อและนามสกุล',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    // Validate academic fields if they are being edited
    if (faculty.disabled === false && (!newFaculty || newFaculty === 'ยังไม่ระบุ')) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุคณะ',
        text: 'คุณสามารถแก้ไขคณะได้เพียงครั้งเดียว',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (major.disabled === false && (!newMajor || newMajor === 'ยังไม่ระบุ')) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุสาขาวิชา',
        text: 'คุณสามารถแก้ไขสาขาวิชาได้เพียงครั้งเดียว',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    
    if (year.disabled === false && newYear === 'ยังไม่ระบุ') {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุชั้นปี',
        text: 'คุณสามารถแก้ไขชั้นปีได้เพียงครั้งเดียว',
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
    
    try {
      // Prepare data to send
      const updateData = {
        firstName: newFirstName,
        lastName: newLastName
      };
      
      // Add academic fields if they were edited
      if (faculty.disabled === false && newFaculty !== 'ยังไม่ระบุ') {
        updateData.faculty = newFaculty;
      }
      if (major.disabled === false && newMajor !== 'ยังไม่ระบุ') {
        updateData.major = newMajor;
      }
      if (year.disabled === false && newYear !== 'ยังไม่ระบุ') {
        updateData.year = newYear;
      }
      
      const response = await fetch('/survey/update-personal-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        originalFirstName = newFirstName;
        originalLastName = newLastName;
        
        // Update original values for academic fields
        if (updateData.faculty) {
          originalFaculty = newFaculty;
          faculty.setAttribute('readonly', 'readonly');
        }
        if (updateData.major) {
          originalMajor = newMajor;
          major.setAttribute('readonly', 'readonly');
        }
        if (updateData.year) {
          originalYear = newYear;
          year.setAttribute('disabled', 'disabled');
        }
        
        firstName.disabled = true;
        lastName.disabled = true;
        faculty.disabled = true;
        major.disabled = true;
        year.disabled = true;
        
        actions.classList.add('d-none');
        editBtn.style.display = 'block';
        
        Swal.fire({
          icon: 'success',
          title: 'บันทึกข้อมูลสำเร็จ',
          text: updateData.faculty || updateData.major || updateData.year 
            ? 'ข้อมูลของคุณได้รับการบันทึกแล้ว ข้อมูลที่บันทึกไปแล้วจะไม่สามารถแก้ไขได้อีก' 
            : 'ข้อมูลของคุณได้รับการบันทึกแล้ว',
          timer: 3000,
          showConfirmButton: true
        }).then(() => {
          // Reload page to reflect changes
          window.location.reload();
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: result.message || 'ไม่สามารถบันทึกข้อมูลได้',
          confirmButtonText: 'ตกลง'
        });
      }
    } catch (error) {
      console.error('Error updating personal info:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
        confirmButtonText: 'ตกลง'
      });
    }
  });
}

// Handle Google OAuth disconnect
function handleGoogleDisconnect() {
  const disconnectBtn = document.getElementById('disconnectGoogleBtn');
  
  if (!disconnectBtn) return; // Button only exists for Google OAuth users
  
  disconnectBtn.addEventListener('click', async function() {
    const result = await Swal.fire({
      title: 'ยกเลิกการเชื่อมต่อ Google?',
      html: `
        <p>คุณต้องการยกเลิกการเชื่อมต่อกับ Google และตั้งรหัสผ่านใหม่หรือไม่?</p>
        <div class="alert alert-warning text-start mt-3">
          <small><strong>หมายเหตุ:</strong></small><br>
          <small>• คุณจะไม่สามารถเข้าสู่ระบบด้วย Google ได้อีก</small><br>
          <small>• คุณต้องตั้งรหัสผ่านใหม่สำหรับการเข้าสู่ระบบ</small><br>
          <small>• คุณจะต้องใช้รหัสนักศึกษาและรหัสผ่านในการเข้าสู่ระบบต่อไป</small>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน ยกเลิกการเชื่อมต่อ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });
    
    if (!result.isConfirmed) return;
    
    // Prompt for new password
    const { value: formValues } = await Swal.fire({
      title: 'ตั้งรหัสผ่านใหม่',
      html: `
        <div class="text-start">
          <label class="form-label">รหัสผ่านใหม่ <span class="text-danger">*</span></label>
          <input type="password" id="swal-password1" class="form-control mb-3" placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)">
          
          <label class="form-label">ยืนยันรหัสผ่านใหม่ <span class="text-danger">*</span></label>
          <input type="password" id="swal-password2" class="form-control" placeholder="ยืนยันรหัสผ่านใหม่">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'ตั้งรหัสผ่าน',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        const password1 = document.getElementById('swal-password1').value;
        const password2 = document.getElementById('swal-password2').value;
        
        if (!password1 || !password2) {
          Swal.showValidationMessage('กรุณากรอกรหัสผ่านให้ครบถ้วน');
          return false;
        }
        
        if (password1.length < 6) {
          Swal.showValidationMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
          return false;
        }
        
        if (password1 !== password2) {
          Swal.showValidationMessage('รหัสผ่านไม่ตรงกัน');
          return false;
        }
        
        return { password: password1 };
      }
    });
    
    if (!formValues) return;
    
    // Show loading
    Swal.fire({
      title: 'กำลังดำเนินการ...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      const response = await fetch('/survey/disconnect-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: formValues.password })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'ยกเลิกการเชื่อมต่อสำเร็จ',
          text: 'คุณได้ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง',
          confirmButtonText: 'ตกลง',
          allowOutsideClick: false
        });
        
        // Redirect to login
        window.location.href = '/logout';
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: result.message || 'ไม่สามารถยกเลิกการเชื่อมต่อได้',
          confirmButtonText: 'ตกลง'
        });
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
        confirmButtonText: 'ตกลง'
      });
    }
  });
}

// Handle password change
function handlePasswordChange() {
  const form = document.getElementById('changePasswordForm');
  
  // Check if form exists (won't exist for Google OAuth users)
  if (!form) return;
  
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
