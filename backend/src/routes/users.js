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
  u.notifications_enabled,
  u.created_at,
  u.updated_at,
  u.role_id,
  r.name     AS role,
  u.position_id,
  p.name     AS position,
  u.department_id,
  d.name     AS department
`;

const USER_JOINS = `
  JOIN roles     r ON u.role_id     = r.id
  JOIN positions p ON u.position_id = p.id
  LEFT JOIN departments d ON u.department_id = d.id
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

    const user = rows[0];

    // Fetch managed departments
    const isHR = user.role === "HR";
    const isManager = user.role === "Manager";

    if (isHR || isManager) {
      const table = isHR ? "hr_departments" : "manager_departments";
      const [deptRows] = await pool.query(
        `SELECT d.id, d.name 
         FROM ${table} x 
         JOIN departments d ON x.department_id = d.id 
         WHERE x.user_id = ?`,
        [req.user.id]
      );
      user.managed_department_ids = deptRows.map((r) => r.id);
      user.managed_departments = deptRows.map((r) => r.name);
    } else {
      user.managed_department_ids = [];
      user.managed_departments = [];
    }

    res.json({ user });
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
  const { full_name, email, username, phone, notifications_enabled } = req.body;

  // Only pick fields that were actually supplied in the request body
  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (email !== undefined) updates.email = email;
  if (username !== undefined) updates.username = username;
  if (phone !== undefined) updates.phone = phone;
  if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "At least one field (full_name, email, username, phone, notifications_enabled) is required.",
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
    const [freshRows] = await pool.query(
      `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       WHERE  u.id = ?`,
      [req.user.id],
    );

    const freshUser = freshRows[0];

    // Fetch managed departments for fresh user
    const isHRNew = freshUser.role === "HR";
    const isManagerNew = freshUser.role === "Manager";

    if (isHRNew || isManagerNew) {
      const table = isHRNew ? "hr_departments" : "manager_departments";
      const [deptRows] = await pool.query(
        `SELECT d.id, d.name 
         FROM ${table} x 
         JOIN departments d ON x.department_id = d.id 
         WHERE x.user_id = ?`,
        [req.user.id]
      );
      freshUser.managed_department_ids = deptRows.map((r) => r.id);
      freshUser.managed_departments = deptRows.map((r) => r.name);
    } else {
      freshUser.managed_department_ids = [];
      freshUser.managed_departments = [];
    }

    res.json({ message: "Profile updated successfully.", user: freshUser });
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
      phone,
      password,
      role_id,
      position_id,
      department_id,
      managed_department_ids,
      hire_date,
    } = req.body;

    // ── Presence validation ──────────────────────────────────────────────────
    if (
      !full_name ||
      !email ||
      !password ||
      !role_id ||
      !position_id ||
      !department_id ||
      !hire_date
    ) {
      return res.status(400).json({
        message:
          "All fields are required",
      });
    }

    const ROLE_EMPLOYEE = "rl000001-0000-0000-0000-000000000001";
    const ROLE_MANAGER = "rl000001-0000-0000-0000-000000000002";
    const ROLE_HR = "rl000001-0000-0000-0000-000000000003";
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

      // ── Validate department_id ───────────────────────────────────────────
      const [deptRows] = await pool.query(
        `SELECT id FROM departments WHERE id = ?`,
        [department_id]
      );
      if (deptRows.length === 0) {
        return res.status(400).json({ message: "Invalid department_id." });
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
        `INSERT INTO users (id, username, full_name, email, phone, password_hash, role_id, position_id, department_id, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          username,
          full_name,
          email,
          phone || null,
          password_hash,
          role_id,
          position_id,
          department_id,
          hire_date,
        ],
      );

      // ── Handle multiple departments for HR/Manager ─────────────────────────
      if (role_id === ROLE_HR || role_id === ROLE_MANAGER) {
        const table = role_id === ROLE_HR ? 'hr_departments' : 'manager_departments';
        const deptIds = Array.isArray(managed_department_ids) ? managed_department_ids : [];

        // Always include the primary department in the access list if not already there
        if (department_id && !deptIds.includes(department_id)) {
          deptIds.push(department_id);
        }

        for (const dId of deptIds) {
          // Validate dept exists
          const [exists] = await pool.query('SELECT id FROM departments WHERE id = ?', [dId]);
          if (exists.length > 0) {
            await pool.query(
              `INSERT IGNORE INTO ${table} (user_id, department_id) VALUES (?, ?)`,
              [id, dId]
            );
          }
        }
      }

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

      const [leaveTypes] = await pool.query(
        'SELECT id, default_days_per_year, min_service_months FROM leave_types WHERE is_active = 1 AND (department_id IS NULL OR department_id = ?)',
        [department_id]
      );
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
      let whereClause = "WHERE u.deleted_at IS NULL";
      const params = [];

      if (req.user.role === "Manager") {
        const [managedDepts] = await pool.query('SELECT department_id FROM manager_departments WHERE user_id = ?', [req.user.id]);
        let deptIds = managedDepts.map(d => String(d.department_id));
        if (req.query.department_id) {
          deptIds = deptIds.filter(id => id === String(req.query.department_id));
        }

        if (deptIds.length > 0) {
          whereClause += " AND u.department_id IN (?)";
          params.push(deptIds);
        } else {
          whereClause += " AND 1 = 0";
        }
      } else if (req.user.role === "HR") {
        const [managedDepts] = await pool.query('SELECT department_id FROM hr_departments WHERE user_id = ?', [req.user.id]);
        let deptIds = managedDepts.map(d => String(d.department_id));
        if (req.query.department_id) {
          deptIds = deptIds.filter(id => id === String(req.query.department_id));
        }

        if (deptIds.length > 0) {
          if (req.query.department_id) {
            whereClause += " AND u.department_id IN (?)";
          } else {
            whereClause += " AND (u.department_id IN (?) OR u.department_id IS NULL)";
          }
          params.push(deptIds);
        } else {
          whereClause += " AND 1 = 0";
        }
      }

      const [rows] = await pool.query(
        `SELECT ${USER_SELECT}
       FROM   users u
       ${USER_JOINS}
       ${whereClause}
       ORDER  BY u.full_name ASC`, params
      );

      // Enrich HR/Manager users with their managed department names
      const hrUserIds = rows.filter(u => u.role === 'HR').map(u => u.id);
      const mgrUserIds = rows.filter(u => u.role === 'Manager').map(u => u.id);

      const managedDeptMap = {};

      if (hrUserIds.length > 0) {
        const [hrDepts] = await pool.query(
          `SELECT x.user_id, d.name
           FROM hr_departments x
           JOIN departments d ON x.department_id = d.id
           WHERE x.user_id IN (?)`,
          [hrUserIds]
        );
        for (const row of hrDepts) {
          if (!managedDeptMap[row.user_id]) managedDeptMap[row.user_id] = [];
          managedDeptMap[row.user_id].push(row.name);
        }
      }

      if (mgrUserIds.length > 0) {
        const [mgrDepts] = await pool.query(
          `SELECT x.user_id, d.name
           FROM manager_departments x
           JOIN departments d ON x.department_id = d.id
           WHERE x.user_id IN (?)`,
          [mgrUserIds]
        );
        for (const row of mgrDepts) {
          if (!managedDeptMap[row.user_id]) managedDeptMap[row.user_id] = [];
          managedDeptMap[row.user_id].push(row.name);
        }
      }

      // Attach managed_departments to each user
      for (const user of rows) {
        user.managed_departments = managedDeptMap[user.id] || [];
      }

      res.json({ users: rows });
    } catch (err) {
      console.error("GET / error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 5.5 GET /employees-summary ──────────────────────────────────────────────
// Get employees summary.
// Protected: HR and Super Admin only.
router.get(
  "/employees-summary",
  verifyToken,
  requireRole("HR", "Super Admin"),
  async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();

      let whereClause = "WHERE u.deleted_at IS NULL AND u.is_active = 1 AND r.name = 'Employee'";
      const params = [currentYear];

      if (req.user.role === "HR") {
        const [managedDepts] = await pool.query('SELECT department_id FROM hr_departments WHERE user_id = ?', [req.user.id]);
        let deptIds = managedDepts.map(d => String(d.department_id));
        if (req.query.department_id) {
          deptIds = deptIds.filter(id => id === String(req.query.department_id));
        }

        if (deptIds.length > 0) {
          if (req.query.department_id) {
            whereClause += " AND u.department_id IN (?)";
          } else {
            whereClause += " AND (u.department_id IN (?) OR u.department_id IS NULL)";
          }
          params.push(deptIds);
        } else {
          whereClause += " AND 1=0";
        }
      }

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
           u.department_id,
           d.name AS department,
           COALESCE(SUM(
             CASE 
               WHEN lt.is_active = 1 
                    AND TIMESTAMPDIFF(MONTH, u.hire_date, NOW()) >= COALESCE(lt.min_service_months, 0)
                    AND EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = lt.id AND ltd.department_id = u.department_id)
               THEN lb.total_days 
               ELSE 0 
             END
           ), 0) AS total_leave_quota,
           COALESCE(SUM(
             CASE 
               WHEN lt.is_active = 1 
                    AND TIMESTAMPDIFF(MONTH, u.hire_date, NOW()) >= COALESCE(lt.min_service_months, 0)
                    AND EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = lt.id AND ltd.department_id = u.department_id)
               THEN lb.used_days 
               ELSE 0 
             END
           ), 0) AS used_leave_quota,
           COALESCE(SUM(
             CASE 
               WHEN lt.is_active = 1 
                    AND TIMESTAMPDIFF(MONTH, u.hire_date, NOW()) >= COALESCE(lt.min_service_months, 0)
                    AND EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = lt.id AND ltd.department_id = u.department_id)
               THEN lb.remaining_days 
               ELSE 0 
             END
           ), 0) AS remaining_leave_quota
         FROM users u
         JOIN roles r ON u.role_id = r.id
         JOIN positions p ON u.position_id = p.id
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN leave_balances lb
           ON lb.user_id = u.id
          AND lb.year = ?
         LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
         ${whereClause}
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
           p.name,
           u.department_id,
           d.name
         ORDER BY u.full_name ASC`,
        params,
      );

      res.json({ year: currentYear, users: rows });
    } catch (err) {
      console.error("GET /users/employees-summary error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 5.6 GET /:id ─────────────────────────────────────────────────────────────
// Get user by ID.
// Protected: HR and Super Admin only.
router.get(
  "/:id",
  verifyToken,
  requireRole("HR", "Super Admin"),
  async (req, res) => {
    const { id } = req.params;

    try {
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

      const user = rows[0];

      // Fetch managed departments if applicable
      const isHR = user.role === "HR";
      const isManager = user.role === "Manager";

      if (isHR || isManager) {
        const table = isHR ? 'hr_departments' : 'manager_departments';
        const [deptRows] = await pool.query(`SELECT department_id FROM ${table} WHERE user_id = ?`, [id]);
        user.managed_department_ids = deptRows.map(r => r.department_id);
      } else {
        user.managed_department_ids = [];
      }

      res.json({ user });
    } catch (err) {
      console.error("GET /:id error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 6. PUT /:id/resign ──────────────────────────────────────────────────────
// Marks an employee as resigned: is_active = 0.
// Data is preserved — the employee is NOT deleted from the database.
// Protected: HR, Super Admin.
router.put(
  "/:id/resign",
  verifyToken,
  requireRole("HR", "Super Admin"),
  async (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot resign your own account." });
    }

    try {
      const [userRows] = await pool.query(
        `SELECT id, is_active FROM users WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );

      if (userRows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      await pool.query(
        `UPDATE users SET is_active = 0 WHERE id = ?`,
        [id],
      );

      await logAction(
        req.user.id,
        "user_resigned",
        `Employee ${id} marked as resigned by ${req.user.id}.`,
      );

      res.json({ message: "Employee marked as resigned successfully." });
    } catch (err) {
      console.error(`PUT /:id/resign error (id=${id}):`, err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─── 7. PUT /:id ──────────────────────────────────────────────────────────────
// Update any user's info.
// Allowed fields: full_name, email, username, role_id, position_id, hire_date, is_active.
// Protected: HR (role/is_active only) and Super Admin (all fields).
router.put(
  "/:id",
  verifyToken,
  requireRole("HR", "Super Admin"),
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
      department_id,
      hire_date,
      is_active,
      managed_department_ids,
    } = req.body;

    // Only pick fields that were actually supplied in the request body
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (username !== undefined) updates.username = username;
    if (phone !== undefined) updates.phone = phone;
    if (role_id !== undefined) updates.role_id = role_id;
    if (position_id !== undefined) updates.position_id = position_id;
    if (department_id !== undefined) updates.department_id = department_id;
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
        `SELECT u.id, r.name as role_name 
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ? AND u.deleted_at IS NULL`,
        [id],
      );

      if (userRows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const targetUser = userRows[0];

      // Security Check: HR cannot edit Super Admin or other HR (if you want to restrict HR further)
      // For now, let's at least prevent HR from editing Super Admin.
      if (req.user.role === "HR" && targetUser.role_name === "Super Admin") {
        return res.status(403).json({ message: "HR does not have permission to edit Super Admin accounts." });
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

      // Handle multiple departments sync
      const ROLE_MANAGER = "rl000001-0000-0000-0000-000000000002";
      const ROLE_HR = "rl000001-0000-0000-0000-000000000003";

      // Re-fetch user role to be sure
      const [finalUser] = await pool.query('SELECT role_id FROM users WHERE id = ?', [id]);
      const roleId = finalUser[0]?.role_id;

      if (managed_department_ids !== undefined && (roleId === ROLE_HR || roleId === ROLE_MANAGER)) {
        const table = roleId === ROLE_HR ? 'hr_departments' : 'manager_departments';
        const deptIds = Array.isArray(managed_department_ids) ? managed_department_ids : [];

        // Ensure primary department is in access list if provided
        const primaryDeptId = updates.department_id || (await pool.query('SELECT department_id FROM users WHERE id = ?', [id]))[0][0]?.department_id;
        if (primaryDeptId && !deptIds.includes(primaryDeptId)) {
          deptIds.push(primaryDeptId);
        }

        // Delete old
        await pool.query(`DELETE FROM ${table} WHERE user_id = ?`, [id]);

        // Insert new
        for (const dId of deptIds) {
          const [exists] = await pool.query('SELECT id FROM departments WHERE id = ?', [dId]);
          if (exists.length > 0) {
            await pool.query(`INSERT IGNORE INTO ${table} (user_id, department_id) VALUES (?, ?)`, [id, dId]);
          }
        }
      }
    } catch (err) {
      console.error(`PUT /:id error (id=${id}):`, err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);


// ─── 8. DELETE /:id ───────────────────────────────────────────────────────────

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
