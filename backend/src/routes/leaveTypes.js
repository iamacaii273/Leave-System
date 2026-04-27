const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

// ─── Shared SELECT ────────────────────────────────────────────────────────────
const LT_SELECT = `
  id, name, default_days_per_year, description,
  color_type, icon_name, requires_attachment,
  requires_manager_approval, carryover,
  is_active, min_service_months, created_at
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
      const [hrDepts] = await pool.query(
        "SELECT department_id FROM hr_departments WHERE user_id = ?",
        [req.user.id]
      );
      const deptIds = hrDepts.map((d) => d.department_id);

      if (deptIds.length > 0) {
        query += ` AND (
          NOT EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = id)
          OR
          EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = id AND ltd.department_id IN (?))
        )`;
        params.push(deptIds);
      } else {
        query += " AND NOT EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = id)";
      }
    } else {
      const userDeptId = req.user.department_id;
      if (userDeptId) {
        query += ` AND (
          NOT EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = id)
          OR
          EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = id AND ltd.department_id = ?)
        )`;
        params.push(userDeptId);
      } else {
        query += " AND NOT EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = id)";
      }
    }

    query += " ORDER BY name ASC";
    const [rows] = await pool.query(query, params);

    // Fetch department_ids for each leave type
    for (const row of rows) {
      const [ltdRows] = await pool.query(
        "SELECT department_id FROM leave_type_departments WHERE leave_type_id = ?",
        [row.id]
      );
      row.department_ids = ltdRows.map(r => r.department_id);
    }

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
      department_ids, // array of IDs
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "name is required." });
    }

    try {
      // Scoping Permission Check
      if (req.user.role === "HR") {
        if (!department_ids || !Array.isArray(department_ids) || department_ids.length === 0) {
          return res.status(403).json({
            message: "HR can only create department-scoped leave types (multi-department support enabled).",
          });
        }
        const [managedDepts] = await pool.query(
          "SELECT department_id FROM hr_departments WHERE user_id = ?",
          [req.user.id]
        );
        const managedIds = new Set(managedDepts.map(d => d.department_id));
        for (const deptId of department_ids) {
          if (!managedIds.has(deptId)) {
            return res.status(403).json({
              message: `You do not have permission to manage department ID: ${deptId}.`,
            });
          }
        }
      }

      const id = uuidv4();

      await pool.query(
        `INSERT INTO leave_types
           (id, name, default_days_per_year, description, color_type, icon_name, requires_attachment, requires_manager_approval, carryover, min_service_months)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ],
      );

      // Insert into junction table
      if (department_ids && Array.isArray(department_ids) && department_ids.length > 0) {
        const ltdInserts = department_ids.map(deptId => [id, deptId]);
        await pool.query(
          "INSERT INTO leave_type_departments (leave_type_id, department_id) VALUES ?",
          [ltdInserts]
        );
      }

      const [created] = await pool.query(
        `SELECT ${LT_SELECT} FROM leave_types WHERE id = ?`,
        [id],
      );

      // Auto-provision balances for eligible active users (now scoped by multiple departments)
      const currentYear = new Date().getFullYear();
      let userQuery = "SELECT u.id, u.hire_date FROM users u JOIN roles r ON u.role_id = r.id WHERE u.is_active = 1 AND r.name = 'Employee'";
      let userParams = [];

      if (department_ids && department_ids.length > 0) {
        userQuery += " AND u.department_id IN (?)";
        userParams.push(department_ids);
      } else {
        // Global: provision for everyone? Usually yes, if it's Global.
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

      const createdLT = created[0];
      createdLT.department_ids = department_ids || [];

      res.status(201).json({
        message: "Leave type created successfully.",
        leaveType: createdLT,
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
      department_ids, // array
    } = req.body;

    try {
      const [existingRows] = await pool.query(
        "SELECT id, default_days_per_year FROM leave_types WHERE id = ?",
        [id],
      );

      if (existingRows.length === 0) {
        return res.status(404).json({ message: "Leave type not found." });
      }

      const existingRecord = existingRows[0];
      const oldDefault = existingRecord.default_days_per_year || 0;

      // Permission Check
      if (req.user.role === "HR") {
        const [ltdRows] = await pool.query(
          "SELECT department_id FROM leave_type_departments WHERE leave_type_id = ?",
          [id]
        );

        const [managedDepts] = await pool.query(
          "SELECT department_id FROM hr_departments WHERE user_id = ?",
          [req.user.id]
        );
        const managedIds = new Set(managedDepts.map(d => d.department_id));

        // Must manage all currently assigned departments
        for (const r of ltdRows) {
          if (!managedIds.has(r.department_id)) {
            return res.status(403).json({ message: "You do not have permission to manage this leave type as it belongs to at least one department you don't manage." });
          }
        }
      }

      const fields = [];
      const values = [];

      if (name !== undefined) {
        if (name.trim() === "") {
          return res.status(400).json({ message: "name cannot be empty." });
        }
        // Simplified unique check (can be improved to check across departments if needed)
        const [duplicate] = await pool.query(
          "SELECT id FROM leave_types WHERE name = ? AND id != ?",
          [name.trim(), id],
        );
        if (duplicate.length > 0) {
          return res
            .status(409)
            .json({ message: "A leave type with this name already exists." });
        }
        fields.push("name = ?"); values.push(name.trim());
      }

      let diffDays = 0;
      if (default_days_per_year !== undefined) {
        diffDays = Number(default_days_per_year) - oldDefault;
        fields.push("default_days_per_year = ?");
        values.push(default_days_per_year);
      }
      if (description !== undefined) { fields.push("description = ?"); values.push(description); }
      if (color_type !== undefined) { fields.push("color_type = ?"); values.push(color_type); }
      if (icon_name !== undefined) { fields.push("icon_name = ?"); values.push(icon_name); }
      if (requires_attachment !== undefined) { fields.push("requires_attachment = ?"); values.push(requires_attachment ? 1 : 0); }
      if (requires_manager_approval !== undefined) { fields.push("requires_manager_approval = ?"); values.push(requires_manager_approval ? 1 : 0); }
      if (carryover !== undefined) { fields.push("carryover = ?"); values.push(carryover ? 1 : 0); }
      if (min_service_months !== undefined) { fields.push("min_service_months = ?"); values.push(min_service_months); }
      if (is_active !== undefined) { fields.push("is_active = ?"); values.push(is_active ? 1 : 0); }

      // Updating department scope
      let scopeUpdated = false;
      if (department_ids !== undefined) {
        if (req.user.role === "HR") {
          if (!department_ids || !Array.isArray(department_ids) || department_ids.length === 0) {
            return res.status(403).json({ message: "HR cannot move leave types to global scope." });
          }
          const [managedDepts] = await pool.query(
            "SELECT department_id FROM hr_departments WHERE user_id = ?",
            [req.user.id]
          );
          const managedIds = new Set(managedDepts.map(d => d.department_id));
          for (const deptId of department_ids) {
            if (!managedIds.has(deptId)) {
              return res.status(403).json({ message: `You do not have permission to move to department ID: ${deptId}.` });
            }
          }
        }

        // Update junction table
        await pool.query("DELETE FROM leave_type_departments WHERE leave_type_id = ?", [id]);
        if (department_ids && department_ids.length > 0) {
          const ltdInserts = department_ids.map(deptId => [id, deptId]);
          await pool.query("INSERT INTO leave_type_departments (leave_type_id, department_id) VALUES ?", [ltdInserts]);
        }
        scopeUpdated = true;
      }

      if (fields.length === 0 && !scopeUpdated) {
        return res.status(400).json({ message: "No valid fields provided for update." });
      }

      if (fields.length > 0) {
        values.push(id);
        await pool.query(
          `UPDATE leave_types SET ${fields.join(", ")} WHERE id = ?`,
          values,
        );
      }

      // Update balances if default days changed
      if (diffDays !== 0) {
        const currentYear = new Date().getFullYear();
        await pool.query(
          `UPDATE leave_balances 
           SET total_days = total_days + ?, remaining_days = remaining_days + ? 
           WHERE leave_type_id = ? AND year = ?`,
          [diffDays, diffDays, id, currentYear]
        );
      }

      const [updated] = await pool.query(
        `SELECT ${LT_SELECT} FROM leave_types WHERE id = ?`,
        [id],
      );

      const [updatedRows] = await pool.query(
        `SELECT ${LT_SELECT} FROM leave_types WHERE id = ?`,
        [id],
      );
      const updatedLT = updatedRows[0];
      const [ltdRows] = await pool.query(
        "SELECT department_id FROM leave_type_departments WHERE leave_type_id = ?",
        [id]
      );
      updatedLT.department_ids = ltdRows.map(r => r.department_id);

      res.json({
        message: "Leave type updated successfully.",
        leaveType: updatedLT,
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
        "SELECT id, is_active FROM leave_types WHERE id = ?",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Leave type not found." });
      }

      const lt = existing[0];

      // Permission Check
      if (req.user.role === "HR") {
        const [ltdRows] = await pool.query(
          "SELECT department_id FROM leave_type_departments WHERE leave_type_id = ?",
          [id]
        );
        if (ltdRows.length === 0) {
          return res.status(403).json({ message: "HR cannot delete global leave types." });
        }

        const [managedDepts] = await pool.query(
          "SELECT department_id FROM hr_departments WHERE user_id = ?",
          [req.user.id]
        );
        const managedIds = new Set(managedDepts.map(d => d.department_id));

        for (const r of ltdRows) {
          if (!managedIds.has(r.department_id)) {
            return res.status(403).json({ message: "You do not have permission to deactivate this leave type as it belongs to at least one department you don't manage." });
          }
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

