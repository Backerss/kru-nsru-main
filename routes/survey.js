const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Middleware to check if user is logged in
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Apply requireLogin middleware to all survey routes
router.use(requireLogin);

// Survey home page
router.get('/home', async (req, res) => {
  try {
    const userId = req.session.userId; // ดึง userId จาก session
    const userEmail = req.session.userEmail || req.session.userData?.email;
    const sessionData = req.session.userData;
    const db = req.app.get('db');

    // Get additional user data from Firestore using email
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('email', '==', userEmail).limit(1).get();

    let userData = sessionData;
    let userRole = 'student';
    
    if (!querySnapshot.empty) {
      const dbData = querySnapshot.docs[0].data();
      userRole = dbData.role || 'student';
      userData = {
        email: dbData.email,
        name: `${dbData.prefix || ''}${dbData.firstName} ${dbData.lastName}`,
        prefix: dbData.prefix,
        firstName: dbData.firstName,
        lastName: dbData.lastName,
        faculty: dbData.faculty || 'ยังไม่ระบุ',
        major: dbData.major || 'ยังไม่ระบุ',
        year: dbData.year || 'ยังไม่ระบุ'
      };
    }

    // Get survey completion stats (ใช้ userId จาก session)
    const responsesSnapshot = await db.collection('survey_responses')
      .where('userId', '==', userId)
      .get();
    
    const completedCount = responsesSnapshot.size;
    
    // Count total surveys
    const surveyDir = path.join(__dirname, '..', 'data', 'surveys');
    let totalSurveys = 0;
    if (fs.existsSync(surveyDir)) {
      const files = fs.readdirSync(surveyDir);
      totalSurveys = files.filter(f => f.endsWith('.json')).length;
    }

    // Compute today's survey response counts (across all users)
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const todaySnap = await db.collection('survey_responses')
        .where('submittedAt', '>=', startOfDay)
        .where('submittedAt', '<', startOfTomorrow)
        .get();

      const totalResponsesSnap = await db.collection('survey_responses').get();

      const responsesToday = todaySnap.size;
      const responsesTotal = totalResponsesSnap.size;

      res.render('survey/home', {
        title: 'หน้าหลัก',
        user: { ...userData, role: userRole },
        currentPage: 'home',
        stats: {
          completed: completedCount,
          total: totalSurveys,
          remaining: totalSurveys - completedCount,
          responsesToday,
          responsesTotal
        }
      });
    } catch (errStats) {
      console.error('Error computing response stats:', errStats);
      res.render('survey/home', {
        title: 'หน้าหลัก',
        user: { ...userData, role: userRole },
        currentPage: 'home',
        stats: {
          completed: completedCount,
          total: totalSurveys,
          remaining: totalSurveys - completedCount,
          responsesToday: 0,
          responsesTotal: 0
        }
      });
    }
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
});

// Questionnaire list page
router.get('/questionnaire', async (req, res) => {
  const surveys = [];
  const userId = req.session.userId;

  try {
    const db = req.app.get('db');
    
    // Get user's completed surveys
    const responsesSnapshot = await db.collection('survey_responses')
      .where('userId', '==', userId)
      .get();
    
    const completedSurveys = new Map();
    responsesSnapshot.forEach(doc => {
      const data = doc.data();
      completedSurveys.set(data.surveyId, {
        submittedAt: data.submittedAt,
        id: doc.id
      });
    });

    // Read all JSON files from data/surveys directory
    const surveyDir = path.join(__dirname, '..', 'data', 'surveys');

    if (fs.existsSync(surveyDir)) {
      const files = fs.readdirSync(surveyDir);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const surveyPath = path.join(surveyDir, file);
            const surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));

            // Add the survey ID from filename if not present
            if (!surveyData.id) {
              surveyData.id = file.replace('.json', '');
            }

            // Check if user completed this survey
            if (completedSurveys.has(surveyData.id)) {
              const completion = completedSurveys.get(surveyData.id);
              surveyData.status = 'completed';
              
              // Format date for display
              const date = new Date(completion.submittedAt);
              surveyData.completedDate = date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            } else {
              surveyData.status = 'available';
            }

            surveys.push(surveyData);
          } catch (error) {
            console.error(`Error loading survey ${file}:`, error);
          }
        }
      });
    }

    // Get user data for navigation
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    let userData = req.session.userData;
    let userRole = 'student';
    
    if (userDoc.exists) {
      const dbData = userDoc.data();
      userRole = dbData.role || 'student';
      userData = {
        ...userData,
        role: userRole
      };
    }

    res.render('survey/questionnaire', {
      title: 'แบบสอบถาม',
      surveys: surveys,
      user: userData,
      currentPage: 'questionnaire'
    });
  } catch (error) {
    console.error('Error reading surveys directory:', error);
    res.render('survey/questionnaire', {
      title: 'แบบสอบถาม',
      surveys: surveys,
      user: req.session.userData,
      currentPage: 'questionnaire'
    });
  }
});

// Settings page
router.get('/settings', async (req, res) => {
  try {
    const userId = req.session.userId;
    const db = req.app.get('db');
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    let userData = req.session.userData;
    let userRole = 'student';
    
    if (doc.exists) {
      const dbData = doc.data();
      userRole = dbData.role || 'student';
      userData = {
        studentId: dbData.studentId,
        name: `${dbData.prefix}${dbData.firstName} ${dbData.lastName}`,
        prefix: dbData.prefix,
        firstName: dbData.firstName,
        lastName: dbData.lastName,
        email: dbData.email,
        phone: dbData.phone,
        age: dbData.age,
        birthdate: dbData.birthdate,
        faculty: dbData.faculty || 'ยังไม่ระบุ',
        major: dbData.major || 'ยังไม่ระบุ',
        year: dbData.year || 'ยังไม่ระบุ',
        authProvider: dbData.authProvider || 'email' // เพิ่มฟิลด์ authProvider
      };
    }

    res.render('survey/settings', {
      title: 'ตั้งค่า',
      user: { ...userData, role: userRole },
      currentPage: 'settings'
    });
  } catch (error) {
    console.error('Error loading settings page:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
});

// Survey form page
router.get('/form/:id', async (req, res) => {
  const surveyId = req.params.id;
  const userId = req.session.userId;

  try {
    // Check if user already submitted this survey
    const db = req.app.get('db');
    const existingResponse = await db.collection('survey_responses')
      .where('surveyId', '==', surveyId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingResponse.empty) {
      // User already submitted, redirect with message
      req.session.surveyMessage = {
        type: 'warning',
        text: 'คุณได้ทำแบบสอบถามนี้ไปแล้ว'
      };
      return res.redirect('/survey/questionnaire');
    }

    // Try to load survey data from JSON file
    const surveyPath = path.join(__dirname, '..', 'data', 'surveys', `${surveyId}.json`);

    if (fs.existsSync(surveyPath)) {
      const surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));

      // Get user data for the form
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      let userData = req.session.userData;
      let userRole = 'student';
      
      if (userDoc.exists) {
        const dbData = userDoc.data();
        userRole = dbData.role || 'student';
        userData = {
          studentId: dbData.studentId,
          name: `${dbData.prefix}${dbData.firstName} ${dbData.lastName}`,
          prefix: dbData.prefix,
          firstName: dbData.firstName,
          lastName: dbData.lastName,
          email: dbData.email,
          phone: dbData.phone,
          age: dbData.age,
          birthdate: dbData.birthdate,
          faculty: dbData.faculty || 'ยังไม่ระบุ',
          major: dbData.major || 'ยังไม่ระบุ',
          year: dbData.year || 'ยังไม่ระบุ',
          role: userRole
        };
      }

      res.render('survey/form', {
        title: surveyData.title,
        survey: surveyData,
        user: userData,
        currentPage: 'questionnaire'
      });
    } else {
      res.status(404).send('ไม่พบแบบสอบถามที่ต้องการ');
    }
  } catch (error) {
    console.error('Error loading survey:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดแบบสอบถาม');
  }
});

// Submit survey
router.post('/submit/:id', async (req, res) => {
  const surveyId = req.params.id;
  const answers = req.body;
  const userId = req.session.userId;

  try {
    const db = req.app.get('db');
    
    // Check if user already submitted this survey
    const existingResponse = await db.collection('survey_responses')
      .where('surveyId', '==', surveyId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingResponse.empty) {
      return res.status(400).json({
        success: false,
        message: 'คุณได้ทำแบบสอบถามนี้ไปแล้ว'
      });
    }

    // Get user demographic data for analysis
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    let userDemographics = {};
    if (userDoc.exists) {
      const userData = userDoc.data();
      userDemographics = {
        faculty: userData.faculty || 'ไม่ระบุ',
        major: userData.major || 'ไม่ระบุ',
        year: userData.year || 'ไม่ระบุ',
        role: userData.role || 'student'
      };
    }
    
    // Save survey response to Firestore with demographic data
    const responseData = {
      surveyId,
      userId,
      answers,
      demographics: userDemographics,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('survey_responses').add(responseData);

    console.log('Survey submission successful:', { 
      surveyId, 
      userId, 
      questionCount: Object.keys(answers).length,
      timestamp: responseData.submittedAt 
    });

    // Push to Google Sheets (async, don't block response)
    const googleSheets = require('../utils/googleSheets');
    if (googleSheets.isConfigured()) {
      const userData = userDoc.exists ? userDoc.data() : {};
      googleSheets.appendSurveyResponse(surveyId, responseData, userData)
        .catch(err => console.error('Google Sheets append error:', err.message));
    }

    res.json({
      success: true,
      message: 'ส่งแบบสอบถามสำเร็จ'
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งแบบสอบถาม'
    });
  }
});

// Update personal info
router.post('/update-personal-info', async (req, res) => {
  const { firstName, lastName, faculty, major, year } = req.body;
  const userId = req.session.userId;

  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    });
  }

  try {
    const db = req.app.get('db');
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    const currentData = doc.data();
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      updatedAt: new Date().toISOString()
    };

    // Only update academic fields if they are currently "ยังไม่ระบุ"
    if (faculty && (!currentData.faculty || currentData.faculty === 'ยังไม่ระบุ')) {
      if (faculty.trim() && faculty.trim() !== 'ยังไม่ระบุ') {
        updateData.faculty = faculty.trim();
      }
    }

    if (major && (!currentData.major || currentData.major === 'ยังไม่ระบุ')) {
      if (major.trim() && major.trim() !== 'ยังไม่ระบุ') {
        updateData.major = major.trim();
      }
    }

    if (year && (!currentData.year || currentData.year === 'ยังไม่ระบุ')) {
      if (year !== 'ยังไม่ระบุ') {
        updateData.year = year;
      }
    }

    // Update user data in Firestore
    await userRef.update(updateData);

    // Update session data
    req.session.userData.firstName = updateData.firstName;
    req.session.userData.lastName = updateData.lastName;
    
    if (updateData.faculty) {
      req.session.userData.faculty = updateData.faculty;
    }
    if (updateData.major) {
      req.session.userData.major = updateData.major;
    }
    if (updateData.year) {
      req.session.userData.year = updateData.year;
    }

    console.log('Personal info updated:', { userId, updateData });

    res.json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      data: updateData
    });
  } catch (error) {
    console.error('Error updating personal info:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    });
  }

  try {
    const bcrypt = require('bcrypt');
    const db = req.app.get('db');
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    const userData = doc.data();

    // Check if user has a password (Google OAuth users don't have passwords)
    if (!userData.password || userData.password === '') {
      return res.status(400).json({
        success: false,
        message: 'บัญชีนี้ใช้ Google OAuth ไม่สามารถเปลี่ยนรหัสผ่านได้'
      });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, userData.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in Firestore
    await userRef.update({
      password: hashedPassword,
      passwordUpdatedAt: new Date().toISOString()
    });

    console.log('Password changed:', { userId, timestamp: new Date().toISOString() });

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    });
  }
});

// Disconnect Google OAuth and set password
router.post('/disconnect-google', async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.session.userId;

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุรหัสผ่านใหม่'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    });
  }

  try {
    const bcrypt = require('bcrypt');
    const db = req.app.get('db');
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    const userData = doc.data();

    // Check if user is using Google OAuth
    if (userData.authProvider !== 'google') {
      return res.status(400).json({
        success: false,
        message: 'บัญชีนี้ไม่ได้ใช้ Google OAuth'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user data: remove Google OAuth, add password
    await userRef.update({
      authProvider: 'email',
      password: hashedPassword,
      googleId: null,
      passwordCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('Google OAuth disconnected and password set:', { 
      userId, 
      timestamp: new Date().toISOString() 
    });

    res.json({
      success: true,
      message: 'ยกเลิกการเชื่อมต่อ Google และตั้งรหัสผ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ'
    });
  }
});

// Update major (one-time only)
router.post('/update-major', async (req, res) => {
  try {
    const userEmail = req.session.userEmail || req.session.userData?.email;
    const { major, faculty, year } = req.body;

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบ'
      });
    }

    if (!major) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุสาขาวิชา'
      });
    }

    const db = req.app.get('db');
    
    // Query users collection to find document with this email
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('email', '==', userEmail).limit(1).get();
    
    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้ที่มีอีเมล: ' + userEmail
      });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Check if major is already set
    if (userData.major && userData.major !== 'ยังไม่ระบุ') {
      return res.status(400).json({
        success: false,
        message: 'คุณได้เลือกสาขาวิชาไปแล้ว ไม่สามารถแก้ไขได้อีก'
      });
    }

    // Valid majors list
    const validMajors = [
      'การศึกษาปฐมวัย',
      'วิทยาศาสตร์ทั่วไป',
      'คณิตศาสตร์',
      'ภาษาอังกฤษ',
      'ภาษาไทย',
      'สังคมศึกษา',
      'พลศึกษา',
      'เทคโนโลยีดิจิทัลเพื่อการศึกษา',
      'การประถมศึกษา'
    ];

    if (!validMajors.includes(major)) {
      return res.status(400).json({
        success: false,
        message: 'สาขาวิชาไม่ถูกต้อง'
      });
    }

    // Update user data
    await userDoc.ref.update({
      major: major,
      faculty: faculty || 'คณะครุศาสตร์',
      year: year || '4',
      updatedAt: new Date().toISOString()
    });

    // Update session
    req.session.userData = {
      ...req.session.userData,
      major: major,
      faculty: faculty || 'คณะครุศาสตร์',
      year: year || '4'
    };

    console.log('Major updated successfully:', {
      userEmail,
      major,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'บันทึกสาขาวิชาสำเร็จ'
    });
  } catch (error) {
    console.error('Error updating major:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  }
});

module.exports = router;
