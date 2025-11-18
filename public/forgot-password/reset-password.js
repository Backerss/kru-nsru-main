// Reset Password Page
const resetForm = document.getElementById('resetForm');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Get email and OTP from session storage
const email = sessionStorage.getItem('resetEmail');
const otp = sessionStorage.getItem('verifiedOTP');

if (!email || !otp) {
    window.location.href = '/forgot-password/request-email';
} else {
    emailInput.value = email;
    otpInput.value = otp;
}

// Toggle password visibility
if (togglePassword) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        this.querySelector('i').classList.toggle('bi-eye');
        this.querySelector('i').classList.toggle('bi-eye-slash');
    });
}

if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        this.querySelector('i').classList.toggle('bi-eye');
        this.querySelector('i').classList.toggle('bi-eye-slash');
    });
}

// Password validation
function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('ต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('ต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('ต้องมีตัวเลขอย่างน้อย 1 ตัว');
    }
    
    return errors;
}

// Real-time password validation feedback
passwordInput.addEventListener('input', function() {
    const errors = validatePassword(this.value);
    
    if (errors.length > 0 && this.value.length > 0) {
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (this.value.length > 0) {
        this.classList.add('is-valid');
        this.classList.remove('is-invalid');
    }
});

// Confirm password matching
confirmPasswordInput.addEventListener('input', function() {
    if (this.value !== passwordInput.value && this.value.length > 0) {
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (this.value.length > 0) {
        this.classList.add('is-valid');
        this.classList.remove('is-invalid');
    }
});

// Form submission
resetForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'รหัสผ่านไม่ถูกต้อง',
            html: passwordErrors.join('<br>'),
            confirmButtonText: 'ตกลง'
        });
        return;
    }
    
    // Check password matching
    if (password !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'รหัสผ่านไม่ตรงกัน',
            text: 'กรุณาตรวจสอบรหัสผ่านให้ตรงกัน',
            confirmButtonText: 'ตกลง'
        });
        return;
    }
    
    // Show loading
    Swal.fire({
        title: 'กำลังบันทึกรหัสผ่านใหม่...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Submit to backend
    fetch('/forgot-password/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear session storage
            sessionStorage.removeItem('resetEmail');
            sessionStorage.removeItem('verifiedOTP');
            
            Swal.fire({
                icon: 'success',
                title: 'เปลี่ยนรหัสผ่านสำเร็จ!',
                text: 'กำลังไปยังหน้าเข้าสู่ระบบ',
                confirmButtonText: 'ตกลง',
                timer: 2000
            }).then(() => {
                window.location.href = '/login';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่',
                confirmButtonText: 'ตกลง'
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'กรุณาลองใหม่อีกครั้ง',
            confirmButtonText: 'ตกลง'
        });
    });
});
