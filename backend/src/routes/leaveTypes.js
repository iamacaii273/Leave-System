const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

// ─── Shared SELECT ────────────────────────────────────────────────────────────
const LT_SELECT = `
  id, name, default_days_per_year, description,
  color_type, icon_name, requires_attachment,
  requires_manager_approval, carryover,
  is_active, min_service_months, created_at,
  department_id
`;

// GET / — Get all active leave types (all logged-in users)
router.get("/", verifyToken, async (req, res) => {
  try {
    let query = `SELECT ${LT_SELECT} FROM leave_types WHERE is_active = 1`;
    let params = [];

    // Filter based on role and department scope
    if (req.user.role === "Super Admin") {
      // Super Admin sees everything
    } else if (req.user.role === "HR") {
      // HR sees Global types (NULL) AND types for their assigned departments
      const [hrDepts] = await pool.query(
        "SELECT department_id FROM hr_departments WHERE user_id = ?",
        [req.user.id]
      );
      const deptIds = hrDepts.map((d) => d.department_id);

      if (deptIds.length > 0) {
        query += " AND (department_id IS NULL OR department_id IN (?))";
        params.push(deptIds);
      } else {
        query += " AND department_id IS NULL";
      }
    } else {
      // Regular users and Managers see Global types AND types for their own department
      if (req.user.department_id) {
        query += " AND (department_id IS NULL OR department_id = ?)";
        params.push(req.user.department_id);
      } else {
        query += " AND department_id IS NULL";
      }
    }

    query += " ORDER BY name ASC";
    const [rows] = await pool.query(query, params);
    res.json({ leaveTypes: rows });
  } catch (err) {
    console.error("Get leave types error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST / — Create a new leave type (HR or Super Admin)
router.post(
  "/",
  verifyToken,
  requireRole("Super Admin", "HR"),
  async (req, res) => {
    const {
      name,
      default_days_per_year,
      description,
      color_type,
      icon_name,
      requires_attachment,
      requires_manager_approval,
      carryover,
      min_service_months,
      department_id,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "name is required." });
    }

    try {
      // Scoping Permission Check
      if (req.user.role === "HR") {
        if (!department_id) {
          return res.status(403).json({
            message: "HR can only create department-scoped leave types.",
          });
        }
        const [check] = await pool.query(
          "SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?",
          [req.user.id, department_id]
        );
        if (check.length === 0) {
          return res.status(403).json({
            message:
              "You do not have permission to manage this department's leave types.",
          });
        }
      }

      // Unique check scoped to department (NULL-safe equality)
      const [existing] = await pool.query(
        "SELECT id FROM leave_types WHERE name = ? AND (department_id <=> ?)",
        [name.trim(), department_id ?? null]
      );

      if (existing.length > 0) {
        return res
          .status(409)
          .json({ message: "A leave type with this name already exists in this scope." });
      }

      const id = uuidv4();

      await pool.query(
        `INSERT INTO leave_types
           (id, name, default_days_per_year, description, color_type, icon_name, requires_attachment, requires_manager_approval, carryover, min_service_months, department_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name.trim(),
          default_days_per_year ?? null,
          description ?? null,
          color_type ?? "blue",
          icon_name ?? "umbrella",
          requires_attachment ? 1 : 0,
          requires_manager_approval !== false ? 1 : 0,
          carryover ? 1 : 0,
          min_service_months ?? 0,
          department_id ?? null,
        ],
      );

      const [created] = await pool.query(
        `SELECT ${LT_SELECT} FROM leave_types WHERE id = ?`,
        [id],
      );

      // Auto-provision balances for eligible active users (now scoped by department)
      const currentYear = new Date().getFullYear();
      let userQuery = "SELECT u.id, u.hire_date FROM users u JOIN roles r ON u.role_id = r.id WHERE u.is_active = 1 AND r.name = 'Employee'";
      let userParams = [];

      if (department_id) {
        userQuery += " AND u.department_id = ?";
        userParams.push(department_id);
      }

      const [users] = await pool.query(userQuery, userParams);

      if (users.length > 0) {
        const minMonths = min_service_months ?? 0;
        const now = new Date();
        const eligibleUsers = users.filter(u => {
          if (!u.hire_date) return minMonths === 0;
          const hireDate = new Date(u.hire_date);
          const serviceMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
          return serviceMonths >= minMonths;
        });

        if (eligibleUsers.length > 0) {
          const defaultDays = default_days_per_year ?? 0;
          const inserts = eligibleUsers.map(u => [
            uuidv4(), u.id, id, currentYear, defaultDays, 0, defaultDays
          ]);

          await pool.query(
            `INSERT INTO leave_balances
               (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
             VALUES ?`,
            [inserts]
          );
        }
      }

      res.status(201).json({
        message: "Leave type created successfully.",
        leaveType: created[0],
      });
    } catch (err) {
      console.error("Create leave type error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// PUT /:id — Update a leave type (HR or Super Admin)
router.put(
  "/:id",
  verifyToken,
  requireRole("Super Admin", "HR"),
  async (req, res) => {
    const { id } = req.params;
    const {
      name,
      default_days_per_year,
      description,
      color_type,
      icon_name,
      requires_attachment,
      requires_manager_approval,
      carryover,
      min_service_months,
      is_active,
      department_id,
    } = req.body;

    try {
      const [existing] = await pool.query(
        "SELECT id, department_id FROM leave_types WHERE id = ?",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Leave type not found." });
      }

      const lt = existing[0];

      // Permission Check
      if (req.user.role === "HR") {
        if (!lt.department_id) {
          return res.status(403).json({ message: "HR cannot modify global leave types." });
        }
        const [check] = await pool.query(
          "SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?",
          [req.user.id, lt.department_id]
        );
        if (check.length === 0) {
          return res.status(403).json({ message: "You do not have permission to manage this department's leave types." });
        }
      }

      const fields = [];
      const values = [];

      if (name !== undefined) {
        if (name.trim() === "") {
          return res.status(400).json({ message: "name cannot be empty." });
        }
        const targetDept = department_id !== undefined ? department_id : lt.department_id;
        const [duplicate] = await pool.query(
          "SELECT id FROM leave_types WHERE name = ? AND id != ? AND (department_id <=> ?)",
          [name.trim(), id, targetDept ?? null],
        );
        if (duplicate.length > 0) {
          return res
            .status(409)
            .json({ message: "A leave type with this name already exists in this scope." });
        }
        fields.push("name = ?"); values.push(name.trim());
      }

      if (default_days_per_year !== undefined) { fields.push("default_days_per_year = ?"); values.push(default_days_per_year); }
      if (description !== undefined) { fields.push("description = ?"); values.push(description); }
      if (color_type !== undefined) { fields.push("color_type = ?"); values.push(color_type); }
      if (icon_name !== undefined) { fields.push("icon_name = ?"); values.push(icon_name); }
      if (requires_attachment !== undefined) { fields.push("requires_attachment = ?"); values.push(requires_attachment ? 1 : 0); }
      if (requires_manager_approval !== undefined) { fields.push("requires_manager_approval = ?"); values.push(requires_manager_approval ? 1 : 0); }
      if (carryover !== undefined) { fields.push("carryover = ?"); values.push(carryover ? 1 : 0); }
      if (min_service_months !== undefined) { fields.push("min_service_months = ?"); values.push(min_service_months); }
      if (is_active !== undefined) { fields.push("is_active = ?"); values.push(is_active ? 1 : 0); }

      // Moving a leave type between departments (Super Admin only usually, but let's provide the field)
      if (department_id !== undefined && req.user.role === 'Super Admin') {
        fields.push("department_id = ?");
        values.push(department_id);
      }

      if (fields.length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update." });
      }

      values.push(id);
      await pool.query(
        `UPDATE leave_types SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );

      const [updated] = await pool.query(
        `SELECT ${LT_SELECT} FROM leave_types WHERE id = ?`,
        [id],
      );

      res.json({
        message: "Leave type updated successfully.",
        leaveType: updated[0],
      });
    } catch (err) {
      console.error("Update leave type error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// DELETE /:id — Soft-delete by setting is_active = 0 (HR or Super Admin)
router.delete(
  "/:id",
  verifyToken,
  requireRole("Super Admin", "HR"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [existing] = await pool.query(
        "SELECT id, is_active, department_id FROM leave_types WHERE id = ?",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Leave type not found." });
      }

      const lt = existing[0];

      // Permission Check
      if (req.user.role === "HR") {
        if (!lt.department_id) {
          return res.status(403).json({ message: "HR cannot delete global leave types." });
        }
        const [check] = await pool.query(
          "SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?",
          [req.user.id, lt.department_id]
        );
        if (check.length === 0) {
          return res.status(403).json({ message: "You do not have permission to manage this department's leave types." });
        }
      }

      if (lt.is_active === 0) {
        return res.status(409).json({ message: "Leave type is already inactive." });
      }

      await pool.query("UPDATE leave_types SET is_active = 0 WHERE id = ?", [id]);

      res.json({ message: "Leave type deactivated successfully." });
    } catch (err) {
      console.error("Deactivate leave type error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

module.exports = router;

