const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

// Configure Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // ตรวจสอบว่าเป็นอีเมล @nsru.ac.th เท่านั้น
    const email = profile.emails[0].value;
    if (!email.endsWith('@nsru.ac.th')) {
      return done(null, false, { message: 'กรุณาใช้อีเมลของมหาวิทยาลัย (@nsru.ac.th) เท่านั้น' });
    }

    return done(null, profile);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

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

// Google OAuth Routes
router.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    hd: 'nsru.ac.th' // จำกัดเฉพาะโดเมน nsru.ac.th
  })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/register?error=google' }),
  async (req, res) => {
    try {
      const db = req.app.get('db');
      const profile = req.user;
      const email = profile.emails[0].value;

      // ตรวจสอบอีเมลอีกครั้งเพื่อความปลอดภัย
      if (!email.endsWith('@nsru.ac.th')) {
        return res.redirect('/register?error=invalid_domain');
      }

      // ค้นหาผู้ใช้จากอีเมล (รองรับกรณีที่ doc id เป็นรหัสนักศึกษา)
      const existingByEmail = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingByEmail.empty) {
        const docSnap = existingByEmail.docs[0];
        const userData = docSnap.data();
        
        // ตรวจสอบว่าเป็นบัญชี Google OAuth อยู่แล้วหรือไม่
        if (userData.authProvider === 'google') {
          // Login สำเร็จสำหรับบัญชี Google OAuth
          req.session.userId = docSnap.id;
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
          return res.redirect('/survey/home');
        } else {
          // บัญชีที่ใช้ email/password อยู่แล้ว - ต้องถามยืนยันก่อนเปลี่ยนเป็น Google OAuth
          req.session.pendingGoogleMigration = {
            userId: docSnap.id,
            email: email,
            googleProfile: {
              id: profile.id,
              firstName: profile.name?.givenName || userData.firstName,
              lastName: profile.name?.familyName || userData.lastName
            },
            existingUserData: {
              studentId: userData.studentId,
              prefix: userData.prefix,
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: userData.phone,
              age: userData.age,
              birthdate: userData.birthdate,
              role: userData.role
            }
          };
          return res.redirect('/auth/confirm-google-migration');
        }
      }

      // ผู้ใช้ใหม่: เก็บข้อมูลพื้นฐานไว้ใน session ให้ไปกรอกโปรไฟล์พร้อมรหัสนักศึกษาเอง
      const firstName = profile.name?.givenName || '';
      const lastName = profile.name?.familyName || '';

      req.session.userId = null; // ยังไม่ผูกกับ studentId
      req.session.userData = {
        studentId: '',
        prefix: '',
        firstName,
        lastName,
        email,
        phone: '',
        age: 0,
        birthdate: '',
        role: 'student',
        authProvider: 'google',
        googleId: profile.id,
        profileComplete: false
      };
      req.session.needsProfileCompletion = true;

      console.log('Google OAuth new user session created for:', email);
      return res.redirect('/register/complete-profile');
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return res.redirect('/register?error=server');
    }
  }
);

// Complete Profile Page (for Google OAuth users)
router.get('/register/complete-profile', (req, res) => {
  if (!req.session.needsProfileCompletion || !req.session.userData) {
    return res.redirect('/register');
  }

  res.render('complete-profile', {
    title: 'กรอกข้อมูลเพิ่มเติม',
    userData: req.session.userData
  });
});

// Complete Profile POST
router.post('/register/complete-profile', async (req, res) => {
  // ต้องมีข้อมูลจาก Google OAuth ไว้ก่อน
  if (!req.session.userData || !req.session.needsProfileCompletion) {
    return res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });
  }

  const { studentId, prefix, phone, birthdate, age } = req.body;

  if (!studentId || String(studentId).trim() === '') {
    return res.status(400).json({ error: 'กรุณากรอกรหัสนักศึกษา' });
  }

  try {
    const db = req.app.get('db');

    // ตรวจสอบรหัสนักศึกษาว่าซ้ำหรือไม่
    const userRef = db.collection('users').doc(String(studentId).trim());
    const docSnap = await userRef.get();
    if (docSnap.exists) {
      return res.status(400).json({ error: 'รหัสนักศึกษานี้มีในระบบแล้ว' });
    }

    // สร้างผู้ใช้ใหม่ด้วยข้อมูลจาก session + แบบฟอร์ม
    const base = req.session.userData;
    const newUser = {
      studentId: String(studentId).trim(),
      prefix: prefix || '',
      firstName: base.firstName || '',
      lastName: base.lastName || '',
      email: base.email,
      phone: phone || '',
      birthdate: birthdate || '',
      age: parseInt(age) || 0,
      password: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: base.role || 'student',
      authProvider: 'google',
      googleId: base.googleId || '',
      profileComplete: true
    };

    await userRef.set(newUser);

    // อัปเดต session
    req.session.userId = newUser.studentId;
    req.session.userData = newUser;
    req.session.needsProfileCompletion = false;

    return res.json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      redirectUrl: '/survey/home'
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

// Confirm Google Migration Page
router.get('/auth/confirm-google-migration', (req, res) => {
  if (!req.session.pendingGoogleMigration) {
    return res.redirect('/login');
  }

  res.render('confirm-google-migration', {
    title: 'ยืนยันการเชื่อมต่อบัญชี Google',
    userData: req.session.pendingGoogleMigration.existingUserData,
    email: req.session.pendingGoogleMigration.email
  });
});

// Confirm Google Migration POST
router.post('/auth/confirm-google-migration', async (req, res) => {
  const { confirm } = req.body;

  if (!req.session.pendingGoogleMigration) {
    return res.status(400).json({ error: 'ไม่พบข้อมูลการยืนยัน' });
  }

  try {
    if (confirm === 'yes') {
      const db = req.app.get('db');
      const { userId, googleProfile, existingUserData } = req.session.pendingGoogleMigration;

      // อัปเดตบัญชีเดิมให้เป็น Google OAuth
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        authProvider: 'google',
        googleId: googleProfile.id,
        password: '', // ลบรหัสผ่านเดิม
        updatedAt: new Date().toISOString(),
        migratedToGoogleAt: new Date().toISOString()
      });

      // Login สำเร็จ
      req.session.userId = userId;
      req.session.userData = {
        studentId: existingUserData.studentId,
        prefix: existingUserData.prefix,
        firstName: existingUserData.firstName,
        lastName: existingUserData.lastName,
        email: req.session.pendingGoogleMigration.email,
        phone: existingUserData.phone,
        age: existingUserData.age,
        birthdate: existingUserData.birthdate,
        role: existingUserData.role
      };

      // ลบข้อมูลชั่วคราว
      delete req.session.pendingGoogleMigration;

      console.log('Google migration successful for user:', userId);
      return res.json({ success: true, redirectUrl: '/survey/home' });
    } else {
      // ผู้ใช้ไม่ยืนยัน - ยกเลิกและกลับไปหน้า login
      delete req.session.pendingGoogleMigration;
      return res.json({ success: false, redirectUrl: '/login' });
    }
  } catch (error) {
    console.error('Google migration error:', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อบัญชี' });
  }
});

module.exports = router;
