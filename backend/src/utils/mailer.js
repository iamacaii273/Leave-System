const nodemailer = require("nodemailer");

// By default, Create a test "Ethereal" mailbox on the fly, 
// unless the exact config for a real SMTP service is provided in .env
let transporter = null;

async function initTransporter() {
  if (!transporter) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use real production SMTP
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    } else {
      // Generate Ethereal test account (for Dev)
      console.log("No SMTP credentials found in environment. Generating Ethereal TEST account...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Ethereal TEST Account] User: ${testAccount.user} | Pass: ${testAccount.pass}`);
    }
  }
  return transporter;
}

/**
 * Send an email
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} text - plaintext email body
 * @param {string} html - HTML email body
 */
async function sendEmail(to, subject, text, html) {
  try {
    // If RESEND_API_KEY is provided, use Resend API (HTTPS port 443) to bypass Railway SMTP block
    if (process.env.RESEND_API_KEY) {
      console.log("Using Resend API to send email...");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: to,
          subject: subject,
          html: html,
          text: text
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Resend API Error: ${data.message || JSON.stringify(data)}`);
      }
      
      console.log("Message sent via Resend: %s", data.id);
      return data;
    }

    // Fallback to Nodemailer (SMTP / Ethereal)
    const mailer = await initTransporter();
    
    // send mail with defined transport object
    const info = await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"Leave Management" <no-reply@ethereal.email>',
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent via SMTP: %s", info.messageId);
    
    // If using Ethereal, generate a preview URL to click and read the email!
    if (!process.env.SMTP_HOST) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error("Error sending email", error);
    throw error;
  }
}

module.exports = {
  sendEmail
};
