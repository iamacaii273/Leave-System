const router = require("express").Router();
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

// All reports routes require HR or Super Admin access
const guard = [verifyToken, requireRole("HR", "Super Admin")];

// ─────────────────────────────────────────────────────────────────────────────
// GET /overview — Dashboard summary stats for HR
// Returns: { stats: { total_employees, total_pending,
//                     total_approved_this_month, total_on_leave_today } }
// Protected: HR, Super Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get("/overview", ...guard, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         (
           SELECT COUNT(*)
           FROM   users u
           JOIN   roles r ON u.role_id = r.id
           WHERE  u.is_active   = 1
             AND  u.deleted_at  IS NULL
             AND  r.name        = 'Employee'
         ) AS total_employees,

         (
           SELECT COUNT(*)
           FROM   leave_requests
           WHERE  status = 'pending'
         ) AS total_pending,

         (
           SELECT COUNT(*)
           FROM   leave_requests
           WHERE  status        = 'approved'
             AND  MONTH(updated_at) = MONTH(CURDATE())
             AND  YEAR(updated_at)  = YEAR(CURDATE())
         ) AS total_approved_this_month,

         (
           SELECT COUNT(*)
           FROM   leave_requests
           WHERE  status    = 'approved'
             AND  CURDATE() BETWEEN start_date AND end_date
         ) AS total_on_leave_today`,
    );

    res.json({ stats: rows[0] });
  } catch (err) {
    console.error("GET /reports/overview error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /leave-summary — Leave usage summary grouped by leave type
// Query params: ?year=2025  (default: current year)
// Returns: { year, summary: [{ leave_type_id, leave_type_name,
//                               total_requests, approved_requests,
//                               total_days_used }] }
// Protected: HR, Super Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get("/leave-summary", ...guard, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (isNaN(year) || year < 1000 || year > 9999) {
    return res.status(400).json({ message: "Invalid year parameter." });
  }

  try {
    const [summary] = await pool.query(
      `SELECT
         lt.id                                                                             AS leave_type_id,
         lt.name                                                                           AS leave_type_name,
         COUNT(lr.id)                                                                      AS total_requests,
         SUM(CASE WHEN lr.status = 'approved' THEN 1   ELSE 0   END)                      AS approved_requests,
         COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) AS total_days_used
       FROM      leave_requests lr
       JOIN      leave_types    lt ON lr.leave_type_id = lt.id
       WHERE     YEAR(lr.submitted_at) = ?
       GROUP BY  lt.id, lt.name
       ORDER BY  lt.name ASC`,
      [year],
    );

    res.json({ year, summary });
  } catch (err) {
    console.error("GET /reports/leave-summary error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /monthly — Monthly leave request counts for the given year (chart data)
// Query params: ?year=2025  (default: current year)
// Returns: { year, monthly: [{ month, total_requests, approved,
//                               rejected, pending }] }
// Only months that have at least one request are included.
// Protected: HR, Super Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get("/monthly", ...guard, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (isNaN(year) || year < 1000 || year > 9999) {
    return res.status(400).json({ message: "Invalid year parameter." });
  }

  try {
    const [monthly] = await pool.query(
      `SELECT
         MONTH(submitted_at)                                            AS month,
         COUNT(*)                                                       AS total_requests,
         SUM(CASE WHEN status = 'approved'  THEN 1 ELSE 0 END)         AS approved,
         SUM(CASE WHEN status = 'rejected'  THEN 1 ELSE 0 END)         AS rejected,
         SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END)         AS pending
       FROM     leave_requests
       WHERE    YEAR(submitted_at) = ?
       GROUP BY MONTH(submitted_at)
       ORDER BY month ASC`,
      [year],
    );

    res.json({ year, monthly });
  } catch (err) {
    console.error("GET /reports/monthly error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
