const router = require("express").Router();
const bcrypt = require("bcrypt");
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAction } = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

// ─── Shared SELECT columns (no password_hash) ────────────────────────────────
const USER_SELECT = `
  u.id,
  u.username,
  u.full_name,
  u.email,
  u.phone,
  u.hire_date,
  u.is_active,
  u.created_at,
  u.updated_at,
  u.role_id,
  r.name     AS role,
  u.position_id,
  p.name     AS position
`;

const USER_JOINS = `
  JOIN roles     r ON u.role_id     = r.id
  JOIN positions p ON u.position_id = p.id
`;

// ─── 1. GET /me ───────────────────────────────────────────────────────────────
// Returns the current logged-in user's profile.
// Protected: verifyToken only.
router.get("/me", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       WHERE  u.id = ?
         AND  u.deleted_at IS NULL`,
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── 2. PUT /me/password ──────────────────────────────────────────────────────
// Change own password.
// Body: { current_password, new_password }
// Protected: verifyToken only.
// NOTE: must be declared BEFORE PUT /me to avoid /:id swallowing "password".
router.put("/me/password", verifyToken, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res
      .status(400)
      .json({ message: "current_password and new_password are required." });
  }

  try {
    // Fetch the stored hash for the current user
    const [rows] = await pool.query(
      `SELECT password_hash
       FROM   users
       WHERE  id = ?
         AND  deleted_at IS NULL`,
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(
      current_password,
      rows[0].password_hash,
    );
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users
       SET    password_hash = ?
       WHERE  id = ?`,
      [newHash, req.user.id],
    );

    await logAction(
      req.user.id,
      "password_changed",
      "User changed their own password.",
    );

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("PUT /me/password error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── 3. PUT /me ───────────────────────────────────────────────────────────────
// Update current user's own profile.
// Allowed fields: full_name, email, username.
// Protected: verifyToken only.
// NOTE: must be declared BEFORE PUT /:id.
router.put("/me", verifyToken, async (req, res) => {
  const { full_name, email, username, phone } = req.body;

  // Only pick fields that were actually supplied in the request body
  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (email !== undefined) updates.email = email;
  if (username !== undefined) updates.username = username;
  if (phone !== undefined) updates.phone = phone;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "At least one field (full_name, email, username, phone) is required.",
    });
  }

  try {
    // Duplicate email check — exclude own id
    if (updates.email) {
      const [emailRows] = await pool.query(
        `SELECT id FROM users
         WHERE  email = ?
           AND  id   != ?
           AND  deleted_at IS NULL`,
        [updates.email, req.user.id],
      );
      if (emailRows.length > 0) {
        return res.status(409).json({ message: "Email is already in use." });
      }
    }

    // Duplicate username check — exclude own id
    if (updates.username) {
      const [usernameRows] = await pool.query(
        `SELECT id FROM users
         WHERE  username = ?
           AND  id      != ?
           AND  deleted_at IS NULL`,
        [updates.username, req.user.id],
      );
      if (usernameRows.length > 0) {
        return res.status(409).json({ message: "Username is already in use." });
      }
    }

    // Build dynamic SET clause from whitelisted updates
    const setClauses = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = [...Object.values(updates), req.user.id];

    await pool.query(
      `UPDATE users
       SET    ${setClauses}
       WHERE  id = ?
         AND  deleted_at IS NULL`,
      values,
    );

    await logAction(
      req.user.id,
      "profile_updated",
      `User updated their profile. Changed fields: ${Object.keys(updates).join(", ")}.`,
    );

    // Return the freshly updated profile
    const [rows] = await pool.query(
      `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       WHERE  u.id = ?`,
      [req.user.id],
    );

    res.json({ message: "Profile updated successfully.", user: rows[0] });
  } catch (err) {
    console.error("PUT /me error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── 4. POST / ───────────────────────────────────────────────────────────────
// Create a new user.
// Body: { username, full_name, email, password, role_id, position_id, hire_date }
// Protected: HR and Super Admin only.
// HR may only create Employees; Super Admin may create any role except Super Admin.
router.post(
  "/",
  verifyToken,
  requireRole("HR", "Super Admin"),
  async (req, res) => {
    const {
      full_name,
      email,
      password,
      phone,
      role_id,
      position_id,
      hire_date,
    } = req.body;

    // ── Presence validation ──────────────────────────────────────────────────
    if (
      !full_name ||
      !email ||
      !password ||
      !role_id ||
      !position_id ||
      !hire_date
    ) {
      return res.status(400).json({
        message:
          "All fields are required: full_name, email, password, role_id, position_id, hire_date.",
      });
    }

    const ROLE_EMPLOYEE = "rl000001-0000-0000-0000-000000000001";
    const ROLE_MANAGER = "rl000001-0000-0000-0000-000000000002";
    const ROLE_SUPER_ADMIN = "rl000001-0000-0000-0000-000000000004";

    // ── Role restriction ─────────────────────────────────────────────────────
    if (req.user.role === "HR" && role_id !== ROLE_EMPLOYEE && role_id !== ROLE_MANAGER) {
      return res
        .status(403)
        .json({ message: "HR may only create users with the Employee or Manager role." });
    }

    if (req.user.role === "Super Admin" && role_id === ROLE_SUPER_ADMIN) {
      return res
        .status(403)
        .json({ message: "Super Admin cannot create another Super Admin." });
    }

    try {
      // ── Duplicate email check ─────────────────────────────────
      const [dupRows] = await pool.query(
        `SELECT id FROM users
       WHERE  email = ?
         AND  deleted_at IS NULL`,
        [email],
      );
      if (dupRows.length > 0) {
        return res.status(409).json({
          message: "A user with that email already exists.",
        });
      }

      // ── Validate role_id ─────────────────────────────────────────────────
      const [roleRows] = await pool.query(`SELECT id FROM roles WHERE id = ?`, [
        role_id,
      ]);
      if (roleRows.length === 0) {
        return res.status(400).json({ message: "Invalid role_id." });
      }

      // ── Validate position_id ─────────────────────────────────────────────
      const [positionRows] = await pool.query(
        `SELECT id FROM positions WHERE id = ?`,
        [position_id],
      );
      if (positionRows.length === 0) {
        return res.status(400).json({ message: "Invalid position_id." });
      }

      // ── Hash password & generate ID ──────────────────────────────────────
      const password_hash = await bcrypt.hash(password, 10);
      const id = uuidv4();

      // Use full_name as the username base
      let baseUsername = full_name;
      if (!baseUsername) baseUsername = 'User';
      let username = baseUsername;
      let counter = 1;
      
      while (true) {
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length === 0) break;
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // ── Insert ───────────────────────────────────────────────────────────
      await pool.query(
        `INSERT INTO users (id, username, full_name, email, phone, password_hash, role_id, position_id, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          username,
          full_name,
          email,
          phone || null,
          password_hash,
          role_id,
          position_id,
          hire_date,
        ],
      );

      // ── Create Leave Balances for Current Year ───────────────────────────
      const currentYear = new Date().getFullYear();
      
      // Calculate months of service based on hire_date
      const hireDateObj = new Date(hire_date);
      const today = new Date();
      let serviceMonths = (today.getFullYear() - hireDateObj.getFullYear()) * 12 + (today.getMonth() - hireDateObj.getMonth());
      if (today.getDate() < hireDateObj.getDate()) {
        serviceMonths--;
      }
      if (serviceMonths < 0) serviceMonths = 0;

      const [leaveTypes] = await pool.query('SELECT id, default_days_per_year, min_service_months FROM leave_types WHERE is_active = 1');
      for (const lt of leaveTypes) {
        if (serviceMonths >= lt.min_service_months) {
          const lbId = uuidv4();
          await pool.query(
            `INSERT INTO leave_balances (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [lbId, id, lt.id, currentYear, lt.default_days_per_year, 0, lt.default_days_per_year]
          );
        }
      }

      await logAction(
        req.user.id,
        "user_created",
        `Created new user: ${username} (${email}).`,
      );

      // ── Return newly created user (without password_hash) ────────────────
      const [rows] = await pool.query(
        `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       WHERE  u.id = ?`,
        [id],
      );

      res
        .status(201)
        .json({ message: "User created successfully.", user: rows[0] });
    } catch (err) {
      console.error("POST / error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 5. GET / ─────────────────────────────────────────────────────────────────
// Get all non-deleted users.
// Protected: HR, Super Admin, and Manager.
router.get(
  "/",
  verifyToken,
  requireRole("HR", "Super Admin", "Manager"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       WHERE  u.deleted_at IS NULL
       ORDER  BY u.full_name ASC`,
      );

      res.json({ users: rows });
    } catch (err) {
      console.error("GET / error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

router.get(
  "/employees-summary",
  verifyToken,
  requireRole("HR", "Super Admin"),
  async (_req, res) => {
    try {
      const currentYear = new Date().getFullYear();

      const [rows] = await pool.query(
        `SELECT
           u.id,
           u.username,
           u.full_name,
           u.email,
           u.hire_date,
           u.is_active,
           u.created_at,
           u.updated_at,
           u.role_id,
           r.name AS role,
           u.position_id,
           p.name AS position,
           COALESCE(SUM(lb.total_days), 0) AS total_leave_quota,
           COALESCE(SUM(lb.used_days), 0) AS used_leave_quota,
           COALESCE(SUM(lb.remaining_days), 0) AS remaining_leave_quota
         FROM users u
         JOIN roles r ON u.role_id = r.id
         JOIN positions p ON u.position_id = p.id
         LEFT JOIN leave_balances lb
           ON lb.user_id = u.id
          AND lb.year = ?
         WHERE u.deleted_at IS NULL
           AND r.name = 'Employee'
         GROUP BY
           u.id,
           u.username,
           u.full_name,
           u.email,
           u.hire_date,
           u.is_active,
           u.created_at,
           u.updated_at,
           u.role_id,
           r.name,
           u.position_id,
           p.name
         ORDER BY u.full_name ASC`,
        [currentYear],
      );

      res.json({ year: currentYear, users: rows });
    } catch (err) {
      console.error("GET /users/employees-summary error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 5.5 GET /:id ─────────────────────────────────────────────────────────────
// Get user by ID.
// Protected: HR and Super Admin only.
router.get(
  "/:id",
  verifyToken,
  requireRole("HR", "Super Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(
        `SELECT ${USER_SELECT}
         FROM   users u
         ${USER_JOINS}
         WHERE  u.id = ?
           AND  u.deleted_at IS NULL`,
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({ user: rows[0] });
    } catch (err) {
      console.error("GET /:id error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);


// ─── 6. PUT /:id ──────────────────────────────────────────────────────────────
// Update any user's info.
// Allowed fields: full_name, email, username, role_id, position_id, hire_date, is_active.
// Protected: Super Admin only.
router.put(
  "/:id",
  verifyToken,
  requireRole("Super Admin"),
  async (req, res) => {
    const { id } = req.params;
    const {
      full_name,
      email,
      username,
      password,
      phone,
      role_id,
      position_id,
      hire_date,
      is_active,
    } = req.body;

    // Only pick fields that were actually supplied in the request body
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (username !== undefined) updates.username = username;
    if (phone !== undefined) updates.phone = phone;
    if (role_id !== undefined) updates.role_id = role_id;
    if (position_id !== undefined) updates.position_id = position_id;
    if (hire_date !== undefined) updates.hire_date = hire_date;
    if (is_active !== undefined) updates.is_active = is_active;
    
    if (password) {
       updates.password_hash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "At least one field to update is required." });
    }

    try {
      // Verify the target user exists and is not soft-deleted
      const [userRows] = await pool.query(
        `SELECT id FROM users
       WHERE  id = ?
         AND  deleted_at IS NULL`,
        [id],
      );

      if (userRows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      // Duplicate email check — exclude target id
      if (updates.email) {
        const [emailRows] = await pool.query(
          `SELECT id FROM users
         WHERE  email = ?
           AND  id   != ?
           AND  deleted_at IS NULL`,
          [updates.email, id],
        );
        if (emailRows.length > 0) {
          return res.status(409).json({ message: "Email is already in use." });
        }
      }

      // Duplicate username check — exclude target id
      if (updates.username) {
        const [usernameRows] = await pool.query(
          `SELECT id FROM users
         WHERE  username = ?
           AND  id      != ?
           AND  deleted_at IS NULL`,
          [updates.username, id],
        );
        if (usernameRows.length > 0) {
          return res
            .status(409)
            .json({ message: "Username is already in use." });
        }
      }

      // Build dynamic SET clause from whitelisted updates
      const setClauses = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(updates), id];

      await pool.query(
        `UPDATE users
       SET    ${setClauses}
       WHERE  id = ?`,
        values,
      );

      // Return the freshly updated user
      const [rows] = await pool.query(
        `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       WHERE  u.id = ?`,
        [id],
      );

      res.json({ message: "User updated successfully.", user: rows[0] });
    } catch (err) {
      console.error(`PUT /:id error (id=${id}):`, err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 7. DELETE /:id ───────────────────────────────────────────────────────────
// Soft-delete a user: sets deleted_at = NOW() and is_active = 0.
// Protected: Super Admin only.
router.delete(
  "/:id",
  verifyToken,
  requireRole("Super Admin"),
  async (req, res) => {
    const { id } = req.params;

    // Prevent a Super Admin from deleting their own account
    if (id === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
    }

    try {
      const [userRows] = await pool.query(
        `SELECT id FROM users
       WHERE  id = ?
         AND  deleted_at IS NULL`,
        [id],
      );

      if (userRows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      await pool.query(
        `UPDATE users
       SET    deleted_at = NOW(),
              is_active  = 0
       WHERE  id = ?`,
        [id],
      );

      res.json({ message: "User deleted successfully." });
    } catch (err) {
      console.error(`DELETE /:id error (id=${id}):`, err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

module.exports = router;
