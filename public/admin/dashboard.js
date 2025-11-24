// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function () {
  initCharts();
  initAdvancedAnalytics();
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

// Initialize Basic Charts
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

// Initialize Advanced Analytics
async function initAdvancedAnalytics() {
  try {
    const response = await fetch('/admin/api/analytics');
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to load analytics:', result.message);
      return;
    }

    const analytics = result.analytics;

    // 1. Radar Chart
    initRadarChart(analytics.radarChart);

    // 2. Performance Gauge
    initPerformanceGauge(analytics.performanceGauge);

    // 3. Top & Bottom Skills Tables
    populateSkillsTables(analytics.topSkills, analytics.bottomSkills);

    // 4. Comparative Charts
    initComparativeCharts(analytics.comparative);

    // 5. Trend Chart (if data available)
    if (analytics.trendData.enabled) {
      initTrendChart(analytics.trendData);
    }

  } catch (error) {
    console.error('Error loading advanced analytics:', error);
  }
}

// Radar Chart for TPACK dimensions
function initRadarChart(data) {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'คะแนนเฉลี่ย',
        data: data.scores,
        backgroundColor: 'rgba(44, 8, 201, 0.2)',
        borderColor: 'rgba(44, 8, 201, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(44, 8, 201, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(44, 8, 201, 1)',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: data.maxScore,
          ticks: {
            stepSize: 1,
            callback: function (value) {
              return value.toFixed(1);
            }
          },
          pointLabels: {
            font: {
              size: 12
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.label + ': ' + parseFloat(context.raw).toFixed(2) + ' / ' + data.maxScore;
            }
          }
        }
      }
    }
  });
}

// Performance Gauge (using doughnut chart as gauge)
function initPerformanceGauge(data) {
  const ctx = document.getElementById('gaugeChart');
  if (!ctx) return;

  const score = parseFloat(data.score);
  const percentage = (score / data.maxScore) * 100;

  // Update text elements
  document.getElementById('gaugeScore').textContent = score.toFixed(2) + ' / ' + data.maxScore;
  document.getElementById('gaugeLabel').innerHTML = `<span class="badge" style="background-color: ${data.color}; font-size: 1rem;">${data.label}</span>`;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['คะแนน', 'คงเหลือ'],
      datasets: [{
        data: [score, data.maxScore - score],
        backgroundColor: [data.color, '#e9ecef'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      circumference: 180,
      rotation: -90,
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      }
    }
  });
}

// Populate Top & Bottom Skills Tables
function populateSkillsTables(topSkills, bottomSkills) {
  const topTable = document.getElementById('topSkillsTable')?.querySelector('tbody');
  const bottomTable = document.getElementById('bottomSkillsTable')?.querySelector('tbody');

  if (topTable && topSkills.length > 0) {
    topTable.innerHTML = topSkills.map((skill, index) => `
      <tr>
        <td class="text-center"><strong>${index + 1}</strong></td>
        <td>
          <div class="mb-1">${skill.question}</div>
          <small class="text-muted">
            <span class="badge bg-light text-dark">${skill.category}</span>
            <span class="badge bg-info">${skill.surveyName}</span>
          </small>
        </td>
        <td class="text-center">
          <span class="badge bg-success" style="font-size: 0.9rem;">${skill.mean}</span>
          <br><small class="text-muted">${skill.responseCount} คน</small>
        </td>
      </tr>
    `).join('');
  } else if (topTable) {
    topTable.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">ยังไม่มีข้อมูล</td></tr>';
  }

  if (bottomTable && bottomSkills.length > 0) {
    bottomTable.innerHTML = bottomSkills.map((skill, index) => `
      <tr>
        <td class="text-center"><strong>${index + 1}</strong></td>
        <td>
          <div class="mb-1">${skill.question}</div>
          <small class="text-muted">
            <span class="badge bg-light text-dark">${skill.category}</span>
            <span class="badge bg-warning text-dark">${skill.surveyName}</span>
          </small>
        </td>
        <td class="text-center">
          <span class="badge bg-danger" style="font-size: 0.9rem;">${skill.mean}</span>
          <br><small class="text-muted">${skill.responseCount} คน</small>
        </td>
      </tr>
    `).join('');
  } else if (bottomTable) {
    bottomTable.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">ยังไม่มีข้อมูล</td></tr>';
  }
}

// Comparative Charts (Faculty & Year)
function initComparativeCharts(comparative) {
  // Faculty Comparison
  const facultyCtx = document.getElementById('facultyComparisonChart');
  if (facultyCtx && Object.keys(comparative.byFaculty).length > 0) {
    const facultyData = Object.entries(comparative.byFaculty)
      .filter(([key]) => key !== 'ไม่ระบุ')
      .sort((a, b) => parseFloat(b[1].mean) - parseFloat(a[1].mean));

    new Chart(facultyCtx, {
      type: 'bar',
      data: {
        labels: facultyData.map(([name]) => name.replace('คณะ', '')),
        datasets: [{
          label: 'คะแนนเฉลี่ย',
          data: facultyData.map(([, data]) => parseFloat(data.mean)),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const faculty = facultyData[context.dataIndex];
                return [
                  'คะแนนเฉลี่ย: ' + context.parsed.x.toFixed(2),
                  'จำนวนคำตอบ: ' + faculty[1].responses + ' ครั้ง'
                ];
              }
            }
          }
        }
      }
    });
  }

  // Year Comparison
  const yearCtx = document.getElementById('yearComparisonChart');
  if (yearCtx && Object.keys(comparative.byYear).length > 0) {
    const yearData = Object.entries(comparative.byYear)
      .filter(([key]) => key !== 'ไม่ระบุ')
      .sort((a, b) => a[0].localeCompare(b[0]));

    new Chart(yearCtx, {
      type: 'bar',
      data: {
        labels: yearData.map(([year]) => 'ปี ' + year),
        datasets: [{
          label: 'คะแนนเฉลี่ย',
          data: yearData.map(([, data]) => parseFloat(data.mean)),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const year = yearData[context.dataIndex];
                return [
                  'คะแนนเฉลี่ย: ' + context.parsed.y.toFixed(2),
                  'จำนวนคำตอบ: ' + year[1].responses + ' ครั้ง'
                ];
              }
            }
          }
        }
      }
    });
  }
}

// Trend Chart (for future pre/post test)
function initTrendChart(trendData) {
  const ctx = document.getElementById('trendChart');
  const alert = document.getElementById('trendAlert');

  if (!ctx) return;

  if (trendData.enabled && trendData.dates.length > 0) {
    alert.style.display = 'none';
    ctx.style.display = 'block';

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: trendData.dates,
        datasets: [{
          label: 'คะแนนเฉลี่ย',
          data: trendData.scores,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 0.5
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  } else {
    alert.style.display = 'block';
    ctx.style.display = 'none';
  }
}

// Initialize User Management with DataTables
function initUserManagement() {
  // Initialize DataTable
  const table = $('#usersTable').DataTable({
    responsive: true,
    pageLength: 5,
    lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "ทั้งหมด"]],
    language: {
      lengthMenu: "แสดง _MENU_ รายการ",
      zeroRecords: "ไม่พบข้อมูล",
      info: "แสดงหน้า _PAGE_ จาก _PAGES_",
      infoEmpty: "ไม่มีข้อมูล",
      infoFiltered: "(กรองจาก _MAX_ รายการทั้งหมด)",
      search: "ค้นหา:",
      paginate: {
        first: "แรกสุด",
        last: "สุดท้าย",
        next: "ถัดไป",
        previous: "ก่อนหน้า"
      }
    },
    order: [[0, 'asc']], // เรียงตามรหัสนักศึกษา
    columnDefs: [
      { responsivePriority: 1, targets: 0 }, // รหัสนักศึกษา
      { responsivePriority: 2, targets: 1 }, // ชื่อ
      { responsivePriority: 3, targets: -1 }, // จัดการ
      { orderable: false, targets: -1 } // ปุ่มจัดการไม่ให้เรียง
    ]
  });

  // Refresh Table Button
  const btnRefreshTable = document.getElementById('btnRefreshTable');
  if (btnRefreshTable) {
    btnRefreshTable.addEventListener('click', () => refreshUserTable(table));
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

  // Edit User Buttons (delegated so it works across DataTable pagination)
  $('#usersTable tbody').on('click', '.btn-edit-user', function () {
    const userData = JSON.parse(this.dataset.user);

    // Extract prefix from firstName if prefix is empty
    let prefix = userData.prefix || '';
    let firstName = userData.firstName || '';

    if (!prefix && firstName) {
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
    document.getElementById('edit_uid').value = userData.uid || '';
    document.getElementById('edit_prefix').value = prefix;
    document.getElementById('edit_firstName').value = firstName;
    document.getElementById('edit_lastName').value = userData.lastName || '';
    document.getElementById('edit_email').value = userData.email || '';
    document.getElementById('edit_role').value = userData.role || 'student';

    editUserModal.show();
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
    const uid = userData.uid;
    delete userData.uid; // uid used in URL, not body

    try {
      Swal.fire({
        title: 'กำลังบันทึก...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`/admin/api/users/${encodeURIComponent(uid)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (response.ok) {
        editUserModal.hide();
        
        // อัปเดตข้อมูลในตารางแบบ real-time
        updateUserRowInTable(result.data);
        
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: result.message,
          timer: 2000,
          showConfirmButton: false
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

  // Delete User Buttons (delegated)
  $('#usersTable tbody').on('click', '.btn-delete-user', async function () {
    const uid = this.dataset.uid;
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
        const response = await fetch(`/admin/api/users/${uid}`, {
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

  // Disconnect Google OAuth Buttons (delegated)
  $('#usersTable tbody').on('click', '.btn-disconnect-google', async function () {
    const uid = this.dataset.uid;
    const name = this.dataset.name;
    const email = this.dataset.email;

    const result = await Swal.fire({
      title: 'ยกเลิกการเชื่อมต่อ Google OAuth?',
      html: `
        <p>คุณต้องการยกเลิกการเชื่อมต่อ Google OAuth สำหรับ:</p>
        <div class="text-start my-3">
          <strong>ชื่อ:</strong> ${name}<br>
          <strong>อีเมล:</strong> ${email}
        </div>
        <div class="alert alert-warning text-start">
          <strong>⚠️ การดำเนินการนี้จะ:</strong>
          <ul class="mb-0">
            <li>สร้างรหัสผ่านสุ่ม 8 ตัวอักษร</li>
            <li>ส่งรหัสผ่านใหม่ไปยัง ${email}</li>
            <li>ผู้ใช้จะต้องเข้าสู่ระบบด้วยรหัสผ่านแทน Google OAuth</li>
          </ul>
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

    // Show loading
    Swal.fire({
      title: 'กำลังดำเนินการ...',
      html: 'กำลังยกเลิกการเชื่อมต่อและส่งรหัสผ่านใหม่',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const response = await fetch(`/admin/api/users/${uid}/disconnect-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        let html = `<p>${data.message}</p>`;
        if (data.warning) {
          html += `<div class="alert alert-warning">${data.warning}</div>`;
        }
        if (data.temporaryPassword) {
          html += `
            <div class="alert alert-info">
              <strong>รหัสผ่านชั่วคราว:</strong><br>
              <code style="font-size: 20px; font-weight: bold;">${data.temporaryPassword}</code><br>
              <small>กรุณาบันทึกรหัสนี้และแจ้งผู้ใช้</small>
            </div>
          `;
        }

        await Swal.fire({
          icon: 'success',
          title: 'ยกเลิกการเชื่อมต่อสำเร็จ!',
          html: html,
          confirmButtonText: 'ตกลง'
        });

        // Reload page to update user table
        window.location.reload();
      } else {
        throw new Error(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถยกเลิกการเชื่อมต่อได้',
        confirmButtonText: 'ตกลง'
      });
    }
  });
}

// Update user row in table
function updateUserRowInTable(userData) {
  // ใช้ uid หาแถวแทน studentId
  const uid = userData.uid;
  let row = null;
  
  // หาแถวจาก data-uid attribute
  const allRows = document.querySelectorAll('tr[data-uid]');
  allRows.forEach(r => {
    if (r.dataset.uid === uid) {
      row = r;
    }
  });
  
  if (!row) {
    console.log('Row not found for uid:', uid, '- refreshing page...');
    window.location.reload();
    return;
  }

  // สร้างชื่อเต็ม
  const fullName = `${userData.prefix || ''}${userData.firstName} ${userData.lastName}`;

  // อัปเดต data attributes ทั้งหมดที่ใช้งานบนแถว
  row.dataset.uid = userData.uid || '';
  row.dataset.role = userData.role || '';
  row.dataset.authProvider = userData.authProvider || 'email';

  // อัปเดต badge role
  const roleBadges = {
    'student': '<span class="badge bg-secondary">นักศึกษา</span>',
    'teacher': '<span class="badge bg-warning">อาจารย์</span>',
    'admin': '<span class="badge bg-danger">แอดมิน</span>',
    'person': '<span class="badge bg-info">บุคคลธรรมดา</span>'
  };

  // อัปเดต auth provider badge
  const authBadges = {
    'email': '<span class="badge bg-light text-dark"><i class="bi bi-envelope me-1"></i>Email</span>',
    'google': '<span class="badge bg-light text-dark"><i class="bi bi-google me-1"></i>Google</span>'
  };

  // อัปเดตเซลล์ในตาราง (โครงสร้างใหม่: ชื่อ-นามสกุล, อีเมล, Role, การเข้าสู่ระบบ, จัดการ)
  const cells = row.querySelectorAll('td');
  if (cells.length >= 5) {
    if (cells[0]) cells[0].textContent = fullName;
    if (cells[1]) cells[1].textContent = userData.email || '';
    if (cells[2]) cells[2].innerHTML = roleBadges[userData.role] || '<span class="badge bg-secondary">นักศึกษา</span>';
    if (cells[3]) cells[3].innerHTML = authBadges[userData.authProvider || 'email'] || '';

    // อัปเดต data ในปุ่มภายในคอลัมน์ actions
    const editBtn = row.querySelector('.btn-edit-user');
    if (editBtn) {
      try { editBtn.dataset.user = JSON.stringify(userData); } catch (e) { editBtn.setAttribute('data-user', JSON.stringify(userData)); }
      editBtn.dataset.uid = userData.uid || '';
    }

    const deleteBtn = row.querySelector('.btn-delete-user');
    if (deleteBtn) {
      deleteBtn.dataset.uid = userData.uid || '';
      deleteBtn.dataset.name = fullName || '';
    }

    const googleBtn = row.querySelector('.btn-disconnect-google');
    if (googleBtn) {
      googleBtn.dataset.uid = userData.uid || '';
      googleBtn.dataset.name = fullName || '';
      googleBtn.dataset.email = userData.email || '';
    }
  }

  // แสดง highlight animation
  row.style.transition = 'background-color 0.5s';
  row.style.backgroundColor = '#d4edda';
  setTimeout(() => {
    row.style.backgroundColor = '';
  }, 2000);

  console.log('Table row updated successfully!');
}

// Refresh user table data
async function refreshUserTable(dataTable) {
  const btnRefreshTable = document.getElementById('btnRefreshTable');
  const icon = btnRefreshTable?.querySelector('i');
  
  try {
    // หมุนไอคอนและปิดปุ่ม
    if (icon) {
      icon.classList.add('spin-animation');
    }
    if (btnRefreshTable) {
      btnRefreshTable.disabled = true;
    }

    // รับประกันให้หมุนอย่างน้อย 1 วินาที
    const [response] = await Promise.all([
      fetch('/admin/api/users'),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);
    
    const result = await response.json();

    if (result.success && result.users) {
      // ล้างและอัปเดตข้อมูลใน DataTable
      dataTable.clear();
      
      // Add each user row and attach dataset attributes (studentId, role, authProvider, user JSON)
      for (const userData of result.users) {
        const fullName = `${userData.prefix || ''}${userData.firstName} ${userData.lastName}`;
        const roleBadge = getRoleBadge(userData.role);
        const authBadge = getAuthBadge(userData.authProvider || 'email');
        const actionButtons = getActionButtons(userData);
        const userDataJson = JSON.stringify(userData).replace(/'/g, '&apos;');

        // Add row and immediately draw so we can access the created DOM node
        const added = dataTable.row.add([
          userData.studentId,
          fullName,
          userData.email,
          userData.faculty || '-',
          userData.major || '-',
          userData.year || '-',
          roleBadge,
          authBadge,
          actionButtons
        ]);

        // draw(false) to avoid full re-order each iteration, then set attributes on the created row
        const rowApi = added.draw(false);
        const rowNode = rowApi.node();
        if (rowNode) {
          try {
            rowNode.setAttribute('data-student-id', userData.studentId || '');
            rowNode.setAttribute('data-user', userDataJson);
            rowNode.setAttribute('data-role', userData.role || '');
            rowNode.setAttribute('data-auth-provider', userData.authProvider || 'email');
          } catch (e) {
            // ignore attribute setting errors
            console.warn('Could not set row dataset attributes', e);
          }
        }
      }

      // Final draw to ensure paging/sorting updated
      dataTable.draw(false);
      
      // Rebind event listeners
      rebindUserTableEvents();
      
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'รีเฟรชข้อมูลเรียบร้อย',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      throw new Error('ไม่สามารถโหลดข้อมูลได้');
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: error.message
    });
  } finally {
    if (icon) {
      icon.classList.remove('spin-animation');
    }
    if (btnRefreshTable) {
      btnRefreshTable.disabled = false;
    }
  }
}

// Helper functions for rendering table cells
function getRoleBadge(role) {
  const badges = {
    'admin': '<span class="badge bg-danger">ผู้ดูแลระบบ</span>',
    'teacher': '<span class="badge bg-warning text-dark">อาจารย์</span>',
    'person': '<span class="badge bg-info">บุคคลธรรมดา</span>',
    'student': '<span class="badge bg-secondary">นักศึกษา</span>'
  };
  return badges[role] || badges['student'];
}

function getAuthBadge(authProvider) {
  if (authProvider === 'google') {
    return '<span class="badge bg-primary"><i class="bi bi-google me-1"></i>Google OAuth</span>';
  }
  return '<span class="badge bg-secondary"><i class="bi bi-key me-1"></i>รหัสผ่าน</span>';
}

function getActionButtons(userData) {
  const userDataJson = JSON.stringify(userData).replace(/'/g, '&apos;');
  let buttons = '<div class="btn-group btn-group-sm">';
  
  if (userData.authProvider === 'google') {
    buttons += `
      <button class="btn btn-outline-warning btn-disconnect-google" 
              data-student-id="${userData.studentId}"
              data-name="${userData.prefix || ''}${userData.firstName} ${userData.lastName}"
              data-email="${userData.email}"
              title="ยกเลิกการเชื่อมต่อ Google">
        <i class="bi bi-x-circle"></i>
      </button>
    `;
  }
  
  buttons += `
    <button class="btn btn-outline-primary btn-edit-user" 
            data-student-id="${userData.studentId}"
            data-user='${userDataJson}'
            title="แก้ไขข้อมูล">
      <i class="bi bi-pencil"></i>
    </button>
    <button class="btn btn-outline-danger btn-delete-user" 
            data-student-id="${userData.studentId}"
            data-name="${userData.prefix || ''}${userData.firstName} ${userData.lastName}"
            title="ลบผู้ใช้">
      <i class="bi bi-trash"></i>
    </button>
  </div>`;
  
  return buttons;
}

// Show loading overlay in table
function showTableLoading(tableBody) {
  const loadingRow = document.createElement('tr');
  loadingRow.id = 'table-loading-row';
  loadingRow.innerHTML = `
    <td colspan="9" class="text-center py-5">
      <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 200px;">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">กำลังโหลด...</span>
        </div>
        <h5 class="text-muted mb-2">กำลังรีเฟรชข้อมูล...</h5>
        <p class="text-muted mb-0 small">โปรดรอสักครู่</p>
      </div>
    </td>
  `;
  tableBody.innerHTML = '';
  tableBody.appendChild(loadingRow);
}

// Hide loading overlay
function hideTableLoading() {
  const loadingRow = document.getElementById('table-loading-row');
  if (loadingRow) {
    loadingRow.remove();
  }
}

// Update table with new data (without page reload)
function updateTableWithNewData(users) {
  const tableBody = document.querySelector('#usersTable tbody');
  if (!tableBody) return;
  // สร้าง HTML สำหรับแถวใหม่ (ให้ตรงกับ header ใน EJS)
  const newRows = users.map(userData => {
    const fullName = `${userData.prefix || ''}${userData.firstName} ${userData.lastName}`;
    const roleBadgeClass = userData.role === 'admin' ? 'danger' : userData.role === 'teacher' ? 'warning' : userData.role === 'person' ? 'info' : 'secondary';
    const roleLabel = userData.role === 'admin' ? 'ผู้ดูแลระบบ' : userData.role === 'teacher' ? 'อาจารย์' : userData.role === 'person' ? 'บุคคลธรรมดา' : 'นักศึกษา';

    // Auth provider label (simple text inside small badge)
    const authHtml = userData.authProvider === 'google'
      ? `<span class="badge bg-primary"><i class="bi bi-google me-1"></i>Google OAuth</span>`
      : `<span class="badge bg-secondary"><i class="bi bi-key me-1"></i>รหัสผ่าน</span>`;

    // Action buttons: disconnect (if google), edit, delete — match EJS order and classes
    const disconnectBtn = userData.authProvider === 'google' ?
      `<button class="btn btn-outline-warning btn-disconnect-google" data-uid="${userData.uid}" data-name="${fullName}" data-email="${userData.email}" title="ยกเลิกการเชื่อมต่อ Google"><i class="bi bi-x-circle"></i></button>`
      : '';

    const escapedUserJson = JSON.stringify(userData).replace(/'/g, "&#39;");

    return `
      <tr data-uid="${userData.uid}" data-role="${userData.role}">
        <td>${fullName}</td>
        <td>${userData.email || ''}</td>
        <td>
          <span class="badge bg-${roleBadgeClass}">${roleLabel}</span>
        </td>
        <td class="d-none d-xl-table-cell">
          ${authHtml}
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            ${disconnectBtn}
            <button class="btn btn-outline-primary btn-edit-user" data-uid="${userData.uid}" data-user='${escapedUserJson}' title="แก้ไขข้อมูล">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-delete-user" data-uid="${userData.uid}" data-name="${fullName}" title="ลบผู้ใช้">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // แทนที่ tbody ด้วยข้อมูลใหม่
  tableBody.innerHTML = newRows;

  // ผูก event listeners ใหม่สำหรับปุ่มทั้งหมด
  rebindUserTableEvents();

  console.log('Table refreshed with', users.length, 'users');
}

// Rebind event listeners after table refresh
function rebindUserTableEvents() {
  const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));

  // Edit User Buttons
  document.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', function () {
      const userData = JSON.parse(this.dataset.user);
      console.log('User Data:', userData);

      let prefix = userData.prefix || '';
      let firstName = userData.firstName || '';

      if (!prefix && firstName) {
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

      document.getElementById('edit_uid').value = userData.uid || '';
      document.getElementById('edit_prefix').value = prefix;
      document.getElementById('edit_firstName').value = firstName;
      document.getElementById('edit_lastName').value = userData.lastName || '';
      document.getElementById('edit_email').value = userData.email || '';
      document.getElementById('edit_role').value = userData.role || 'student';

      editUserModal.show();
    });
  });

  // Delete User Buttons
  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', async function () {
      const uid = this.dataset.uid;
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
          const response = await fetch(`/admin/api/users/${uid}`, {
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

  // Disconnect Google OAuth Buttons
  document.querySelectorAll('.btn-disconnect-google').forEach(btn => {
    btn.addEventListener('click', async function () {
      const uid = this.dataset.uid;
      const name = this.dataset.name;
      const email = this.dataset.email;

      const result = await Swal.fire({
        title: 'ยกเลิกการเชื่อมต่อ Google OAuth?',
        html: `
          <p>คุณต้องการยกเลิกการเชื่อมต่อ Google OAuth สำหรับ:</p>
          <div class="text-start my-3">
            <strong>ชื่อ:</strong> ${name}<br>
            <strong>อีเมล:</strong> ${email}
          </div>
          <div class="alert alert-warning text-start">
            <strong>⚠️ การดำเนินการนี้จะ:</strong>
            <ul class="mb-0">
              <li>สร้างรหัสผ่านสุ่ม 8 ตัวอักษร</li>
              <li>ส่งรหัสผ่านใหม่ไปยัง ${email}</li>
              <li>ผู้ใช้จะต้องเข้าสู่ระบบด้วยรหัสผ่านแทน Google OAuth</li>
            </ul>
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

      Swal.fire({
        title: 'กำลังดำเนินการ...',
        html: 'กำลังยกเลิกการเชื่อมต่อและส่งรหัสผ่านใหม่',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch(`/admin/api/users/${uid}/disconnect-google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          let html = `<p>${data.message}</p>`;
          if (data.warning) {
            html += `<div class="alert alert-warning">${data.warning}</div>`;
          }
          if (data.temporaryPassword) {
            html += `
              <div class="alert alert-info">
                <strong>รหัสผ่านชั่วคราว:</strong><br>
                <code style="font-size: 20px; font-weight: bold;">${data.temporaryPassword}</code><br>
                <small>กรุณาบันทึกรหัสนี้และแจ้งผู้ใช้</small>
              </div>
            `;
          }

          await Swal.fire({
            icon: 'success',
            title: 'ยกเลิกการเชื่อมต่อสำเร็จ!',
            html: html,
            confirmButtonText: 'ตกลง'
          });

          window.location.reload();
        } else {
          throw new Error(data.message || 'เกิดข้อผิดพลาด');
        }
      } catch (error) {
        console.error('Error:', error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message || 'ไม่สามารถยกเลิกการเชื่อมต่อได้',
          confirmButtonText: 'ตกลง'
        });
      }
    });
  });
}

// Initialize Export Buttons
function initExportButtons() {
  // Excel export buttons (per survey)
  document.querySelectorAll('.export-excel-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const surveyId = this.dataset.surveyId;
      const surveyNames = {
        'ethical-knowledge': 'ความรู้ด้านจริยธรรม',
        'intelligent-tck': 'TCK',
        'intelligent-tk': 'TK',
        'intelligent-tpack': 'TPACK',
        'intelligent-tpk': 'TPK'
      };
      const surveyName = surveyNames[surveyId] || surveyId;

      Swal.fire({
        title: 'กำลังสร้างไฟล์ Excel...',
        text: `กำลังดาวน์โหลดข้อมูล: ${surveyName}`,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Download via hidden link
      const downloadUrl = `/admin/export/xlsx?surveyId=${surveyId}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `export-${surveyId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Close loading after a short delay
      setTimeout(() => {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'ดาวน์โหลดเรียบร้อย',
          text: 'ไฟล์ Excel ถูกบันทึกลงเครื่องของคุณแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
      }, 1500);
    });
  });

  // Export all to Excel button
  const exportAllExcelBtn = document.getElementById('exportAllExcel');
  if (exportAllExcelBtn) {
    exportAllExcelBtn.addEventListener('click', function () {
      Swal.fire({
        title: 'กำลังสร้างไฟล์ Excel...',
        text: 'กำลังดาวน์โหลดข้อมูลทั้งหมด',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const downloadUrl = '/admin/export/xlsx?surveyId=all';
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'export-all.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'ดาวน์โหลดเรียบร้อย',
          text: 'ไฟล์ Excel ทั้งหมดถูกบันทึกลงเครื่องของคุณแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
      }, 1500);
    });
  }

  // Google Sheets export buttons (existing functionality)
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const surveyId = this.dataset.surveyId;

      Swal.fire({
        title: 'กำลังตรวจสอบ Google Sheets...',
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

        if (result.success) {
          if (result.alreadyExists) {
            // แผ่นงานมีข้อมูลแล้ว
            Swal.fire({
              icon: 'info',
              title: 'แผ่นงานมีข้อมูลอยู่แล้ว',
              html: `<p>แผ่นงานใน Google Sheets มีข้อมูลอยู่แล้ว</p>
                     <p class="text-muted small mt-2">ระบบส่งข้อมูลอัตโนมัติเมื่อมีการตอบแบบสอบถาม</p>
                     <p class="text-muted small">Spreadsheet: ${result.spreadsheet}</p>
                     <a href="${result.url}" target="_blank" class="btn btn-sm btn-primary mt-2">
                       <i class="bi bi-box-arrow-up-right me-1"></i>เปิด Spreadsheet เพื่อดูข้อมูล
                     </a>`,
              confirmButtonText: 'ตกลง',
              width: '600px'
            });
          } else {
            // Google Sheets พร้อมใช้งาน
            Swal.fire({
              icon: 'success',
              title: 'Google Sheets พร้อมใช้งาน',
              html: `<p>${result.message}</p>
                     <p class="text-muted small mt-2">Spreadsheet: ${result.spreadsheet}</p>
                     <a href="${result.url}" target="_blank" class="btn btn-sm btn-primary mt-2">
                       <i class="bi bi-box-arrow-up-right me-1"></i>เปิด Spreadsheet
                     </a>`,
              confirmButtonText: 'ตกลง'
            });
          }
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'ยังไม่ได้ตั้งค่า',
            html: `<p>${result.message}</p>${result.note ? `<p class="text-muted small">${result.note}</p>` : ''}`,
            confirmButtonText: 'ตกลง'
          });
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

  // Test Google Sheets connection
  const testSheetsBtn = document.getElementById('testSheetsConnection');
  if (testSheetsBtn) {
    testSheetsBtn.addEventListener('click', async function () {
      Swal.fire({
        title: 'กำลังทดสอบการเชื่อมต่อ...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch('/admin/api/sheets/test');
        const result = await response.json();

        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'เชื่อมต่อสำเร็จ!',
            html: `
              <div class="text-start">
                <p><strong>Spreadsheet:</strong> ${result.spreadsheetTitle}</p>
                <p><strong>จำนวนแผ่นงาน:</strong> ${result.sheetCount}</p>
                <a href="${result.spreadsheetUrl}" target="_blank" class="btn btn-sm btn-primary mt-2">
                  <i class="bi bi-box-arrow-up-right me-1"></i>เปิด Spreadsheet
                </a>
              </div>
            `,
            confirmButtonText: 'ตกลง'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เชื่อมต่อไม่สำเร็จ',
            html: `<p>${result.message}</p>
                   ${result.code ? `<p class="text-muted small">Error code: ${result.code}</p>` : ''}`,
            confirmButtonText: 'ตกลง'
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message
        });
      }
    });
  }

  // Create all sheets
  const createAllSheetsBtn = document.getElementById('createAllSheets');
  if (createAllSheetsBtn) {
    createAllSheetsBtn.addEventListener('click', async function () {
      Swal.fire({
        title: 'กำลังตรวจสอบแผ่นงาน...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch('/admin/api/sheets/create-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (result.success) {
          if (result.alreadyExists) {
            // แผ่นงานมีข้อมูลแล้ว
            const sheetNames = [];
            if (result.sheets) {
              for (const [id, sheet] of Object.entries(result.sheets)) {
                if (sheet.hasData) {
                  sheetNames.push(sheet.name);
                }
              }
            }
            
            Swal.fire({
              icon: 'info',
              title: 'แผ่นงานมีข้อมูลอยู่แล้ว',
              html: `<p>แผ่นงานใน Google Sheets มีข้อมูลอยู่แล้ว</p>
                     <p class="text-muted small mt-2">แผ่นงานที่มีข้อมูล: <strong>${sheetNames.join(', ')}</strong></p>
                     <p class="text-muted small">คุณสามารถเปิดดูข้อมูลได้เลย</p>`,
              confirmButtonText: 'ตกลง',
              width: '600px'
            });
          } else {
            // สร้างแผ่นงานสำเร็จ
            Swal.fire({
              icon: 'success',
              title: 'สำเร็จ!',
              text: result.message,
              confirmButtonText: 'ตกลง'
            });
          }
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: result.message
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message
        });
      }
    });
  }
}
