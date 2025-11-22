const nodemailer = require('nodemailer');

// Validate email credentials
const EMAIL_USER = process.env.EMAIL_USER || "asanrodnuanwork2546@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "dmzf utbp jgva zgml";
console.log('Email User:', EMAIL_USER);
console.log('Email Pass Set:', EMAIL_PASS && EMAIL_PASS !== 'YOUR_APP_PASSWORD_HERE');
let transporter;
if (!EMAIL_USER || !EMAIL_PASS || EMAIL_PASS === 'YOUR_APP_PASSWORD_HERE') {
  console.error('❌ Email credentials missing or not configured. Set EMAIL_USER and EMAIL_PASS in .env (use an App Password for Gmail).');
  // Provide a dummy transporter that throws clear errors on send
  transporter = {
    sendMail: async () => {
      throw new Error('Email credentials not configured (EMAIL_USER/EMAIL_PASS). Please set them in .env');
    },
    verify: async () => {
      throw new Error('Email credentials not configured (EMAIL_USER/EMAIL_PASS)');
    }
  };
} else {
  // Create real transporter
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

// Email template for OTP
function getOtpEmailTemplate(otp, recipientName = 'ผู้ใช้') {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รหัสยืนยันการรีเซ็ตรหัสผ่าน</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 15px;
      color: #555;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .otp-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-label {
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
    }
    .otp-validity {
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      margin-top: 10px;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .warning-box p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    .info-box {
      background-color: #e7f3ff;
      border-left: 4px solid #2196F3;
      padding: 15px 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #0c5460;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
      font-size: 13px;
      color: #6c757d;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>🔐 รีเซ็ตรหัสผ่าน</h1>
      <p>ระบบจัดการคำขอรีเซ็ตรหัสผ่านของคุณ</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">
        สวัสดี ${recipientName} 👋
      </div>

      <div class="message">
        <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ หากคุณเป็นผู้ทำการขอรีเซ็ตรหัสผ่าน โปรดใช้รหัสยืนยัน (OTP) ด้านล่างนี้:</p>
      </div>

      <!-- OTP Box -->
      <div class="otp-container">
        <div class="otp-label">รหัสยืนยันของคุณ</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-validity">⏱️ รหัสนี้ใช้ได้เพียง 5 นาทีเท่านั้น</div>
      </div>

      <div class="info-box">
        <p>💡 <strong>วิธีใช้:</strong> นำรหัส OTP นี้ไปกรอกในหน้ายืนยันตัวตนเพื่อดำเนินการรีเซ็ตรหัสผ่านของคุณ</p>
      </div>

      <div class="warning-box">
        <p>⚠️ <strong>คำเตือนด้านความปลอดภัย:</strong> หากคุณไม่ได้ทำการขอรีเซ็ตรหัสผ่าน โปรดเพิกเฉยอีเมลนี้และติดต่อเราทันที อย่าแชร์รหัส OTP นี้ให้ใครทราบ</p>
      </div>

      <div class="divider"></div>

      <div class="message" style="font-size: 13px; color: #6c757d;">
        <p><strong>หมายเหตุ:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>รหัส OTP มีอายุการใช้งาน 5 นาที</li>
          <li>หากรหัสหมดอายุ สามารถขอรหัสใหม่ได้</li>
          <li>เพื่อความปลอดภัย อย่าแชร์รหัสนี้ให้ผู้อื่น</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>ระบบจัดการข้อมูล KRU-NSRU</strong></p>
      <p>มหาวิทยาลัยราชภัฏนครสวรรค์</p>
      <p style="margin-top: 15px;">
        หากมีคำถามหรือต้องการความช่วยเหลือ<br>
        ติดต่อเราที่: <a href="mailto:support@nsru.ac.th">support@nsru.ac.th</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        © ${new Date().getFullYear()} มหาวิทยาลัยราชภัฏนครสวรรค์. สงวนลิขสิทธิ์.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Send OTP email
async function sendOtpEmail(toEmail, otp, recipientName = 'ผู้ใช้') {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'KRU-NSRU System'}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🔐 รหัสยืนยันการรีเซ็ตรหัสผ่าน - KRU-NSRU',
      html: getOtpEmailTemplate(otp, recipientName)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] To: ${toEmail} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    return { success: false, error: error.message };
  }
}

// Verify email configuration
async function verifyEmailConfig() {
  try {
    // If transporter is dummy it will throw with a clear message
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.error('   Hint: create a Gmail App Password and set EMAIL_USER and EMAIL_PASS in your .env file.');
    return false;
  }
}

module.exports = {
  sendOtpEmail,
  verifyEmailConfig
};
