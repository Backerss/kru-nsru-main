const express = require('express');
const path = require('path');

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

app.post('/login', (req, res) => {
  const { studentId, password, rememberMe } = req.body;

  // Basic validation
  if (!studentId || !password) {
    return res.status(400).json({
      error: 'กรุณากรอกรหัสนักศึกษาและรหัสผ่าน'
    });
  }

  // Here you would typically check against database
  // For demo purposes, we'll use simple validation

  // Mock user database (in real app, this would be from database)
  const mockUsers = [
    { studentId: '1234567890', password: 'password123', name: 'นาย ทดสอบ ระบบ' },
    { studentId: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ' }
  ];

  // Find user
  const user = mockUsers.find(u => u.studentId === studentId && u.password === password);

  if (!user) {
    return res.status(401).json({
      error: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง'
    });
  }

  // Login successful
  console.log('User logged in:', { studentId, rememberMe, timestamp: new Date().toISOString() });

  // In a real app, you would set session/JWT here
  res.json({
    success: true,
    message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${user.name}`,
    redirectUrl: '/',
    user: {
      studentId: user.studentId,
      name: user.name
    }
  });
});

app.post('/register', (req, res) => {
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

  // Here you would typically save to database
  const userData = {
    studentId,
    prefix,
    firstName,
    lastName,
    birthdate,
    age: parseInt(age),
    email,
    phone,
    createdAt: new Date().toISOString()
  };

  console.log('New registration:', userData);

  // Send success response
  res.json({
    success: true,
    message: 'สมัครสมาชิกสำเร็จแล้ว!',
    redirectUrl: '/login'
  });
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
app.get('/survey/home', (req, res) => {
  // In production, get user data from session/JWT
  const mockUser = {
    studentId: '6510000000',
    name: 'นาย ทดสอบ ระบบ',
    faculty: 'คณะวิทยาศาสตร์',
    major: 'วิทยาการคอมพิวเตอร์',
    year: '4',
    email: 'student@example.com'
  };

  res.render('survey/home', {
    title: 'หน้าหลัก',
    user: mockUser
  });
});

app.get('/survey/questionnaire', (req, res) => {
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

app.get('/survey/settings', (req, res) => {
  // In production, get user data from session/JWT
  const mockUser = {
    studentId: '6510000000',
    name: 'นาย ทดสอบ ระบบ',
    faculty: 'คณะวิทยาศาสตร์',
    major: 'วิทยาการคอมพิวเตอร์',
    year: '4',
    email: 'student@example.com'
  };

  res.render('survey/settings', {
    title: 'ตั้งค่า',
    user: mockUser
  });
});

// Survey form route
app.get('/survey/form/:id', (req, res) => {
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
app.post('/survey/submit/:id', (req, res) => {
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
app.post('/survey/update-personal-info', (req, res) => {
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
app.post('/survey/change-password', (req, res) => {
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
