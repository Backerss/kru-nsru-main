// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
  initCharts();
  initUserManagement();
  initExportButtons();
});

// Helper: compute age in years from a birthdate string (YYYY-MM-DD)
function computeAgeFromBirthdate(birthdate) {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (isNaN(dob)) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

// Initialize Charts
function initCharts() {
  // Survey Responses Bar Chart
  const surveyNames = {
    'ethical-knowledge': 'ความรู้ด้านจริยธรรม',
    'intelligent-tck': 'TCK',
    'intelligent-tk': 'TK',
    'intelligent-tpack': 'TPACK',
    'intelligent-tpk': 'TPK'
  };

  const labels = [];
  const data = [];
  
  Object.keys(surveyNames).forEach(surveyId => {
    labels.push(surveyNames[surveyId]);
    data.push(surveyStats[surveyId]?.count || 0);
  });

  // Bar Chart
  const barCtx = document.getElementById('surveyResponsesChart');
  if (barCtx) {
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'จำนวนคำตอบ',
          data: data,
          backgroundColor: [
            'rgba(44, 8, 201, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(44, 8, 201, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  // Pie Chart
  const pieCtx = document.getElementById('surveyDistributionChart');
  if (pieCtx) {
    new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(44, 8, 201, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

// Initialize User Management
function initUserManagement() {
  const searchInput = document.getElementById('searchUsers');
  const filterRole = document.getElementById('filterRole');
  const tableBody = document.querySelector('#usersTable tbody');
  const allRows = Array.from(tableBody.querySelectorAll('tr[data-student-id]'));

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', filterTable);
  }

  // Role filter
  if (filterRole) {
    filterRole.addEventListener('change', filterTable);
  }

  function filterTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const roleFilter = filterRole.value;

    allRows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const role = row.dataset.role;
      
      const matchesSearch = text.includes(searchTerm);
      const matchesRole = !roleFilter || role === roleFilter;

      if (matchesSearch && matchesRole) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  // Add User Button
  const btnAddUser = document.getElementById('btnAddUser');
  const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
  const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
  
  if (btnAddUser) {
    btnAddUser.addEventListener('click', () => {
      document.getElementById('addUserForm').reset();
      addUserModal.show();
    });
  }

  // Wire birthdate -> age auto-fill for Add and Edit forms
  const addBirthdateInput = document.querySelector('#addUserForm input[name="birthdate"]');
  const addAgeInput = document.getElementById('add_age');
  if (addBirthdateInput && addAgeInput) {
    addBirthdateInput.addEventListener('change', () => {
      const age = computeAgeFromBirthdate(addBirthdateInput.value);
      addAgeInput.value = age || '';
    });
  }

  const editBirthdateInput = document.getElementById('edit_birthdate');
  const editAgeInput = document.getElementById('edit_age');
  if (editBirthdateInput && editAgeInput) {
    editBirthdateInput.addEventListener('change', () => {
      const age = computeAgeFromBirthdate(editBirthdateInput.value);
      editAgeInput.value = age || '';
    });
  }

  // Save New User
  document.getElementById('btnSaveNewUser').addEventListener('click', async () => {
    const form = document.getElementById('addUserForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const userData = Object.fromEntries(formData);

    try {
      Swal.fire({
        title: 'กำลังเพิ่มผู้ใช้...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch('/admin/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (response.ok) {
        addUserModal.hide();
        Swal.fire({
          icon: 'success',
          title: 'เพิ่มผู้ใช้สำเร็จ',
          text: result.message,
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message
      });
    }
  });

  // Edit User Buttons
  document.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', function() {
      const userData = JSON.parse(this.dataset.user);
      console.log('User Data:', userData); // Debug log
      
      // Extract prefix from firstName if prefix is empty
      let prefix = userData.prefix || '';
      let firstName = userData.firstName || '';
      
      if (!prefix && firstName) {
        // Check if firstName starts with prefix
        if (firstName.startsWith('นาย')) {
          prefix = 'นาย';
          firstName = firstName.substring(3);
        } else if (firstName.startsWith('นางสาว')) {
          prefix = 'นางสาว';
          firstName = firstName.substring(6);
        } else if (firstName.startsWith('นาง')) {
          prefix = 'นาง';
          firstName = firstName.substring(3);
        }
      }
      
      // Fill form with user data
      // Keep original id hidden (used for URL), allow editing the visible id
      document.getElementById('edit_originalStudentId').value = userData.studentId || '';
      document.getElementById('edit_studentId_display').value = userData.studentId || '';
      document.getElementById('edit_prefix').value = prefix;
      document.getElementById('edit_firstName').value = firstName;
      document.getElementById('edit_lastName').value = userData.lastName || '';
      document.getElementById('edit_email').value = userData.email || '';
      document.getElementById('edit_phone').value = userData.phone || '';
      // Compute age from birthdate when available, otherwise fallback to stored age
      document.getElementById('edit_birthdate').value = userData.birthdate || '';
      const computedAge = computeAgeFromBirthdate(userData.birthdate) || userData.age || '';
      document.getElementById('edit_age').value = computedAge;
      document.getElementById('edit_faculty').value = (userData.faculty && userData.faculty !== 'ยังไม่ระบุ') ? userData.faculty : '';
      document.getElementById('edit_major').value = (userData.major && userData.major !== 'ยังไม่ระบุ') ? userData.major : '';
      document.getElementById('edit_year').value = (userData.year && userData.year !== 'ยังไม่ระบุ') ? userData.year : '';
      document.getElementById('edit_role').value = userData.role || 'student';

      editUserModal.show();
    });
  });

  // Save Edit User
  document.getElementById('btnSaveEditUser').addEventListener('click', async () => {
    const form = document.getElementById('editUserForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const userData = Object.fromEntries(formData);
    const originalId = userData.originalStudentId;
    delete userData.originalStudentId; // not part of body
    const studentIdForUrl = originalId || userData.studentId;

    try {
      Swal.fire({
        title: 'กำลังบันทึก...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`/admin/api/users/${encodeURIComponent(studentIdForUrl)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (response.ok) {
        editUserModal.hide();
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: result.message,
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message
      });
    }
  });

  // Delete User Buttons
  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', async function() {
      const studentId = this.dataset.studentId;
      const name = this.dataset.name;

      const result = await Swal.fire({
        title: 'ยืนยันการลบ',
        html: `คุณต้องการลบผู้ใช้ <strong>${name}</strong> ใช่หรือไม่?<br><small class="text-danger">การลบจะไม่สามารถกู้คืนได้</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
      });

      if (result.isConfirmed) {
        try {
          const response = await fetch(`/admin/api/users/${studentId}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (response.ok) {
            Swal.fire({
              icon: 'success',
              title: 'ลบสำเร็จ',
              text: data.message,
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              window.location.reload();
            });
          } else {
            throw new Error(data.message);
          }
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.message
          });
        }
      }
    });
  });
}

// Initialize Export Buttons
function initExportButtons() {
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const surveyId = this.dataset.surveyId;

      Swal.fire({
        title: 'กำลังส่งออกข้อมูล...',
        text: 'โปรดรอสักครู่',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch('/admin/api/export-to-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ surveyId })
        });

        const result = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: 'info',
            title: 'กำลังพัฒนา',
            html: `<p>${result.message}</p><p class="text-muted small">${result.note}</p>`,
            confirmButtonText: 'ตกลง'
          });
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message
        });
      }
    });
  });
}
