const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const pool = require("../db");
const { logAction } = require("../utils/logger");
const { sendEmail } = require("../utils/mailer");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.notifications_enabled, u.password_hash,
              u.is_active, u.department_id, d.name AS department, r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?
         AND u.deleted_at IS NULL`,
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is deactivated." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        department_id: user.department_id,
        role_id: user.role_id,
        role: user.role_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    await logAction(
      user.id,
      "login",
      `User logged in from email: ${user.email}`,
    );

    // Fetch managed departments for HR/Manager
    let managed_department_ids = [];
    let managed_departments = [];

    if (user.role_name === 'HR' || user.role_name === 'Manager') {
      const table = user.role_name === 'HR' ? 'hr_departments' : 'manager_departments';
      const [deptRows] = await pool.query(
        `SELECT d.id, d.name
         FROM ${table} x
         JOIN departments d ON x.department_id = d.id
         WHERE x.user_id = ?`,
        [user.id]
      );
      managed_department_ids = deptRows.map(r => r.id);
      managed_departments = deptRows.map(r => r.name);
    }

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        notifications_enabled: user.notifications_enabled,
        department_id: user.department_id,
        department: user.department,
        role_id: user.role_id,
        role: user.role_name,
        managed_department_ids,
        managed_departments,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});


// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const [rows] = await pool.query("SELECT id, full_name, is_active FROM users WHERE email = ? AND deleted_at IS NULL", [email]);
    if (rows.length === 0) {
      // Return 200 to prevent email enumeration attacks
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: "Account is deactivated." });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    await pool.query(
      "UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?",
      [token, expires, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${token}`;

    const htmlBody = `
      <h3>Hello ${user.full_name},</h3>
      <p>You requested a password reset. Please click the link below to set a new password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
    `;

    await sendEmail(email, "Password Reset Request", `Reset link: ${resetLink}`, htmlBody);

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW() AND deleted_at IS NULL",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const user = rows[0];
    const password_hash = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?",
      [password_hash, user.id]
    );

    await logAction(user.id, "password_reset", "User reset their password via email link.");

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
