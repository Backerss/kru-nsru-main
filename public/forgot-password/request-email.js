// Request Email - Send OTP
document.getElementById('emailForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกอีเมล',
            text: 'โปรดระบุอีเมลของคุณ',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    // Show loading
    Swal.fire({
        title: 'กำลังส่งรหัสยืนยัน...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Send request to backend
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
                title: 'ส่งรหัสสำเร็จ!',
                text: 'กรุณาตรวจสอบอีเมลของคุณ',
                confirmButtonText: 'ตกลง'
            }).then(() => {
                // Store email and redirect to verify page
                sessionStorage.setItem('resetEmail', email);
                window.location.href = '/forgot-password/verify-otp';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: data.message || 'ไม่พบอีเมลนี้ในระบบ',
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
