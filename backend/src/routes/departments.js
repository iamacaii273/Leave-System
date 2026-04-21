const router = require("express").Router();
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAction } = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

// ─── GET / ─────────────────────────────────────────────────────────────────
// Get all active departments.
// Protected: Any authenticated user.
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, is_active, created_at, updated_at
       FROM departments
       WHERE is_active = 1
       ORDER BY name ASC`
    );
    res.json({ departments: rows });
  } catch (err) {
    console.error("GET /departments error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── GET /all ──────────────────────────────────────────────────────────────
// Get all departments (including inactive).
// Protected: Super Admin only.
router.get("/all", verifyToken, requireRole("Super Admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, is_active, created_at, updated_at
       FROM departments
       ORDER BY is_active DESC, name ASC`
    );
    res.json({ departments: rows });
  } catch (err) {
    console.error("GET /departments/all error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── GET /hr-assigned ──────────────────────────────────────────────────────
// Get mapped departments for the currently logged-in HR user
// Protected: HR role only.
router.get("/hr-assigned", verifyToken, requireRole("HR"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.name 
       FROM departments d
       JOIN hr_departments hd ON d.id = hd.department_id
       WHERE hd.user_id = ? AND d.is_active = 1
       ORDER BY d.name ASC`,
      [req.user.id]
    );
    res.json({ departments: rows });
  } catch (err) {
    console.error("GET /departments/hr-assigned error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── POST / ────────────────────────────────────────────────────────────────
// Create a new department.
// Protected: Super Admin only.
router.post("/", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Department name is required." });
  }

  try {
    // Check for duplicate
    const [existing] = await pool.query("SELECT id FROM departments WHERE name = ?", [name]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "A department with this name already exists." });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO departments (id, name, is_active) VALUES (?, ?, 1)`,
      [id, name]
    );

    await logAction(req.user.id, "department_created", `Created department: ${name}`);

    const [rows] = await pool.query("SELECT * FROM departments WHERE id = ?", [id]);
    res.status(201).json({ message: "Department created successfully.", department: rows[0] });
  } catch (err) {
    console.error("POST /departments error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── PUT /:id ──────────────────────────────────────────────────────────────
// Update department
// Protected: Super Admin only.
router.put("/:id", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { id } = req.params;
  const { name, is_active } = req.body;

  if (!name && is_active === undefined) {
    return res.status(400).json({ message: "At least one field (name, is_active) to update is required." });
  }

  try {
    const [deptRows] = await pool.query("SELECT id FROM departments WHERE id = ?", [id]);
    if (deptRows.length === 0) {
      return res.status(404).json({ message: "Department not found." });
    }

    if (name) {
      const [existing] = await pool.query("SELECT id FROM departments WHERE name = ? AND id != ?", [name, id]);
      if (existing.length > 0) {
        return res.status(409).json({ message: "Another department with this name already exists." });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (is_active !== undefined) updates.is_active = is_active;

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = [...Object.values(updates), id];

    await pool.query(`UPDATE departments SET ${setClauses} WHERE id = ?`, values);
    
    await logAction(req.user.id, "department_updated", `Updated department ${id}. Modified: ${Object.keys(updates).join(", ")}`);

    const [rows] = await pool.query("SELECT * FROM departments WHERE id = ?", [id]);
    res.json({ message: "Department updated successfully.", department: rows[0] });
  } catch (err) {
    console.error("PUT /departments/:id error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── GET /hr/:userId ───────────────────────────────────────────────────────
// Get mapped departments for an HR user
// Protected: Super Admin only
router.get("/hr/:userId", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT department_id FROM hr_departments WHERE user_id = ?`,
      [userId]
    );
    const departmentIds = rows.map(r => r.department_id);
    res.json({ departmentIds });
  } catch (err) {
    console.error("GET /hr/:userId error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── POST /hr/:userId ──────────────────────────────────────────────────────
// Update mapped departments for an HR user
// Protected: Super Admin only
router.post("/hr/:userId", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { userId } = req.params;
  const { department_ids } = req.body; // Expects an array

  if (!Array.isArray(department_ids)) {
    return res.status(400).json({ message: "department_ids must be an array." });
  }

  try {
    // 1. Verify user exists and is HR
    const [userRows] = await pool.query(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND r.name = 'HR'`,
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found or is not an HR role." });
    }

    // 2. Delete existing
    await pool.query(`DELETE FROM hr_departments WHERE user_id = ?`, [userId]);

    // 3. Insert new mappings
    if (department_ids.length > 0) {
      const values = department_ids.map(deptId => [userId, deptId]);
      await pool.query(
        `INSERT INTO hr_departments (user_id, department_id) VALUES ?`,
        [values]
      );
    }

    await logAction(req.user.id, "hr_departments_updated", `Updated mapped departments for HR user ${userId}`);

    res.json({ message: "HR departments mapping updated successfully." });
  } catch (err) {
    console.error("POST /hr/:userId error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
