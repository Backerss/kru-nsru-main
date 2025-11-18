// Verify OTP Page
const otpInputs = document.querySelectorAll('.otp-input');
const otpForm = document.getElementById('otpForm');
const emailInput = document.getElementById('email');
const userEmailDisplay = document.getElementById('userEmail');
const otpValueInput = document.getElementById('otpValue');
const resendBtn = document.getElementById('resendBtn');
const timerSpan = document.getElementById('timer');

// Get email from session storage
const email = sessionStorage.getItem('resetEmail');
if (!email) {
    window.location.href = '/forgot-password/request-email';
} else {
    emailInput.value = email;
    userEmailDisplay.textContent = email;
}

// OTP Input Management
otpInputs.forEach((input, index) => {
    input.addEventListener('input', function(e) {
        const value = this.value;
        
        // Only allow numbers
        this.value = value.replace(/[^0-9]/g, '');
        
        if (this.value) {
            this.classList.add('filled');
            // Auto-focus next input
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        } else {
            this.classList.remove('filled');
        }
    });
    
    input.addEventListener('keydown', function(e) {
        // Handle backspace
        if (e.key === 'Backspace' && !this.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
    
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        
        for (let i = 0; i < pastedData.length && index + i < otpInputs.length; i++) {
            otpInputs[index + i].value = pastedData[i];
            otpInputs[index + i].classList.add('filled');
        }
        
        const nextIndex = Math.min(index + pastedData.length, otpInputs.length - 1);
        otpInputs[nextIndex].focus();
    });
});

// Timer countdown
let countdown = 60;
function startTimer() {
    resendBtn.disabled = true;
    const interval = setInterval(() => {
        countdown--;
        timerSpan.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(interval);
            resendBtn.disabled = false;
            timerSpan.textContent = '0';
            resendBtn.innerHTML = 'ส่งรหัสอีกครั้ง';
        }
    }, 1000);
}

startTimer();

// Resend OTP
resendBtn.addEventListener('click', function() {
    if (this.disabled) return;
    
    Swal.fire({
        title: 'กำลังส่งรหัสใหม่...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    fetch('/forgot-password/send-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'ส่งรหัสใหม่สำเร็จ!',
                text: 'กรุณาตรวจสอบอีเมลของคุณ',
                confirmButtonText: 'ตกลง',
                timer: 2000
            });
            countdown = 60;
            startTimer();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถส่งรหัสได้ กรุณาลองใหม่',
                confirmButtonText: 'ตกลง'
            });
        }
    });
});

// Form submission
otpForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Collect OTP from inputs
    let otp = '';
    otpInputs.forEach(input => {
        otp += input.value;
    });
    
    if (otp.length !== 6) {
        Swal.fire({
            icon: 'warning',
            title: 'กรอกรหัสไม่ครบ',
            text: 'กรุณากรอกรหัส OTP 6 หลัก',
            confirmButtonText: 'ตกลง'
        });
        return;
    }
    
    otpValueInput.value = otp;
    
    // Show loading
    Swal.fire({
        title: 'กำลังตรวจสอบรหัส...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Verify OTP
    fetch('/forgot-password/verify-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'ยืนยันสำเร็จ!',
                text: 'กำลังไปยังหน้าตั้งรหัสผ่านใหม่',
                confirmButtonText: 'ตกลง',
                timer: 1500
            }).then(() => {
                sessionStorage.setItem('verifiedOTP', otp);
                window.location.href = '/forgot-password/reset-password';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'รหัสไม่ถูกต้อง',
                text: data.message || 'กรุณาตรวจสอบรหัส OTP อีกครั้ง',
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
