const express = require('express');
const router = express.Router();

// Middleware to check if user is admin or teacher
function requireAdminOrTeacher(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  const userRole = req.session.userData?.role;
  if (userRole !== 'admin' && userRole !== 'teacher') {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>ไม่มีสิทธิ์เข้าถึง</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container">
          <div class="row justify-content-center align-items-center" style="min-height: 100vh;">
            <div class="col-md-6">
              <div class="card shadow">
                <div class="card-body text-center p-5">
                  <h1 class="display-1 text-danger">403</h1>
                  <h2 class="mb-3">ไม่มีสิทธิ์เข้าถึง</h2>
                  <p class="text-muted mb-4">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                  <a href="/survey/home" class="btn btn-primary">กลับหน้าหลัก</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  
  next();
}

// Apply middleware to all admin routes
router.use(requireAdminOrTeacher);

// Admin Dashboard
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        studentId: userData.studentId,
        prefix: userData.prefix || '',
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: `${userData.prefix || ''}${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        phone: userData.phone || '',
        age: userData.age || '',
        birthdate: userData.birthdate || '',
        faculty: userData.faculty || 'ยังไม่ระบุ',
        major: userData.major || 'ยังไม่ระบุ',
        year: userData.year || 'ยังไม่ระบุ',
        role: userData.role || 'student',
        authProvider: userData.authProvider || 'email',
        createdAt: userData.createdAt
      });
    });

    // Get all survey responses
    const responsesSnapshot = await db.collection('survey_responses').get();
    const responses = [];
    responsesSnapshot.forEach(doc => {
      responses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Group responses by survey
    const surveyStats = {};
    responses.forEach(response => {
      if (!surveyStats[response.surveyId]) {
        surveyStats[response.surveyId] = {
          count: 0,
          responses: []
        };
      }
      surveyStats[response.surveyId].count++;
      surveyStats[response.surveyId].responses.push(response);
    });

    res.render('admin/dashboard', {
      title: 'แผงควบคุม',
      user: req.session.userData,
      users: users,
      surveyStats: surveyStats,
      totalUsers: users.length,
      totalResponses: responses.length,
      currentPage: 'admin'
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
});

// Get users API
router.get('/api/users', async (req, res) => {
  try {
    const db = req.app.get('db');
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        studentId: userData.studentId,
        prefix: userData.prefix,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        age: userData.age,
        birthdate: userData.birthdate,
        faculty: userData.faculty || 'ยังไม่ระบุ',
        major: userData.major || 'ยังไม่ระบุ',
        year: userData.year || 'ยังไม่ระบุ',
        role: userData.role || 'student',
        authProvider: userData.authProvider || 'email',
        createdAt: userData.createdAt
      });
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Get survey responses API
router.get('/api/survey-responses', async (req, res) => {
  try {
    const db = req.app.get('db');
    const responsesSnapshot = await db.collection('survey_responses').get();
    const responses = [];
    
    responsesSnapshot.forEach(doc => {
      responses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ success: true, responses });
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Update user role
router.post('/api/users/:studentId/role', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { role } = req.body;
    
    if (!['student', 'teacher', 'admin', 'person'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
    }

    const db = req.app.get('db');
    await db.collection('users').doc(studentId).update({
      role: role,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'อัพเดท Role สำเร็จ' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Update user data
router.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { studentId: newStudentIdRaw, prefix, firstName, lastName, email, phone, age, birthdate, faculty, major, year, role } = req.body;
    const newStudentId = newStudentIdRaw ? String(newStudentIdRaw).trim() : '';
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็น' });
    }

    // Validate role
    if (role && !['student', 'teacher', 'admin', 'person'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
    }

    const db = req.app.get('db');

    // Build the base update data (without changing doc id)
    const updateData = {
      prefix: prefix || '',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone || '',
      age: age || '',
      birthdate: birthdate || '',
      faculty: faculty || 'ยังไม่ระบุ',
      major: major || 'ยังไม่ระบุ',
      year: year || 'ยังไม่ระบุ',
      role: role || 'student',
      updatedAt: new Date().toISOString()
    };

    // Fetch current user to detect studentId change
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }

    const before = userDoc.data();

    // Optional uniqueness check for studentId
    if (newStudentId && newStudentId !== before.studentId) {
      const dupSnap = await db.collection('users').where('studentId', '==', newStudentId).get();
      const hasOther = dupSnap.docs.some(d => d.id !== uid);
      if (hasOther) {
        return res.status(400).json({ success: false, message: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว' });
      }
    }

    // Apply update (including new studentId if provided)
    const finalData = { ...updateData };
    if (newStudentId) finalData.studentId = newStudentId;
    await userRef.update(finalData);

    // If studentId changed, cascade to survey_responses.userId
    if (newStudentId && newStudentId !== before.studentId) {
      const responsesSnapshot = await db.collection('survey_responses').where('userId', '==', before.studentId).get();
      if (!responsesSnapshot.empty) {
        const docs = [];
        responsesSnapshot.forEach(d => docs.push(d));
        const chunkSize = 450;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const batch = db.batch();
          docs.slice(i, i + chunkSize).forEach(d => {
            batch.update(db.collection('survey_responses').doc(d.id), { userId: newStudentId });
          });
          await batch.commit();
        }
      }
    }

    res.json({ success: true, message: 'อัพเดทข้อมูลสำเร็จ', data: { ...before, ...finalData, uid } });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Create new user
router.post('/api/users', async (req, res) => {
  try {
    const { studentId, prefix, firstName, lastName, email, password, phone, age, birthdate, faculty, major, year, role } = req.body;
    
    // Validate required fields
    if (!studentId || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็น' });
    }

    // Validate role
    if (role && !['student', 'teacher', 'admin', 'person'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
    }

    const db = req.app.get('db');
    
    // Check if studentId already exists
    const existingUser = await db.collection('users').doc(studentId).get();
    if (existingUser.exists) {
      return res.status(400).json({ success: false, message: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว' });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      studentId: studentId.trim(),
      prefix: prefix || '',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password: hashedPassword,
      phone: phone || '',
      age: age || '',
      birthdate: birthdate || '',
      faculty: faculty || 'ยังไม่ระบุ',
      major: major || 'ยังไม่ระบุ',
      year: year || 'ยังไม่ระบุ',
      role: role || 'student',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(studentId).set(userData);

    res.json({ success: true, message: 'เพิ่มผู้ใช้สำเร็จ', data: userData });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Delete user
router.delete('/api/users/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const db = req.app.get('db');
    
    await db.collection('users').doc(studentId).delete();
    
    res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Get analytics data for advanced visualizations
router.get('/api/analytics', async (req, res) => {
  try {
    const db = req.app.get('db');
    const fs = require('fs');
    const path = require('path');
    
    // Get all survey responses
    const responsesSnapshot = await db.collection('survey_responses').get();
    const responses = [];
    responsesSnapshot.forEach(doc => {
      responses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Get users for demographic analysis
    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersMap[userData.studentId] = userData;
    });

    // Load survey definitions
    const surveyFiles = {
      'intelligent-tk': 'intelligent-tk.json',
      'intelligent-tpk': 'intelligent-tpk.json',
      'intelligent-tck': 'intelligent-tck.json',
      'intelligent-tpack': 'intelligent-tpack.json',
      'ethical-knowledge': 'ethical-knowledge.json'
    };

    const surveyDefinitions = {};
    for (const [key, filename] of Object.entries(surveyFiles)) {
      const filePath = path.join(__dirname, '..', 'data', 'surveys', filename);
      surveyDefinitions[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    // 1. Radar Chart Data - Mean scores per dimension
    const dimensionScores = {
      'intelligent-tk': { total: 0, count: 0, name: 'TK (เทคโนโลยี)' },
      'intelligent-tpk': { total: 0, count: 0, name: 'TPK (เทคโนโลยี+การสอน)' },
      'intelligent-tck': { total: 0, count: 0, name: 'TCK (เทคโนโลยี+เนื้อหา)' },
      'intelligent-tpack': { total: 0, count: 0, name: 'TPACK (บูรณาการ)' },
      'ethical-knowledge': { total: 0, count: 0, name: 'จริยธรรม' }
    };

    responses.forEach(response => {
      if (dimensionScores[response.surveyId]) {
        const answers = response.answers || {};
        let sum = 0;
        let itemCount = 0;
        
        Object.values(answers).forEach(value => {
          if (typeof value === 'number' && value >= 1 && value <= 5) {
            sum += value;
            itemCount++;
          }
        });
        
        if (itemCount > 0) {
          dimensionScores[response.surveyId].total += sum;
          dimensionScores[response.surveyId].count += itemCount;
        }
      }
    });

    const radarData = {
      labels: [],
      scores: [],
      maxScore: 5
    };

    Object.keys(dimensionScores).forEach(key => {
      const dim = dimensionScores[key];
      radarData.labels.push(dim.name);
      radarData.scores.push(dim.count > 0 ? (dim.total / dim.count).toFixed(2) : 0);
    });

    // 2. Top & Bottom Skills - Item-level analysis
    const allItems = [];
    
    responses.forEach(response => {
      const surveyDef = surveyDefinitions[response.surveyId];
      if (!surveyDef) return;
      
      const answers = response.answers || {};
      surveyDef.questions.forEach(q => {
        if (q.type === 'rating') {
          const answer = answers[`question_${q.id}`];
          if (typeof answer === 'number' && answer >= 1 && answer <= 5) {
            let item = allItems.find(i => i.surveyId === response.surveyId && i.questionId === q.id);
            if (!item) {
              item = {
                surveyId: response.surveyId,
                surveyName: surveyDef.title,
                questionId: q.id,
                question: q.question,
                category: q.category,
                total: 0,
                count: 0
              };
              allItems.push(item);
            }
            item.total += answer;
            item.count++;
          }
        }
      });
    });

    // Calculate means and sort
    allItems.forEach(item => {
      item.mean = item.count > 0 ? (item.total / item.count) : 0;
    });

    const sortedItems = allItems.sort((a, b) => b.mean - a.mean);
    const topSkills = sortedItems.slice(0, 5).map(item => ({
      question: item.question,
      category: item.category,
      mean: item.mean.toFixed(2),
      surveyName: item.surveyName,
      responseCount: item.count
    }));

    const bottomSkills = sortedItems.slice(-5).reverse().map(item => ({
      question: item.question,
      category: item.category,
      mean: item.mean.toFixed(2),
      surveyName: item.surveyName,
      responseCount: item.count
    }));

    // 3. Comparative Analysis by Faculty and Year
    const comparativeData = {
      byFaculty: {},
      byYear: {}
    };

    responses.forEach(response => {
      const user = usersMap[response.userId];
      if (!user) return;

      const faculty = user.faculty || 'ไม่ระบุ';
      const year = user.year || 'ไม่ระบุ';
      const answers = response.answers || {};

      let sum = 0;
      let count = 0;
      Object.values(answers).forEach(value => {
        if (typeof value === 'number' && value >= 1 && value <= 5) {
          sum += value;
          count++;
        }
      });

      if (count > 0) {
        const mean = sum / count;
        
        // By Faculty
        if (!comparativeData.byFaculty[faculty]) {
          comparativeData.byFaculty[faculty] = { total: 0, count: 0, responses: 0 };
        }
        comparativeData.byFaculty[faculty].total += mean;
        comparativeData.byFaculty[faculty].count++;
        comparativeData.byFaculty[faculty].responses++;

        // By Year
        if (!comparativeData.byYear[year]) {
          comparativeData.byYear[year] = { total: 0, count: 0, responses: 0 };
        }
        comparativeData.byYear[year].total += mean;
        comparativeData.byYear[year].count++;
        comparativeData.byYear[year].responses++;
      }
    });

    // Calculate means
    Object.keys(comparativeData.byFaculty).forEach(key => {
      const data = comparativeData.byFaculty[key];
      data.mean = (data.total / data.count).toFixed(2);
    });

    Object.keys(comparativeData.byYear).forEach(key => {
      const data = comparativeData.byYear[key];
      data.mean = (data.total / data.count).toFixed(2);
    });

    // 4. Performance Gauge - Overall readiness
    let grandTotal = 0;
    let grandCount = 0;

    responses.forEach(response => {
      const answers = response.answers || {};
      Object.values(answers).forEach(value => {
        if (typeof value === 'number' && value >= 1 && value <= 5) {
          grandTotal += value;
          grandCount++;
        }
      });
    });

    const grandMean = grandCount > 0 ? (grandTotal / grandCount) : 0;
    let performanceLevel = 'Novice';
    let performanceColor = '#dc3545'; // red
    let performanceLabel = 'ต้องปูพื้นฐานด่วน';

    if (grandMean >= 3.51) {
      performanceLevel = 'Advanced';
      performanceColor = '#28a745'; // green
      performanceLabel = 'พร้อมสำหรับการสอนจริง';
    } else if (grandMean >= 2.51) {
      performanceLevel = 'Intermediate';
      performanceColor = '#ffc107'; // yellow
      performanceLabel = 'พอใช้ได้ แต่ต้องฝึกเพิ่ม';
    }

    const performanceGauge = {
      score: grandMean.toFixed(2),
      level: performanceLevel,
      color: performanceColor,
      label: performanceLabel,
      maxScore: 5
    };

    // 5. Trend Data (placeholder for future pre/post test)
    const trendData = {
      enabled: false,
      message: 'ยังไม่มีข้อมูล Pre-test/Post-test',
      dates: [],
      scores: []
    };

    res.json({
      success: true,
      analytics: {
        radarChart: radarData,
        topSkills: topSkills,
        bottomSkills: bottomSkills,
        comparative: comparativeData,
        performanceGauge: performanceGauge,
        trendData: trendData,
        meta: {
          totalResponses: responses.length,
          totalUsers: Object.keys(usersMap).length,
          lastUpdated: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// Export to Excel (XLSX)
router.get('/export/xlsx', async (req, res) => {
  try {
    const { surveyId } = req.query; // 'all' or specific survey id
    const db = req.app.get('db');
    const ExcelJS = require('exceljs');
    const fs = require('fs');
    const path = require('path');

    // Get survey definitions
    const surveyFiles = {
      'intelligent-tk': 'intelligent-tk.json',
      'intelligent-tpk': 'intelligent-tpk.json',
      'intelligent-tck': 'intelligent-tck.json',
      'intelligent-tpack': 'intelligent-tpack.json',
      'ethical-knowledge': 'ethical-knowledge.json'
    };

    const surveyDefinitions = {};
    for (const [key, filename] of Object.entries(surveyFiles)) {
      const filePath = path.join(__dirname, '..', 'data', 'surveys', filename);
      surveyDefinitions[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    // Get all responses
    const responsesSnapshot = await db.collection('survey_responses').get();
    const allResponses = [];
    responsesSnapshot.forEach(doc => {
      allResponses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Get users map
    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersMap[userData.studentId] = userData;
    });

    // Filter responses by surveyId if specified
    let responses = allResponses;
    if (surveyId && surveyId !== 'all') {
      responses = allResponses.filter(r => r.surveyId === surveyId);
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KRU-NSRU Survey System';
    workbook.created = new Date();

    // Determine which surveys to export
    const surveysToExport = surveyId && surveyId !== 'all' 
      ? [surveyId] 
      : Object.keys(surveyFiles);

    // Create a sheet for each survey
    surveysToExport.forEach(sId => {
      const surveyDef = surveyDefinitions[sId];
      if (!surveyDef) return;

      const surveyResponses = responses.filter(r => r.surveyId === sId);
      if (surveyResponses.length === 0) return;

      const worksheet = workbook.addWorksheet(surveyDef.title.substring(0, 30)); // Excel sheet name limit

      // Build header row
      const headers = [
        'Timestamp',
        'รหัสนักศึกษา',
        'ชื่อ-นามสกุล',
        'อีเมล',
        'คณะ',
        'สาขา',
        'ชั้นปี',
        'Role'
      ];

      // Add question columns
      surveyDef.questions.forEach(q => {
        const colName = q.type === 'rating' 
          ? `Q${q.id}: ${q.question.substring(0, 100)}` 
          : `Q${q.id} (Text): ${q.question.substring(0, 80)}`;
        headers.push(colName);
      });

      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 30;

      // Add data rows
      surveyResponses.forEach(response => {
        const user = usersMap[response.userId] || {};
        const rowData = [
          response.submittedAt || '',
          response.userId || '',
          `${user.prefix || ''}${user.firstName || ''} ${user.lastName || ''}`.trim(),
          user.email || '',
          user.faculty || '',
          user.major || '',
          user.year || '',
          user.role || 'student'
        ];

        // Add answers
        const answers = response.answers || {};
        surveyDef.questions.forEach(q => {
          const answerKey = `question_${q.id}`;
          const answer = answers[answerKey];
          
          if (q.type === 'rating') {
            rowData.push(typeof answer === 'number' ? answer : '');
          } else {
            rowData.push(answer || '');
          }
        });

        worksheet.addRow(rowData);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        if (index < 8) {
          column.width = 20;
        } else {
          column.width = 40;
        }
      });

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = surveyId && surveyId !== 'all'
      ? `kru-nsru-export-${surveyId}-${timestamp}.xlsx`
      : `kru-nsru-export-all-${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล', error: error.message });
  }
});

// Test Google Sheets connection
router.get('/api/sheets/test', async (req, res) => {
  try {
    // Force reload to get fresh env
    delete require.cache[require.resolve('../utils/googleSheets')];
    const googleSheets = require('../utils/googleSheets');
    
    console.log('=== Google Sheets Test ===');
    console.log('Environment check:');
    console.log('  GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? 'Set ✅' : 'Missing ❌');
    
    const result = await googleSheets.testConnection();
    console.log('Test result:', result);
    console.log('==========================');
    
    res.json(result);
  } catch (error) {
    console.error('Error testing Google Sheets:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: error.stack 
    });
  }
});

// Create sheets for all surveys
router.post('/api/sheets/create-all', async (req, res) => {
  try {
    const googleSheets = require('../utils/googleSheets');
    
    // Check if sheets already have data
    const dataCheck = await googleSheets.checkSheetsData();
    
    if (dataCheck.success && dataCheck.hasAnyData) {
      // Sheets already have data
      return res.json({ 
        success: true,
        alreadyExists: true,
        message: 'แผ่นงานมีข้อมูลอยู่แล้ว',
        sheets: dataCheck.sheets
      });
    }
    
    // Create sheets
    const success = await googleSheets.createAllSheets();
    
    if (success) {
      res.json({ 
        success: true,
        alreadyExists: false,
        message: 'สร้างแผ่นงานสำเร็จ' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'ไม่สามารถสร้างแผ่นงานได้' 
      });
    }
  } catch (error) {
    console.error('Error creating sheets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export to Google Sheets (legacy - now automatic on submit)
router.post('/api/export-to-sheets', async (req, res) => {
  try {
    const { surveyId } = req.body;
    const googleSheets = require('../utils/googleSheets');
    
    if (!googleSheets.isConfigured()) {
      return res.json({ 
        success: false, 
        message: 'Google Sheets ยังไม่ได้ตั้งค่า',
        note: 'กรุณาตั้งค่า GOOGLE_SHEETS_SPREADSHEET_ID ใน environment variables'
      });
    }

    // Check if sheets have data
    const dataCheck = await googleSheets.checkSheetsData();
    
    if (dataCheck.success && dataCheck.hasAnyData) {
      const testResult = await googleSheets.testConnection();
      return res.json({ 
        success: true,
        alreadyExists: true,
        message: 'แผ่นงานมีข้อมูลอยู่แล้ว - ระบบส่งข้อมูลอัตโนมัติเมื่อมีการตอบแบบสอบถาม',
        spreadsheet: testResult.spreadsheetTitle,
        url: testResult.spreadsheetUrl
      });
    }

    // Test connection
    const testResult = await googleSheets.testConnection();
    
    if (testResult.success) {
      res.json({ 
        success: true,
        alreadyExists: false,
        message: 'Google Sheets พร้อมใช้งาน - ระบบจะส่งข้อมูลอัตโนมัติเมื่อมีการตอบแบบสอบถาม',
        spreadsheet: testResult.spreadsheetTitle,
        url: testResult.spreadsheetUrl
      });
    } else {
      res.json({
        success: false,
        message: 'ไม่สามารถเชื่อมต่อ Google Sheets ได้',
        error: testResult.message
      });
    }
  } catch (error) {
    console.error('Error with Google Sheets:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

// Disconnect Google OAuth and send random password
router.post('/api/users/:studentId/disconnect-google', async (req, res) => {
  try {
    const { studentId } = req.params;
    const db = req.app.get('db');
    const bcrypt = require('bcrypt');
    
    // Get user data
    const userRef = db.collection('users').doc(studentId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }
    
    const userData = userDoc.data();
    
    // Check if user is using Google OAuth
    if (userData.authProvider !== 'google') {
      return res.status(400).json({ 
        success: false, 
        message: 'บัญชีนี้ไม่ได้ใช้ Google OAuth' 
      });
    }
    
    // Generate random 8-character password (letters + numbers)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let randomPassword = '';
    for (let i = 0; i < 8; i++) {
      randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    
    // Update user: remove Google OAuth, add password
    await userRef.update({
      authProvider: 'email',
      password: hashedPassword,
      googleId: null,
      passwordResetAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Send email with new password
    const emailService = require('../utils/emailService');
    try {
      await emailService.sendPasswordResetEmail(userData.email, {
        name: `${userData.prefix}${userData.firstName} ${userData.lastName}`,
        studentId: userData.studentId,
        newPassword: randomPassword
      });
      
      console.log('Google OAuth disconnected and password sent:', { 
        studentId, 
        email: userData.email,
        timestamp: new Date().toISOString() 
      });
      
      res.json({ 
        success: true, 
        message: 'ยกเลิกการเชื่อมต่อ Google และส่งรหัสผ่านใหม่ไปยังอีเมลเรียบร้อยแล้ว',
        email: userData.email
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Even if email fails, the disconnection was successful
      res.json({ 
        success: true, 
        message: 'ยกเลิกการเชื่อมต่อ Google สำเร็จ แต่ไม่สามารถส่งอีเมลได้',
        warning: 'กรุณาแจ้งรหัสผ่านใหม่ให้ผู้ใช้ด้วยตนเอง',
        temporaryPassword: randomPassword
      });
    }
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
