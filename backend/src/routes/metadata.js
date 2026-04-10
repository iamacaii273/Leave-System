const router = require("express").Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

router.get("/roles", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM roles ORDER BY name ASC");
    res.json({ roles: rows });
  } catch (err) {
    console.error("GET /roles error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

router.get("/positions", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM positions WHERE deleted_at IS NULL ORDER BY name ASC");
    res.json({ positions: rows });
  } catch (err) {
    console.error("GET /positions error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
