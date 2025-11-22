// Calculate age from birthdate
document.getElementById('birthdate').addEventListener('change', function () {
    const birthDate = new Date(this.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    document.getElementById('age').value = age >= 0 ? age : '';
});

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

// Show Thai Buddhist year (พ.ศ.) for birthdate and calculate age
function formatDateToThai(birthDate) {
    if (!birthDate || isNaN(birthDate.getTime())) return '';
    const d = String(birthDate.getDate()).padStart(2, '0');
    const m = String(birthDate.getMonth() + 1).padStart(2, '0');
    const by = birthDate.getFullYear() + 543; // พ.ศ.
    return `${d}/${m}/${by}`;
}

const birthInput = document.getElementById('birthdate');
const birthThaiEl = document.getElementById('birthdateThai');

function updateAgeAndThai() {
    const val = birthInput.value;
    if (!val) {
        birthThaiEl.textContent = '(ปี พ.ศ. จะแสดงที่นี่)';
        document.getElementById('age').value = '';
        return;
    }
    const birthDate = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    document.getElementById('age').value = age >= 0 ? age : '';
    birthThaiEl.textContent = 'วันเกิด (พ.ศ.): ' + formatDateToThai(birthDate);
}

birthInput.addEventListener('change', updateAgeAndThai);
// initialize if value present
if (birthInput.value) updateAgeAndThai();

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

    const ageVal = parseInt(document.getElementById('age').value, 10);
    if (isNaN(ageVal)) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกวันเกิด',
            text: 'โปรดระบุวัน/เดือน/ปีเกิดของคุณเพื่อคำนวณอายุ',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    if (ageVal < 18) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถสมัครได้',
            html: `<p>ขออภัย คุณต้องมีอายุตั้งแต่ 18 ปีขึ้นไปเพื่อสมัครสมาชิก</p>
                   <p>อายุตอนนี้: <strong>${ageVal}</strong> ปี</p>`,
            confirmButtonText: 'ตกลง'
        });
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
