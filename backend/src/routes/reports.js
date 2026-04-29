const router = require("express").Router();
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");

// All reports routes require HR or Super Admin access.
const guard = [verifyToken, requireRole("HR", "Super Admin")];

function getDeptFilter(req, alias = "u", includeAnd = true) {
  if (req.user.role === "HR") {
    if (req.query.department_id) {
      return {
        sql: `${includeAnd ? " AND" : ""} ${alias}.department_id = ? AND EXISTS (SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?)`,
        param: [req.query.department_id, req.user.id, req.query.department_id]
      };
    }
    return {
      sql: `${includeAnd ? " AND" : ""} ${alias}.department_id IN (SELECT department_id FROM hr_departments WHERE user_id = ?)`,
      param: [req.user.id]
    };
  }
  return { sql: "", param: [] };
}

// GET /dashboard - HR dashboard stats and employee directory.
router.get("/dashboard", ...guard, async (req, res) => {
  try {
    const deptFilter = getDeptFilter(req, "u");
    const paramsStats = [];
    if (deptFilter.param.length > 0) {
      paramsStats.push(...deptFilter.param, ...deptFilter.param, ...deptFilter.param);
    }

    const [[stats]] = await pool.query(
      `SELECT
         (
           SELECT COUNT(*)
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE r.name = 'Employee'
             AND u.deleted_at IS NULL
             AND u.is_active = 1
             ${deptFilter.sql}
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
             ${deptFilter.sql}
         ) AS requests_today,
         (
           SELECT COUNT(*)
           FROM leave_requests lr
           JOIN users u ON lr.user_id = u.id
           JOIN roles r ON u.role_id = r.id
           WHERE r.name = 'Employee'
             AND u.deleted_at IS NULL
             AND u.is_active = 1
             AND lr.status IN ('pending', 'acknowledged')
             ${deptFilter.sql}
         ) AS total_pending`, paramsStats
    );

    const [employees] = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.profile_photo,
         p.name AS position,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM leave_requests lr
             WHERE lr.user_id = u.id
               AND lr.status IN ('approved', 'acknowledged')
               AND CURDATE() BETWEEN DATE(lr.start_date) AND DATE(lr.end_date)
           ) THEN 'On Leave'
           ELSE 'Active'
         END AS status
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN positions p ON u.position_id = p.id
       WHERE r.name = 'Employee'
         AND u.deleted_at IS NULL
         AND u.is_active = 1
         ${deptFilter.sql}
       ORDER BY
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM leave_requests lr
             WHERE lr.user_id = u.id
               AND lr.status IN ('approved', 'acknowledged')
               AND CURDATE() BETWEEN DATE(lr.start_date) AND DATE(lr.end_date)
           ) THEN 0
           ELSE 1
         END,
         u.full_name ASC`, deptFilter.param
    );

    res.json({ stats, employees });
  } catch (err) {
    console.error("GET /reports/dashboard error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /overview - Dashboard summary stats for HR.
// Returns: { stats: { total_employees, total_pending, total_approved_this_month, total_on_leave_today } }
router.get("/overview", ...guard, async (req, res) => {
  try {
    const deptFilterLr = getDeptFilter(req, "lr_u", true);
    const deptFilterU = getDeptFilter(req, "u", true);

    // We need to join users to leave_requests in overview to filter by department
    const lrJoins = `JOIN users lr_u ON leave_requests.user_id = lr_u.id`;

    const [rows] = await pool.query(
      `SELECT
         (
           SELECT COUNT(*)
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.is_active = 1
             AND u.deleted_at IS NULL
             AND r.name = 'Employee'
             ${deptFilterU.sql}
         ) AS total_employees,
         (
           SELECT COUNT(*)
           FROM leave_requests
           ${lrJoins}
           WHERE status = 'pending'
           ${deptFilterLr.sql}
         ) AS total_pending,
         (
           SELECT COUNT(*)
           FROM leave_requests
           ${lrJoins}
           WHERE status = 'approved'
             AND MONTH(updated_at) = MONTH(CURDATE())
             AND YEAR(updated_at) = YEAR(CURDATE())
             ${deptFilterLr.sql}
         ) AS total_approved_this_month,
         (
           SELECT COUNT(*)
           FROM leave_requests
           ${lrJoins}
           WHERE status = 'approved'
             AND CURDATE() BETWEEN start_date AND end_date
             ${deptFilterLr.sql}
         ) AS total_on_leave_today`,
      [...deptFilterU.param, ...deptFilterLr.param, ...deptFilterLr.param, ...deptFilterLr.param]
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
    const deptFilterU = getDeptFilter(req, "u", true);

    const params = [year, ...deptFilterU.param, year, ...deptFilterU.param];

    // Add param for the new lt.department_id scope filter
    let typeScopeSql = `AND EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = lt.id AND ltd.department_id IN (SELECT department_id FROM hr_departments WHERE user_id = ?))`;
    if (req.user.role === "HR") {
      if (req.query.department_id) {
        typeScopeSql = `AND EXISTS (SELECT 1 FROM leave_type_departments ltd WHERE ltd.leave_type_id = lt.id AND ltd.department_id = ?) AND EXISTS (SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?)`;
        params.push(req.query.department_id, req.user.id, req.query.department_id);
      } else {
        params.push(req.user.id);
      }
    }

    const [summary] = await pool.query(
      `SELECT
         MIN(lt.id) AS leave_type_id,
         lt.name AS leave_type_name,
         COUNT(lr.id) AS total_requests,
         SUM(CASE WHEN lr.status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
         COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) AS total_days_used,
         (
           SELECT COALESCE(SUM(lb.total_days), 0)
           FROM leave_balances lb
           JOIN users u ON lb.user_id = u.id
           JOIN roles r ON u.role_id = r.id
           WHERE lb.leave_type_id IN (SELECT id FROM leave_types WHERE name = lt.name) 
             AND lb.year = ? 
             AND r.name = 'Employee'
             AND ((YEAR(CURDATE()) - YEAR(u.hire_date)) * 12 + (MONTH(CURDATE()) - MONTH(u.hire_date))) >= lt.min_service_months
             ${deptFilterU.sql}
         ) AS total_allocated_days
       FROM leave_types lt
       LEFT JOIN (
           SELECT lr.* 
           FROM leave_requests lr 
           JOIN users u ON lr.user_id = u.id 
           JOIN roles r ON u.role_id = r.id 
           WHERE r.name = 'Employee' AND YEAR(lr.submitted_at) = ? AND lr.status = 'approved'
           ${deptFilterU.sql}
       ) lr ON lr.leave_type_id = lt.id
       WHERE lt.is_active = 1
         ${req.user.role === "HR" ? typeScopeSql : ""}
       GROUP BY lt.id, lt.name, lt.min_service_months
       ORDER BY lt.name ASC`,
      params
    );

    res.json({ year, summary });
  } catch (err) {
    console.error("GET /reports/leave-summary error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /monthly - Monthly leave days for the given year.
router.get("/monthly", ...guard, async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (isNaN(year) || year < 1000 || year > 9999) {
    return res.status(400).json({ message: "Invalid year parameter." });
  }

  try {
    const deptFilterU = getDeptFilter(req, "u", true);
    const params = [year, ...deptFilterU.param];

    const [monthly] = await pool.query(
      `SELECT
         MONTH(lr.start_date)                 AS month,
         COUNT(*)                               AS total_requests,
         COALESCE(SUM(lr.total_days), 0)        AS total_days,
         SUM(CASE WHEN lr.status = 'approved'  THEN lr.total_days ELSE 0 END) AS approved_days,
         SUM(CASE WHEN lr.status = 'rejected'  THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN lr.status = 'pending'   THEN 1 ELSE 0 END) AS pending
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE YEAR(lr.start_date) = ?
       ${deptFilterU.sql}
       GROUP BY MONTH(lr.start_date)
       ORDER BY month ASC`,
      params
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
    const deptFilterU = getDeptFilter(req, "u", true);

    // 1. Fetch all active employees
    const [employees] = await pool.query(
      `SELECT u.id, u.full_name, u.hire_date, u.department_id, u.profile_photo, d.name AS department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE r.name = 'Employee' AND u.deleted_at IS NULL AND u.is_active = 1
       ${deptFilterU.sql}
       ORDER BY d.name ASC, u.full_name ASC`,
      deptFilterU.param
    );

    // 2. Fetch all relevant active leave types with their department scopes
    let ltQuery = `
      SELECT id, name, min_service_months 
      FROM leave_types 
      WHERE is_active = 1
    `;
    let ltParams = [];
    if (req.user.role === "HR") {
      if (req.query.department_id) {
        ltQuery += " AND id IN (SELECT leave_type_id FROM leave_type_departments WHERE department_id = ?) AND EXISTS (SELECT 1 FROM hr_departments WHERE user_id = ? AND department_id = ?)";
        ltParams.push(req.query.department_id, req.user.id, req.query.department_id);
      } else {
        ltQuery += " AND id IN (SELECT leave_type_id FROM leave_type_departments WHERE department_id IN (SELECT department_id FROM hr_departments WHERE user_id = ?))";
        ltParams.push(req.user.id);
      }
    }
    const [leaveTypes] = await pool.query(ltQuery, ltParams);

    // Fetch department_ids for each leave type for scoping filter
    for (const lt of leaveTypes) {
      const [ltdRows] = await pool.query(
        "SELECT department_id FROM leave_type_departments WHERE leave_type_id = ?",
        [lt.id]
      );
      lt.department_ids = ltdRows.map(r => r.department_id);
    }

    // 3. Fetch all existing balances for the given year
    const [balances] = await pool.query(
      `SELECT user_id, leave_type_id, total_days, used_days FROM leave_balances WHERE year = ?`,
      [year]
    );

    // 4. Map balances for quick lookup
    const balanceMap = {};
    for (const b of balances) {
      balanceMap[`${b.user_id}_${b.leave_type_id}`] = b;
    }

    // 5. Build final response
    const now = new Date();
    const result = employees.map(u => {
      let serviceMonths = 0;
      if (u.hire_date) {
        const hireDate = new Date(u.hire_date);
        serviceMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
      }

      // Filter types that explicitly include this employee's department
      const relevantTypes = leaveTypes.filter(lt => lt.department_ids.includes(u.department_id));

      const empBalances = relevantTypes.map(lt => {
        const bal = balanceMap[`${u.id}_${lt.id}`];
        const isEligible = serviceMonths >= (lt.min_service_months || 0);
        return {
          leave_type_id: lt.id,
          leave_type_name: lt.name,
          total_days: bal ? bal.total_days : 0,
          used_days: bal ? bal.used_days : 0,
          is_eligible: isEligible
        };
      });

      return {
        user_id: u.id,
        full_name: u.full_name,
        hire_date: u.hire_date,
        department_id: u.department_id,
        department_name: u.department_name || 'Unknown Department',
        profile_photo: u.profile_photo || null,
        balances: empBalances
      };
    });

    res.json({ year, employees: result });
  } catch (err) {
    console.error("GET /reports/employee-balances error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
