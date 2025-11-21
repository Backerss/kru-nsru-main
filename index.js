const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const session = require('express-session');

// Initialize Firebase
try {
  const serviceAccount = require('./kru-nsru-firebase.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error.message);
}

const db = admin.firestore();

const app = express();
const port = process.env.PORT || 3000;

// Simple in-memory OTP store: { [email]: { otp: '123456', expiresAt: 0 } }
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Stub email sender - replace with real email sending in production
function sendOtpEmail(toEmail, otp) {
  console.log(`[OTP SEND] To: ${toEmail} | OTP: ${otp} | (This is a stub - integrate real email service)`);
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: 'kru-nsru-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware to check if user is logged in
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

app.get('/', (req, res) => {
  res.render('login', {
    title: 'เข้าสู่ระบบ'
  });
});

// Register routes
app.get('/register', (req, res) => {
  res.render('register', {
    title: 'สมัครสมาชิก'
  });
});

// Login routes
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'เข้าสู่ระบบ'
  });
});

app.post('/login', async (req, res) => {
  const { studentId, password, rememberMe } = req.body;

  // Basic validation
  if (!studentId || !password) {
    return res.status(400).json({
      error: 'กรุณากรอกรหัสนักศึกษาและรหัสผ่าน'
    });
  }

  try {
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

app.post('/register', async (req, res) => {
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

    // Send success response
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


app.get('/forgot-password/request-email', (req, res) => {
  res.render('forgot-password/request-email', {
    title: 'ลืมรหัสผ่าน - ขอรหัสยืนยัน'
  });
});

app.get('/forgot-password/verify-otp', (req, res) => {
  res.render('forgot-password/verify-otp', {
    title: 'ลืมรหัสผ่าน - ยืนยันรหัส OTP'
  });
});

app.get('/forgot-password/reset-password', (req, res) => {
  res.render('forgot-password/reset-password', {
    title: 'ลืมรหัสผ่าน - ตั้งรหัสผ่านใหม่'
  });
});



// Forgot-password endpoints
// POST /forgot-password/send-otp
app.post('/forgot-password/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'ต้องระบุอีเมล' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  // Generate and store OTP (valid 5 minutes)
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore[email] = { otp, expiresAt };

  // Stub: send email (console)
  sendOtpEmail(email, otp);

  return res.json({ success: true, message: 'ส่งรหัสยืนยันแล้ว' });
});

// POST /forgot-password/verify-otp
app.post('/forgot-password/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'ต้องระบุอีเมลและรหัส OTP' });
  }

  const record = otpStore[email];
  if (!record) {
    return res.status(400).json({ success: false, message: 'ไม่พบรหัสยืนยัน โปรดส่งรหัสใหม่' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'รหัสหมดอายุ โปรดขอรหัสใหม่' });
  }

  if (record.otp !== String(otp)) {
    return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง' });
  }

  // Mark as verified by keeping record (or you could delete and keep a verified map)
  // For simplicity, keep OTP until reset is performed, but you could add a verified set
  return res.json({ success: true, message: 'ยืนยัน OTP สำเร็จ' });
});

// POST /forgot-password/reset-password
app.post('/forgot-password/reset-password', (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const record = otpStore[email];
  if (!record) {
    return res.status(400).json({ success: false, message: 'ไม่พบคำขอรีเซ็ตรหัสผ่าน โปรดเริ่มต้นใหม่' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'รหัสหมดอายุ โปรดขอรหัสใหม่' });
  }

  if (record.otp !== String(otp)) {
    return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
  }

  // Basic password validation
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  // Here you would update the user's password in the database. We'll just log.
  console.log(`Password reset for ${email} — new password set (stub).`);

  // Remove OTP record after successful reset
  delete otpStore[email];

  return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
});

// Survey routes
app.get('/survey/home', requireLogin, async (req, res) => {
  try {
    // Get user data from session
    const userId = req.session.userId;
    const sessionData = req.session.userData;

    // Get additional user data from Firestore if needed
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    let userData = sessionData;
    if (doc.exists) {
      const dbData = doc.data();
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
        year: dbData.year || 'ยังไม่ระบุ'
      };
    }

    res.render('survey/home', {
      title: 'หน้าหลัก',
      user: userData
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
});

app.get('/survey/questionnaire', requireLogin, (req, res) => {
  const fs = require('fs');
  const surveys = [];

  try {
    // Read all JSON files from data/surveys directory
    const surveyDir = path.join(__dirname, 'data', 'surveys');

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

            surveys.push(surveyData);
          } catch (error) {
            console.error(`Error loading survey ${file}:`, error);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error reading surveys directory:', error);
  }

  res.render('survey/questionnaire', {
    title: 'แบบสอบถาม',
    surveys: surveys
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

app.get('/survey/settings', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    let userData = req.session.userData;
    if (doc.exists) {
      const dbData = doc.data();
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
        year: dbData.year || 'ยังไม่ระบุ'
      };
    }

    res.render('survey/settings', {
      title: 'ตั้งค่า',
      user: userData
    });
  } catch (error) {
    console.error('Error loading settings page:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
});

// Survey form route
app.get('/survey/form/:id', requireLogin, (req, res) => {
  const surveyId = req.params.id;
  const fs = require('fs');

  try {
    // Try to load survey data from JSON file
    const surveyPath = path.join(__dirname, 'data', 'surveys', `${surveyId}.json`);

    if (fs.existsSync(surveyPath)) {
      const surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));

      res.render('survey/form', {
        title: surveyData.title,
        survey: surveyData
      });
    } else {
      // Fallback to mock data for old surveys
      const survey = surveys[surveyId] || surveys['1'];

      res.render('survey/form', {
        title: survey.title,
        survey: survey
      });
    }
  } catch (error) {
    console.error('Error loading survey:', error);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดแบบสอบถาม');
  }
});

// Submit survey endpoint
app.post('/survey/submit/:id', requireLogin, (req, res) => {
  const surveyId = req.params.id;
  const answers = req.body;

  // In production, save to database
  console.log('Survey submission:', { surveyId, answers });

  res.json({
    success: true,
    message: 'ส่งแบบสอบถามสำเร็จ'
  });
});

// Update personal info endpoint
app.post('/survey/update-personal-info', requireLogin, async (req, res) => {
  const { firstName, lastName } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    });
  }

  // In production, update database
  console.log('Personal info update:', { firstName, lastName });

  res.json({
    success: true,
    message: 'บันทึกข้อมูลสำเร็จ'
  });
});

// Change password endpoint
app.post('/survey/change-password', requireLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

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

  // In production, verify current password and update
  console.log('Password change request');

  res.json({
    success: true,
    message: 'เปลี่ยนรหัสผ่านสำเร็จ'
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
