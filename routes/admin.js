const express = require('express');
const router = express.Router();

// Middleware to check if user is admin or teacher
function requireAdminOrTeacher(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  const userRole = req.session.userData?.role;
  if (userRole !== 'admin' && userRole !== 'teacher') {
    return res.status(403).render('error', {
      title: 'ไม่มีสิทธิ์เข้าถึง',
      message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
      error: { status: 403 }
    });
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
        studentId: userData.studentId,
        prefix: userData.prefix,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        faculty: userData.faculty || 'ยังไม่ระบุ',
        major: userData.major || 'ยังไม่ระบุ',
        year: userData.year || 'ยังไม่ระบุ',
        role: userData.role || 'student',
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
router.put('/api/users/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { prefix, firstName, lastName, email, phone, age, birthdate, faculty, major, year, role } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็น' });
    }

    // Validate role
    if (role && !['student', 'teacher', 'admin', 'person'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
    }

    const db = req.app.get('db');
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

    await db.collection('users').doc(studentId).update(updateData);

    res.json({ success: true, message: 'อัพเดทข้อมูลสำเร็จ', data: updateData });
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

// Export to Google Sheets
router.post('/api/export-to-sheets', async (req, res) => {
  try {
    const { surveyId } = req.body;
    
    // TODO: Implement Google Sheets API integration
    // This requires setting up Google Sheets API credentials
    
    res.json({ 
      success: true, 
      message: 'กำลังพัฒนาฟีเจอร์นี้',
      note: 'ต้องตั้งค่า Google Sheets API ก่อน'
    });
  } catch (error) {
    console.error('Error exporting to sheets:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
