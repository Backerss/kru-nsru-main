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

// Initialize User Management with Pagination
function initUserManagement() {
  const searchInput = document.getElementById('searchUsers');
  const filterRole = document.getElementById('filterRole');
  const filterAuthProvider = document.getElementById('filterAuthProvider');
  const entriesPerPage = document.getElementById('entriesPerPage');
  const tableBody = document.getElementById('tableBody');
  const pagination = document.getElementById('pagination');
  const paginationInfo = document.getElementById('paginationInfo');
  const tableInfo = document.getElementById('tableInfo');

  const allRows = Array.from(tableBody.querySelectorAll('tr[data-student-id]'));

  let currentPage = 1;
  let rowsPerPage = parseInt(entriesPerPage?.value || 25);

  // Filter and Pagination System
  function applyFiltersAndPagination() {
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const roleFilter = filterRole?.value || '';
    const authFilter = filterAuthProvider?.value || '';

    // Filter rows
    const filteredRows = allRows.filter(row => {
      const name = (row.dataset.name || '').toLowerCase();
      const email = (row.dataset.email || '').toLowerCase();
      const studentId = (row.dataset.studentId || '').toLowerCase();
      const role = row.dataset.role || '';
      const authProvider = row.dataset.authProvider || '';

      const matchesSearch = !searchTerm ||
        name.includes(searchTerm) ||
        email.includes(searchTerm) ||
        studentId.includes(searchTerm);
      const matchesRole = !roleFilter || role === roleFilter;
      const matchesAuth = !authFilter || authProvider === authFilter;

      return matchesSearch && matchesRole && matchesAuth;
    });

    const totalFiltered = filteredRows.length;
    const totalPages = Math.ceil(totalFiltered / rowsPerPage) || 1;

    // Adjust current page if needed
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    // Hide all rows first
    allRows.forEach(row => row.style.display = 'none');

    // Show only paginated rows
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const visibleRows = filteredRows.slice(start, end);

    visibleRows.forEach(row => row.style.display = '');

    // Show empty state message if no results
    const noDataRow = document.getElementById('noDataRow');
    if (totalFiltered === 0) {
      if (!noDataRow) {
        const tbody = document.getElementById('tableBody');
        const emptyRow = document.createElement('tr');
        emptyRow.id = 'noDataRow';
        emptyRow.innerHTML = `
          <td colspan="6" class="text-center text-muted py-5">
            <i class="bi bi-inbox display-4 d-block mb-3"></i>
            <p>ไม่พบข้อมูลที่ค้นหา</p>
          </td>
        `;
        tbody.appendChild(emptyRow);
      } else {
        noDataRow.style.display = '';
      }
    } else {
      if (noDataRow) {
        noDataRow.style.display = 'none';
      }
    }

    // Update info
    if (tableInfo) {
      tableInfo.textContent = `แสดง ${totalFiltered} จาก ${allRows.length}`;
    }

    if (paginationInfo) {
      if (totalFiltered === 0) {
        paginationInfo.textContent = 'ไม่พบข้อมูล';
      } else {
        paginationInfo.textContent = `แสดง ${start + 1}-${Math.min(end, totalFiltered)} จาก ${totalFiltered} รายการ`;
      }
    }

    // Render pagination buttons
    renderPagination(totalPages, totalFiltered);
  }

  function renderPagination(totalPages, totalFiltered) {
    if (!pagination) return;

    pagination.innerHTML = '';

    if (totalFiltered === 0 || totalPages === 1) {
      return;
    }

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">«</a>`;
    pagination.appendChild(prevLi);

    // Page numbers
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      const firstLi = document.createElement('li');
      firstLi.className = 'page-item';
      firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
      pagination.appendChild(firstLi);

      if (startPage > 2) {
        const dotsLi = document.createElement('li');
        dotsLi.className = 'page-item disabled';
        dotsLi.innerHTML = `<span class="page-link">...</span>`;
        pagination.appendChild(dotsLi);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      pagination.appendChild(li);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dotsLi = document.createElement('li');
        dotsLi.className = 'page-item disabled';
        dotsLi.innerHTML = `<span class="page-link">...</span>`;
        pagination.appendChild(dotsLi);
      }

      const lastLi = document.createElement('li');
      lastLi.className = 'page-item';
      lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
      pagination.appendChild(lastLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">»</a>`;
    pagination.appendChild(nextLi);

    // Add click handlers
    pagination.querySelectorAll('a.page-link').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const page = parseInt(this.dataset.page);
        if (page && page !== currentPage && page >= 1 && page <= totalPages) {
          currentPage = page;
          applyFiltersAndPagination();
        }
      });
    });
  }

  // Event listeners
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      applyFiltersAndPagination();
    });
  }

  if (filterRole) {
    filterRole.addEventListener('change', () => {
      currentPage = 1;
      applyFiltersAndPagination();
    });
  }

  if (filterAuthProvider) {
    filterAuthProvider.addEventListener('change', () => {
      currentPage = 1;
      applyFiltersAndPagination();
    });
  }

  if (entriesPerPage) {
    entriesPerPage.addEventListener('change', () => {
      rowsPerPage = parseInt(entriesPerPage.value);
      currentPage = 1;
      applyFiltersAndPagination();
    });
  }

  // Initial render
  applyFiltersAndPagination();

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
    btn.addEventListener('click', function () {
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

      // Show/hide Google OAuth notice
      const googleAuthNotice = document.getElementById('googleAuthNotice');
      if (userData.authProvider === 'google') {
        googleAuthNotice.style.display = 'block';
      } else {
        googleAuthNotice.style.display = 'none';
      }

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
    btn.addEventListener('click', async function () {
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

  // Disconnect Google OAuth Buttons
  document.querySelectorAll('.btn-disconnect-google').forEach(btn => {
    btn.addEventListener('click', async function () {
      const studentId = this.dataset.studentId;
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
        const response = await fetch(`/admin/api/users/${studentId}/disconnect-google`, {
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
      const confirmation = await Swal.fire({
        title: 'สร้างแผ่นงานทั้งหมด?',
        text: 'จะสร้างแผ่นงาน 5 แผ่น (Ethical Knowledge, TCK, TK, TPACK, TPK) ใน Spreadsheet',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'สร้าง',
        cancelButtonText: 'ยกเลิก'
      });

      if (!confirmation.isConfirmed) return;

      Swal.fire({
        title: 'กำลังสร้างแผ่นงาน...',
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
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ!',
            text: result.message,
            confirmButtonText: 'ตกลง'
          });
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
