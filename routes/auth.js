const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// Register page
router.get('/register', (req, res) => {
  res.render('register', {
    title: 'สมัครสมาชิก'
  });
});

// Register POST
router.post('/register', async (req, res) => {
  const {
    studentId,
    prefix,
    firstName,
    lastName,
    birthdate,
    age,
    email,
    phone,
    password,
    confirmPassword,
    agreePolicy
  } = req.body;

  // Basic validation
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'รหัสผ่านไม่ตรงกัน' });
  }

  if (!agreePolicy) {
    return res.status(400).json({ error: 'กรุณายอมรับนโยบายและเงื่อนไขการใช้งาน' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  // Phone validation (basic Thai phone number)
  const phoneRegex = /^[0-9]{9,10}$/;
  if (!phoneRegex.test(phone.replace(/[-\s]/g, ''))) {
    return res.status(400).json({ error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' });
  }

  try {
    const db = req.app.get('db');

    // Check if user exists (by studentId)
    const userRef = db.collection('users').doc(studentId);
    const doc = await userRef.get();

    if (doc.exists) {
      return res.status(400).json({ error: 'รหัสนักศึกษานี้มีในระบบแล้ว' });
    }

    // Check if email exists
    const emailQuery = await db.collection('users').where('email', '==', email).get();
    if (!emailQuery.empty) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to Firestore
    const userData = {
      studentId,
      prefix,
      firstName,
      lastName,
      birthdate,
      age: parseInt(age) || 0,
      email,
      phone,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      role: 'student'
    };

    await userRef.set(userData);

    console.log('New registration:', studentId);

    res.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จแล้ว!',
      redirectUrl: '/login'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + error.message });
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'เข้าสู่ระบบ'
  });
});

// Login POST
router.post('/login', async (req, res) => {
  const { studentId, password, rememberMe } = req.body;

  // Basic validation
  if (!studentId || !password) {
    return res.status(400).json({
      error: 'กรุณากรอกรหัสนักศึกษาและรหัสผ่าน'
    });
  }

  try {
    const db = req.app.get('db');

    // Get user from Firestore
    const userRef = db.collection('users').doc(studentId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(401).json({
        error: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    const userData = doc.data();

    // Verify password
    const match = await bcrypt.compare(password, userData.password);

    if (!match) {
      return res.status(401).json({
        error: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Login successful - Store user data in session
    req.session.userId = studentId;
    req.session.userData = {
      studentId: userData.studentId,
      prefix: userData.prefix,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      age: userData.age,
      birthdate: userData.birthdate,
      role: userData.role
    };

    // Update remember me cookie if checked
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    console.log('User logged in:', { studentId, rememberMe, timestamp: new Date().toISOString() });

    res.json({
      success: true,
      message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${userData.firstName} ${userData.lastName}`,
      redirectUrl: '/survey/home',
      user: {
        studentId: userData.studentId,
        name: `${userData.prefix}${userData.firstName} ${userData.lastName}`
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
