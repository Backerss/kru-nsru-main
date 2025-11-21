const express = require('express');
const router = express.Router();

// In-memory OTP store: { [email]: { otp: '123456', expiresAt: 0 } }
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Stub email sender - replace with real email sending in production
function sendOtpEmail(toEmail, otp) {
  console.log(`[OTP SEND] To: ${toEmail} | OTP: ${otp} | (This is a stub - integrate real email service)`);
}

// Request email page
router.get('/request-email', (req, res) => {
  res.render('forgot-password/request-email', {
    title: 'ลืมรหัสผ่าน - ขอรหัสยืนยัน'
  });
});

// Verify OTP page
router.get('/verify-otp', (req, res) => {
  res.render('forgot-password/verify-otp', {
    title: 'ลืมรหัสผ่าน - ยืนยันรหัส OTP'
  });
});

// Reset password page
router.get('/reset-password', (req, res) => {
  res.render('forgot-password/reset-password', {
    title: 'ลืมรหัสผ่าน - ตั้งรหัสผ่านใหม่'
  });
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'ต้องระบุอีเมล' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  try {
    const db = req.app.get('db');
    
    // Check if email exists in database
    const usersQuery = await db.collection('users').where('email', '==', email).get();
    
    if (usersQuery.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบอีเมลนี้ในระบบ' 
      });
    }

    // Generate and store OTP (valid 5 minutes)
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore[email] = { otp, expiresAt };

    // Send email (stub for now)
    sendOtpEmail(email, otp);

    return res.json({ success: true, message: 'ส่งรหัสยืนยันแล้ว' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการส่งรหัสยืนยัน' 
    });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
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

  return res.json({ success: true, message: 'ยืนยัน OTP สำเร็จ' });
});

// Reset password
router.post('/reset-password', async (req, res) => {
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

  try {
    const bcrypt = require('bcrypt');
    const db = req.app.get('db');
    
    // Find user by email
    const usersQuery = await db.collection('users').where('email', '==', email).get();
    
    if (usersQuery.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password for the user
    const userDoc = usersQuery.docs[0];
    await userDoc.ref.update({
      password: hashedPassword,
      passwordResetAt: new Date().toISOString()
    });

    console.log(`Password reset for ${email} - ${new Date().toISOString()}`);

    // Remove OTP record after successful reset
    delete otpStore[email];

    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' 
    });
  }
});

module.exports = router;
