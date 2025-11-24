// Form validation and submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Basic validation
    if (!email || !password) {
        showError('กรุณากรอกอีเมลและรหัสผ่าน');
        return;
    }
    
    // Hide error message on valid submission
    hideError();

    // Show loading
    Swal.fire({
        title: 'กำลังเข้าสู่ระบบ...',
        text: 'โปรดรอสักครู่',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                rememberMe
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Show success message with SweetAlert
            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ!',
                html: `<p>${result.message}</p>`,
                confirmButtonText: 'ไปหน้าหลัก',
                allowOutsideClick: false,
                timer: 2500,
                timerProgressBar: true
            }).then(() => {
                // Redirect to home page
                window.location.href = result.redirectUrl || '/survey/home';
            });
        } else {
            // Show error message
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: result.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
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

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.remove('d-none');
}

// Hide error message
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('d-none');
}

// Clear error on input
document.getElementById('email').addEventListener('input', hideError);
document.getElementById('password').addEventListener('input', hideError);

// Google OAuth login
document.getElementById('googleLoginBtn').addEventListener('click', function() {
    // Redirect to Google OAuth endpoint (same as register)
    window.location.href = '/auth/google';
});
