require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log("Testing SMTP Connection...");
  console.log("Host:", process.env.SMTP_HOST || 'smtp.gmail.com');
  console.log("Port:", process.env.SMTP_PORT || 465);
  console.log("Secure:", true);
  console.log("User:", process.env.SMTP_USER || 'noreply.leaveflow@gmail.com');
  
  // Use env var or the password the user provided
  const pass = process.env.SMTP_PASS || 'ayfznmrlgmqwmzlf';
  console.log("Pass length:", pass.length);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'noreply.leaveflow@gmail.com',
        pass: pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    console.log("Verifying connection...");
    await transporter.verify();
    console.log("✅ SMTP Connection Successful!");

    console.log("Sending test email to:", process.env.SMTP_USER || 'noreply.leaveflow@gmail.com');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply.leaveflow@gmail.com',
      to: process.env.SMTP_USER || 'noreply.leaveflow@gmail.com', // Send to self
      subject: "Test Email from Leave System",
      text: "This is a test email to verify SMTP settings.",
    });

    console.log("✅ Test Email Sent! Message ID:", info.messageId);

  } catch (error) {
    console.error("❌ SMTP Error:", error.message);
    console.error(error);
  }
}

testSMTP();
