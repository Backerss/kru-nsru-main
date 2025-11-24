// Password confirmation validation
document.getElementById('confirmPassword').addEventListener('input', function () {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const errorDiv = document.getElementById('passwordError');

    if (confirmPassword && password !== confirmPassword) {
        this.classList.add('is-invalid');
        errorDiv.textContent = 'รหัสผ่านไม่ตรงกัน';
    } else {
        this.classList.remove('is-invalid');
        errorDiv.textContent = '';
    }
});

// Google OAuth registration
document.getElementById('googleRegisterBtn').addEventListener('click', function () {
    // Redirect to Google OAuth endpoint
    window.location.href = '/auth/google';
});

// Check for Google OAuth errors in URL
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
        const errorAlert = document.getElementById('googleErrorAlert');
        const errorMessage = document.getElementById('googleErrorMessage');
        
        let message = '';
        switch(error) {
            case 'invalid_domain':
                message = 'กรุณาใช้อีเมลของมหาวิทยาลัย (@nsru.ac.th) เท่านั้น';
                break;
            case 'google':
                message = 'การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง';
                break;
            case 'server':
                message = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
                break;
            default:
                message = 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        }
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        // Remove error parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Form submission with validation
document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('confirmPassword').classList.add('is-invalid');
        document.getElementById('passwordError').textContent = 'รหัสผ่านไม่ตรงกัน';
        return;
    }

    // Get form data
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    // Show loading
    Swal.fire({
        title: 'กำลังสมัครสมาชิก...',
        text: 'โปรดรอสักครู่',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Show success message with SweetAlert
            Swal.fire({
                icon: 'success',
                title: 'สมัครสมาชิกสำเร็จ!',
                text: result.message || 'ยินดีต้อนรับเข้าสู่ระบบ',
                confirmButtonText: 'ไปหน้าเข้าสู่ระบบ',
                allowOutsideClick: false,
                timer: 3000,
                timerProgressBar: true
            }).then((result) => {
                // Redirect to login page
                window.location.href = '/login';
            });
        } else {
            // Show error message
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: result.error || 'ไม่สามารถสมัครสมาชิกได้',
                confirmButtonText: 'ตกลง'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
            confirmButtonText: 'ตกลง'
        });
    }
});
