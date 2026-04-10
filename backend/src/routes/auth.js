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
      `SELECT u.id, u.username, u.full_name, u.email, u.password_hash,
              u.is_active, r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
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

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const {
    username,
    full_name,
    email,
    password,
    role_id,
    position_id,
    hire_date,
  } = req.body;

  if (
    !username ||
    !full_name ||
    !email ||
    !password ||
    !role_id ||
    !position_id ||
    !hire_date
  ) {
    return res.status(400).json({
      message:
        "username, full_name, email, password, role_id, position_id, and hire_date are required.",
    });
  }

  try {
    // Check for duplicate email or username
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username],
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: "Email or username already in use." });
    }

    // Validate role_id exists
    const [roleRows] = await pool.query("SELECT id FROM roles WHERE id = ?", [
      role_id,
    ]);
    if (roleRows.length === 0) {
      return res.status(400).json({ message: "Invalid role_id." });
    }

    // Validate position_id exists
    const [posRows] = await pool.query(
      "SELECT id FROM positions WHERE id = ?",
      [position_id],
    );
    if (posRows.length === 0) {
      return res.status(400).json({ message: "Invalid position_id." });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (id, username, full_name, email, password_hash, role_id, position_id, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username,
        full_name,
        email,
        password_hash,
        role_id,
        position_id,
        hire_date,
      ],
    );

    res.status(201).json({
      message: "User registered successfully.",
      userId: id,
    });
  } catch (err) {
    console.error("Register error:", err);
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
