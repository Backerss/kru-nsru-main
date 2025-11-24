// Survey Home Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Add smooth transitions
  initSmoothTransitions();
  
  // Handle responsive navbar
  handleNavbar();
  
  // Add active state to current page
  setActiveNavLink();

  // Handle logout buttons
  initLogoutHandlers();

  // Handle major selection and save
  initMajorSelection();
});

function initSmoothTransitions() {
  // Add fade-in animation to cards
  const cards = document.querySelectorAll('.card, .welcome-card, .quick-action-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

function handleNavbar() {
  // Add click ripple effect to mobile nav items
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  mobileNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      // Remove active from all
      mobileNavItems.forEach(i => i.classList.remove('active'));
      // Add active to clicked
      this.classList.add('active');
    });
  });
}

function setActiveNavLink() {
  const currentPath = window.location.pathname;
  
  // Desktop navbar
  const desktopNavLinks = document.querySelectorAll('.desktop-navbar .nav-link');
  desktopNavLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
  
  // Mobile bottom nav
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  mobileNavItems.forEach(item => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (href === currentPath) {
      item.classList.add('active');
    }
  });
}

function initLogoutHandlers() {
  // Add logout button handler if exists
  const logoutButtons = document.querySelectorAll('[data-logout], .btn-logout, a[href="/logout"]');
  logoutButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogout();
    });
  });
}

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

function initMajorSelection() {
  const majorSelect = document.getElementById('majorSelect');
  const saveMajorBtn = document.getElementById('saveMajorBtn');
  
  if (!majorSelect || !saveMajorBtn) return;

  // Enable save button when major is selected
  majorSelect.addEventListener('change', function() {
    if (this.value) {
      saveMajorBtn.disabled = false;
    } else {
      saveMajorBtn.disabled = true;
    }
  });

  // Handle save button click
  saveMajorBtn.addEventListener('click', async function() {
    const selectedMajor = majorSelect.value;
    
    if (!selectedMajor) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกสาขาวิชา',
        text: 'โปรดเลือกสาขาวิชาก่อนบันทึก',
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    // Confirm before saving
    const result = await Swal.fire({
      title: 'ยืนยันการบันทึก?',
      html: `
        <p class="mb-3">คุณต้องการบันทึกสาขาวิชาเป็น:</p>
        <div class="alert alert-info mb-3">
          <strong class="fs-5">${selectedMajor}</strong>
        </div>
        <div class="alert alert-warning mb-0">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>คำเตือน:</strong> คุณสามารถเลือกสาขาได้เพียงครั้งเดียวเท่านั้น<br>
          และไม่สามารถแก้ไขได้อีกในภายหลัง
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน บันทึกเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2C08C9',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    // Show loading
    Swal.fire({
      title: 'กำลังบันทึก...',
      html: 'กรุณารอสักครู่',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Send update request to server
      const response = await fetch('/survey/update-major', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          major: selectedMajor,
          faculty: 'คณะครุศาสตร์',
          year: '4'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          html: `
            <p>บันทึกสาขาวิชา <strong>${selectedMajor}</strong> เรียบร้อยแล้ว</p>
            <small class="text-muted">หน้าเว็บจะรีเฟรชอัตโนมัติ</small>
          `,
          timer: 2000,
          showConfirmButton: false
        });
        
        // Reload page to show updated data
        window.location.reload();
      } else {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Error saving major:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง'
      });
    }
  });
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    // Nothing specific needed for resize
  }, 250);
});
