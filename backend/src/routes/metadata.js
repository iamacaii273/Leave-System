const router = require("express").Router();
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAction } = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

// ─── GET /roles ───────────────────────────────────────────────────────────────
router.get("/roles", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM roles ORDER BY name ASC");
    res.json({ roles: rows });
  } catch (err) {
    console.error("GET /roles error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── GET /positions ───────────────────────────────────────────────────────────
// Get all active (non-deleted) positions.
router.get("/positions", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, r.name AS role_name
       FROM positions p
       JOIN roles r ON p.role_id = r.id
       WHERE p.deleted_at IS NULL
       ORDER BY r.name ASC, p.name ASC`
    );
    res.json({ positions: rows });
  } catch (err) {
    console.error("GET /positions error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── GET /positions/all ───────────────────────────────────────────────────────
// Get all positions including soft-deleted (for Super Admin management).
router.get("/positions/all", verifyToken, requireRole("Super Admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, r.name AS role_name
       FROM positions p
       JOIN roles r ON p.role_id = r.id
       ORDER BY p.deleted_at IS NOT NULL ASC, r.name ASC, p.name ASC`
    );
    res.json({ positions: rows });
  } catch (err) {
    console.error("GET /positions/all error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── POST /positions ──────────────────────────────────────────────────────────
// Create a new position.
// Body: { name, role_id }
// Protected: Super Admin only.
router.post("/positions", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { name, role_id } = req.body;

  if (!name || !role_id) {
    return res.status(400).json({ message: "Position name and role_id are required." });
  }

  try {
    // Validate role_id
    const [roleRows] = await pool.query("SELECT id FROM roles WHERE id = ?", [role_id]);
    if (roleRows.length === 0) {
      return res.status(400).json({ message: "Invalid role_id." });
    }

    // Check for duplicate name
    const [existing] = await pool.query(
      "SELECT id FROM positions WHERE name = ? AND deleted_at IS NULL",
      [name]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "A position with this name already exists." });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO positions (id, role_id, name) VALUES (?, ?, ?)`,
      [id, role_id, name]
    );

    await logAction(req.user.id, "position_created", `Created position: ${name}`);

    const [rows] = await pool.query(
      `SELECT p.*, r.name AS role_name
       FROM positions p
       JOIN roles r ON p.role_id = r.id
       WHERE p.id = ?`,
      [id]
    );
    res.status(201).json({ message: "Position created successfully.", position: rows[0] });
  } catch (err) {
    console.error("POST /positions error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── PUT /positions/:id ───────────────────────────────────────────────────────
// Update a position.
// Body: { name?, role_id? }
// Protected: Super Admin only.
router.put("/positions/:id", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { id } = req.params;
  const { name, role_id } = req.body;

  if (name === undefined && role_id === undefined) {
    return res.status(400).json({ message: "At least one field (name, role_id) is required." });
  }

  try {
    const [posRows] = await pool.query(
      "SELECT id FROM positions WHERE id = ?",
      [id]
    );
    if (posRows.length === 0) {
      return res.status(404).json({ message: "Position not found." });
    }

    if (name) {
      const [existing] = await pool.query(
        "SELECT id FROM positions WHERE name = ? AND id != ?",
        [name, id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "Another position with this name already exists." });
      }
    }

    if (role_id) {
      const [roleRows] = await pool.query("SELECT id FROM roles WHERE id = ?", [role_id]);
      if (roleRows.length === 0) {
        return res.status(400).json({ message: "Invalid role_id." });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (role_id) updates.role_id = role_id;

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = [...Object.values(updates), id];

    await pool.query(`UPDATE positions SET ${setClauses} WHERE id = ?`, values);

    await logAction(req.user.id, "position_updated", `Updated position ${id}. Modified: ${Object.keys(updates).join(", ")}`);

    const [rows] = await pool.query(
      `SELECT p.*, r.name AS role_name
       FROM positions p
       JOIN roles r ON p.role_id = r.id
       WHERE p.id = ?`,
      [id]
    );
    res.json({ message: "Position updated successfully.", position: rows[0] });
  } catch (err) {
    console.error("PUT /positions/:id error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── DELETE /positions/:id ────────────────────────────────────────────────────
// Soft-delete a position.
// Protected: Super Admin only.
router.delete("/positions/:id", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const [posRows] = await pool.query(
      "SELECT id, name FROM positions WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
    if (posRows.length === 0) {
      return res.status(404).json({ message: "Position not found." });
    }

    // Check if any active users use this position
    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE position_id = ? AND deleted_at IS NULL",
      [id]
    );
    if (userRows.length > 0) {
      return res.status(409).json({
        message: `Cannot delete position: ${userRows.length} user(s) are currently assigned to it.`
      });
    }

    await pool.query("UPDATE positions SET deleted_at = NOW() WHERE id = ?", [id]);

    await logAction(req.user.id, "position_deleted", `Deleted position: ${posRows[0].name}`);

    res.json({ message: "Position deleted successfully." });
  } catch (err) {
    console.error("DELETE /positions/:id error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─── PUT /positions/:id/restore ───────────────────────────────────────────────
// Restore a soft-deleted position.
// Protected: Super Admin only.
router.put("/positions/:id/restore", verifyToken, requireRole("Super Admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const [posRows] = await pool.query(
      "SELECT id, name FROM positions WHERE id = ? AND deleted_at IS NOT NULL",
      [id]
    );
    if (posRows.length === 0) {
      return res.status(404).json({ message: "Position not found or not deleted." });
    }

    await pool.query("UPDATE positions SET deleted_at = NULL WHERE id = ?", [id]);

    await logAction(req.user.id, "position_restored", `Restored position: ${posRows[0].name}`);

    const [rows] = await pool.query(
      `SELECT p.*, r.name AS role_name
       FROM positions p
       JOIN roles r ON p.role_id = r.id
       WHERE p.id = ?`,
      [id]
    );
    res.json({ message: "Position restored successfully.", position: rows[0] });
  } catch (err) {
    console.error("PUT /positions/:id/restore error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
