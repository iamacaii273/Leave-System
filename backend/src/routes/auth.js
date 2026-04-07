const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { logAction } = require("../utils/logger");

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

module.exports = router;
