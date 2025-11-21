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
    
    if (!['student', 'teacher', 'admin'].includes(role)) {
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
    if (role && !['student', 'teacher', 'admin'].includes(role)) {
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
    if (role && !['student', 'teacher', 'admin'].includes(role)) {
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
