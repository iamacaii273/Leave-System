const router = require("express").Router();
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

// All reports routes require HR or Super Admin access.
const guard = [verifyToken, requireRole("HR", "Super Admin")];

// GET /dashboard - HR dashboard stats and employee directory.
router.get("/dashboard", ...guard, async (_req, res) => {
  try {
    const [[stats]] = await pool.query(
      `SELECT
         (
           SELECT COUNT(*)
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE r.name = 'Employee'
             AND u.deleted_at IS NULL
             AND u.is_active = 1
         ) AS total_employees,
         (
           SELECT COUNT(*)
           FROM leave_requests lr
           JOIN users u ON lr.user_id = u.id
           JOIN roles r ON u.role_id = r.id
           WHERE r.name = 'Employee'
             AND u.deleted_at IS NULL
             AND u.is_active = 1
             AND DATE(lr.submitted_at) = CURDATE()
         ) AS requests_today,
         (
           SELECT COUNT(*)
           FROM leave_requests lr
           JOIN users u ON lr.user_id = u.id
           JOIN roles r ON u.role_id = r.id
           WHERE r.name = 'Employee'
             AND u.deleted_at IS NULL
             AND u.is_active = 1
             AND DATE(lr.submitted_at) = CURDATE()
             AND lr.status IN ('pending', 'acknowledged')
         ) AS pending_today`
    );

    const [employees] = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         p.name AS position,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM leave_requests lr
             WHERE lr.user_id = u.id
               AND lr.status IN ('approved', 'acknowledged')
               AND CURDATE() BETWEEN lr.start_date AND lr.end_date
           ) THEN 'On Leave'
           ELSE 'Active'
         END AS status
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN positions p ON u.position_id = p.id
       WHERE r.name = 'Employee'
         AND u.deleted_at IS NULL
         AND u.is_active = 1
       ORDER BY
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM leave_requests lr
             WHERE lr.user_id = u.id
               AND lr.status IN ('approved', 'acknowledged')
               AND CURDATE() BETWEEN lr.start_date AND lr.end_date
           ) THEN 0
           ELSE 1
         END,
         u.full_name ASC`
    );

    res.json({ stats, employees });
  } catch (err) {
    console.error("GET /reports/dashboard error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /overview - Dashboard summary stats for HR.
// Returns: { stats: { total_employees, total_pending, total_approved_this_month, total_on_leave_today } }
router.get("/overview", ...guard, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         (
           SELECT COUNT(*)
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.is_active = 1
             AND u.deleted_at IS NULL
             AND r.name = 'Employee'
         ) AS total_employees,
         (
           SELECT COUNT(*)
           FROM leave_requests
           WHERE status = 'pending'
         ) AS total_pending,
         (
           SELECT COUNT(*)
           FROM leave_requests
           WHERE status = 'approved'
             AND MONTH(updated_at) = MONTH(CURDATE())
             AND YEAR(updated_at) = YEAR(CURDATE())
         ) AS total_approved_this_month,
         (
           SELECT COUNT(*)
           FROM leave_requests
           WHERE status = 'approved'
             AND CURDATE() BETWEEN start_date AND end_date
         ) AS total_on_leave_today`
    );

    res.json({ stats: rows[0] });
  } catch (err) {
    console.error("GET /reports/overview error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /leave-summary - Leave usage summary grouped by leave type.
router.get("/leave-summary", ...guard, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (isNaN(year) || year < 1000 || year > 9999) {
    return res.status(400).json({ message: "Invalid year parameter." });
  }

  try {
    const [summary] = await pool.query(
      `SELECT
         lt.id AS leave_type_id,
         lt.name AS leave_type_name,
         COUNT(lr.id) AS total_requests,
         SUM(CASE WHEN lr.status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
         COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) AS total_days_used,
         (
           SELECT COALESCE(SUM(total_days), 0)
           FROM leave_balances lb
           WHERE lb.leave_type_id = lt.id AND lb.year = ?
         ) AS total_allocated_days
       FROM leave_types lt
       LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id AND YEAR(lr.submitted_at) = ? AND lr.status = 'approved'
       GROUP BY lt.id, lt.name
       ORDER BY lt.name ASC`,
      [year, year]
    );

    res.json({ year, summary });
  } catch (err) {
    console.error("GET /reports/leave-summary error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /monthly - Monthly leave request counts for the given year.
router.get("/monthly", ...guard, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (isNaN(year) || year < 1000 || year > 9999) {
    return res.status(400).json({ message: "Invalid year parameter." });
  }

  try {
    const [monthly] = await pool.query(
      `SELECT
         MONTH(submitted_at) AS month,
         COUNT(*) AS total_requests,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM leave_requests
       WHERE YEAR(submitted_at) = ?
       GROUP BY MONTH(submitted_at)
       ORDER BY month ASC`,
      [year]
    );

    res.json({ year, monthly });
  } catch (err) {
    console.error("GET /reports/monthly error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /employee-balances - Get all active employees with their leave balances for the given year.
router.get("/employee-balances", ...guard, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (isNaN(year) || year < 1000 || year > 9999) {
    return res.status(400).json({ message: "Invalid year parameter." });
  }

  try {
    const [employees] = await pool.query(
      `SELECT
         u.id AS user_id,
         u.full_name,
         u.hire_date,
         lb.leave_type_id,
         lt.name AS leave_type_name,
         lb.total_days,
         lb.used_days
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN leave_balances lb ON u.id = lb.user_id AND lb.year = ?
       LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE r.name = 'Employee'
         AND u.deleted_at IS NULL
         AND u.is_active = 1
       ORDER BY u.full_name ASC`,
      [year]
    );

    // Group by user
    const usersMap = {};
    for (const row of employees) {
      if (!usersMap[row.user_id]) {
        usersMap[row.user_id] = {
          user_id: row.user_id,
          full_name: row.full_name,
          hire_date: row.hire_date,
          balances: []
        };
      }
      if (row.leave_type_id) {
        usersMap[row.user_id].balances.push({
          leave_type_id: row.leave_type_id,
          leave_type_name: row.leave_type_name,
          total_days: row.total_days,
          used_days: row.used_days
        });
      }
    }

    res.json({ year, employees: Object.values(usersMap) });
  } catch (err) {
    console.error("GET /reports/employee-balances error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
