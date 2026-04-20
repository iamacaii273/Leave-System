const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

// ─── Shared SELECT ────────────────────────────────────────────────────────────
const LT_SELECT = `
  id, name, default_days_per_year, description,
  color_type, icon_name, requires_attachment,
  is_active, min_service_months, created_at
`;

// GET / — Get all active leave types (all logged-in users)
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${LT_SELECT} FROM leave_types WHERE is_active = 1 ORDER BY name ASC`,
    );
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
      min_service_months,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "name is required." });
    }

    try {
      const [existing] = await pool.query(
        "SELECT id FROM leave_types WHERE name = ?",
        [name.trim()],
      );

      if (existing.length > 0) {
        return res
          .status(409)
          .json({ message: "A leave type with this name already exists." });
      }

      const id = uuidv4();

      await pool.query(
        `INSERT INTO leave_types
           (id, name, default_days_per_year, description, color_type, icon_name, requires_attachment, min_service_months)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name.trim(),
          default_days_per_year ?? null,
          description ?? null,
          color_type ?? "blue",
          icon_name ?? "umbrella",
          requires_attachment ? 1 : 0,
          min_service_months ?? 0,
        ],
      );

      const [created] = await pool.query(
        `SELECT ${LT_SELECT} FROM leave_types WHERE id = ?`,
        [id],
      );

      // Auto-provision balances for all active users so that Reports and Employee Lists reflect it immediately
      const currentYear = new Date().getFullYear();
      const [users] = await pool.query(
        "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE u.is_active = 1 AND r.name = 'Employee'"
      );
      if (users.length > 0) {
        const defaultDays = default_days_per_year ?? 0;
        const inserts = users.map(u => [
          uuidv4(), u.id, id, currentYear, defaultDays, 0, defaultDays
        ]);
        
        await pool.query(
          `INSERT INTO leave_balances
             (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
           VALUES ?`,
          [inserts]
        );
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
      min_service_months,
      is_active,
    } = req.body;

    try {
      const [existing] = await pool.query(
        "SELECT id FROM leave_types WHERE id = ?",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Leave type not found." });
      }

      const fields = [];
      const values = [];

      if (name !== undefined) {
        if (name.trim() === "") {
          return res.status(400).json({ message: "name cannot be empty." });
        }
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

      if (default_days_per_year !== undefined) { fields.push("default_days_per_year = ?"); values.push(default_days_per_year); }
      if (description !== undefined)           { fields.push("description = ?");           values.push(description); }
      if (color_type !== undefined)            { fields.push("color_type = ?");            values.push(color_type); }
      if (icon_name !== undefined)             { fields.push("icon_name = ?");             values.push(icon_name); }
      if (requires_attachment !== undefined)   { fields.push("requires_attachment = ?");   values.push(requires_attachment ? 1 : 0); }
      if (min_service_months !== undefined)    { fields.push("min_service_months = ?");    values.push(min_service_months); }
      if (is_active !== undefined)             { fields.push("is_active = ?");             values.push(is_active ? 1 : 0); }

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
        "SELECT id, is_active FROM leave_types WHERE id = ?",
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Leave type not found." });
      }

      if (existing[0].is_active === 0) {
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
