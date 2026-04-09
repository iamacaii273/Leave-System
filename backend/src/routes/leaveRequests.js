const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAction } = require("../utils/logger");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─── Multer setup ───────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// ─────────────────────────────────────────────────────────────────────────────
// GET /me — Get the current user's own leave requests
// Protected: verifyToken
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         lr.id,
         lr.user_id,
         lr.leave_type_id,
         lt.name             AS leave_type_name,
         lr.start_date,
         lr.end_date,
         lr.total_days,
         lr.reason,
         lr.status,
         lr.approved_by,
         approver.full_name  AS approved_by_name,
         lr.reject_reason,
         lr.submitted_at,
         lr.updated_at
       FROM leave_requests lr
       JOIN      leave_types lt       ON lr.leave_type_id = lt.id
       LEFT JOIN users       approver ON lr.approved_by   = approver.id
       WHERE lr.user_id = ?
       ORDER BY lr.submitted_at DESC`,
      [req.user.id],
    );

    res.json({ leaveRequests: rows });
  } catch (err) {
    console.error("Get my leave requests error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Submit a new leave request
// Protected: verifyToken
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", verifyToken, upload.array("files", 10), async (req, res) => {
  const { leave_type_id, start_date, end_date, total_days, reason } = req.body;

  if (!leave_type_id || !start_date || !end_date || total_days == null) {
    return res.status(400).json({
      message:
        "leave_type_id, start_date, end_date, and total_days are required.",
    });
  }

  const parsedDays = Number(total_days);
  if (isNaN(parsedDays) || parsedDays <= 0) {
    return res
      .status(400)
      .json({ message: "total_days must be a positive number." });
  }

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ message: "start_date and end_date must be valid dates." });
  }

  if (start > end) {
    return res
      .status(400)
      .json({ message: "start_date must not be after end_date." });
  }

  try {
    const currentYear = new Date().getFullYear();

    const [balanceRows] = await pool.query(
      `SELECT remaining_days
       FROM leave_balances
       WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [req.user.id, leave_type_id, currentYear],
    );

    if (balanceRows.length === 0) {
      return res.status(400).json({
        message:
          "No leave balance record found for this leave type in the current year.",
      });
    }

    const remainingDays = parseFloat(balanceRows[0].remaining_days);

    if (remainingDays < parsedDays) {
      return res.status(400).json({
        message:
          `Insufficient leave balance. ` +
          `Remaining: ${remainingDays} day(s), Requested: ${parsedDays} day(s).`,
      });
    }

    // ── Overlap check: reject if any active request covers the same dates ──
    const [overlaps] = await pool.query(
      `SELECT id FROM leave_requests
       WHERE user_id = ?
         AND status NOT IN ('rejected', 'cancelled')
         AND start_date <= ? AND end_date >= ?`,
      [req.user.id, end_date, start_date]
    );
    if (overlaps.length > 0) {
      return res.status(400).json({
        message: "You already have a leave request that overlaps with the selected dates."
      });
    }

    const id = uuidv4();
    let computedStatus = 'pending';
    if (leave_type_id === 'lt000001-0000-0000-0000-000000000001') {
      computedStatus = 'acknowledged';
    }

    await pool.query(
      `INSERT INTO leave_requests
         (id, user_id, leave_type_id, start_date, end_date, total_days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        leave_type_id,
        start_date,
        end_date,
        parsedDays,
        reason ?? null,
        computedStatus
      ],
    );

    await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days + ?, remaining_days = remaining_days - ?
       WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [parsedDays, parsedDays, req.user.id, leave_type_id, currentYear]
    );

    // ── Save uploaded files ──────────────────────────────────────────────────
    if (req.files && req.files.length > 0) {
      const fileInserts = req.files.map(f => [
        uuidv4(),
        id,
        f.originalname,
        f.filename,
        f.mimetype,
        f.size,
      ]);
      await pool.query(
        `INSERT INTO leave_request_files
           (id, leave_request_id, original_name, stored_name, mime_type, size_bytes)
         VALUES ?`,
        [fileInserts]
      );
    }

    const [created] = await pool.query(
      `SELECT lr.*, lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.id = ?`,
      [id],
    );

    await logAction(
      req.user.id,
      "request_submitted",
      `Leave request submitted: ${parsedDays} day(s) of leave type ${leave_type_id} from ${start_date} to ${end_date}.`,
    );

    res.status(201).json({
      message: "Leave request submitted successfully.",
      leaveRequest: created[0],
    });
  } catch (err) {
    console.error("Submit leave request error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id/cancel — Cancel own pending leave request
// Protected: verifyToken
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/cancel", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT id, user_id, status, total_days, leave_type_id, start_date FROM leave_requests WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Leave request not found." });
    }

    const request = rows[0];

    if (request.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only cancel your own leave requests." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: `Only pending requests can be cancelled. Current status: '${request.status}'.`,
      });
    }

    const requestYear = new Date(request.start_date).getFullYear();

    await pool.query(
      "UPDATE leave_requests SET status = 'cancelled' WHERE id = ?",
      [id],
    );

    await pool.query(
      `UPDATE leave_balances
       SET used_days = used_days - ?, remaining_days = remaining_days + ?
       WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [request.total_days, request.total_days, request.user_id, request.leave_type_id, requestYear]
    );

    await logAction(
      req.user.id,
      "request_cancelled",
      `Leave request ${id} cancelled by the requester.`,
    );

    res.json({ message: "Leave request cancelled successfully." });
  } catch (err) {
    console.error("Cancel leave request error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /team — Get leave requests for employees (Manager's team view)
// Protected: Manager, HR, Super Admin
// Query params: ?status=  ?leave_type_id=
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/team",
  verifyToken,
  requireRole("Manager", "HR", "Super Admin", "Employee"),
  async (req, res) => {
    try {
      const { status, leave_type_id } = req.query;

      const conditions = ["r.name = 'Employee'"];
      const params = [];

      if (status) {
        const validStatuses = [
          "pending",
          "approved",
          "rejected",
          "cancelled",
          "acknowledged",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: `Invalid status filter. Must be one of: ${validStatuses.join(", ")}.`,
          });
        }
        conditions.push("lr.status = ?");
        params.push(status);
      }

      if (leave_type_id) {
        conditions.push("lr.leave_type_id = ?");
        params.push(leave_type_id);
      }

      const where = `WHERE ${conditions.join(" AND ")}`;

      const [rows] = await pool.query(
        `SELECT
           lr.id,
           lr.user_id,
           u.full_name,
           u.email,
           lr.leave_type_id,
           lt.name             AS leave_type_name,
           lr.start_date,
           lr.end_date,
           lr.total_days,
           lr.reason,
           lr.status,
           lr.approved_by,
           approver.full_name  AS approved_by_name,
           lr.reject_reason,
           lr.submitted_at,
           lr.updated_at
         FROM leave_requests lr
         JOIN      users       u        ON lr.user_id       = u.id
         JOIN      roles       r        ON u.role_id        = r.id
         JOIN      leave_types lt       ON lr.leave_type_id = lt.id
         LEFT JOIN users       approver ON lr.approved_by   = approver.id
         ${where}
         ORDER BY lr.submitted_at DESC`,
        params,
      );

      res.json({ leaveRequests: rows });
    } catch (err) {
      console.error("Get team leave requests error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /:id — Get a single leave request with full detail (for manager view)
// Protected: Manager, HR, Super Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  verifyToken,
  requireRole("HR", "Manager", "Super Admin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      // 1. Main request + employee profile
      const [rows] = await pool.query(
        `SELECT
           lr.id,
           lr.user_id,
           u.full_name,
           u.email,
           u.hire_date,
           u.position_id,
           p.name        AS position,
           lr.leave_type_id,
           lt.name       AS leave_type_name,
           lr.start_date,
           lr.end_date,
           lr.total_days,
           lr.reason,
           lr.status,
           lr.approved_by,
           approver.full_name AS approved_by_name,
           lr.reject_reason,
           lr.submitted_at,
           lr.updated_at
         FROM leave_requests lr
         JOIN      users       u        ON lr.user_id       = u.id
         LEFT JOIN positions   p        ON u.position_id    = p.id
         JOIN      leave_types lt       ON lr.leave_type_id = lt.id
         LEFT JOIN users       approver ON lr.approved_by   = approver.id
         WHERE lr.id = ?`,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ message: "Leave request not found." });
      const request = rows[0];

      // 2. Attached files
      const [files] = await pool.query(
        `SELECT id, original_name, stored_name, mime_type, size_bytes
         FROM leave_request_files WHERE leave_request_id = ?`,
        [id]
      );

      // 3. Previous requests by the same employee (last 5, excluding this one)
      const [history] = await pool.query(
        `SELECT
           lr.id,
           lt.name   AS leave_type_name,
           lr.start_date,
           lr.end_date,
           lr.total_days,
           lr.status,
           lr.submitted_at
         FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.user_id = ? AND lr.id != ?
         ORDER BY lr.submitted_at DESC
         LIMIT 5`,
        [request.user_id, id]
      );

      // 4. Leave balance for this leave type
      const [balance] = await pool.query(
        `SELECT lb.used_days, lb.total_days
         FROM leave_balances lb
         WHERE lb.user_id = ? AND lb.leave_type_id = ?
           AND lb.year = YEAR(NOW())`,
        [request.user_id, request.leave_type_id]
      );

      res.json({
        request,
        files,
        history,
        balance: balance[0] || null,
      });
    } catch (err) {
      console.error("GET /:id error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET / — Get all leave requests (admin/management view)
// Protected: HR, Manager, Super Admin
// Query params: ?status=pending|approved|rejected|cancelled  ?user_id=xxx
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  verifyToken,
  requireRole("HR", "Manager", "Super Admin"),
  async (req, res) => {
    try {
      const { status, user_id } = req.query;

      const conditions = [];
      const params = [];

      if (status) {
        const validStatuses = [
          "pending",
          "approved",
          "rejected",
          "cancelled",
          "acknowledged",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: `Invalid status filter. Must be one of: ${validStatuses.join(", ")}.`,
          });
        }
        conditions.push("lr.status = ?");
        params.push(status);
      }

      if (user_id) {
        conditions.push("lr.user_id = ?");
        params.push(user_id);
      }

      const where =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT
           lr.id,
           lr.user_id,
           u.full_name,
           u.email,
           lr.leave_type_id,
           lt.name             AS leave_type_name,
           lr.start_date,
           lr.end_date,
           lr.total_days,
           lr.reason,
           lr.status,
           lr.approved_by,
           approver.full_name  AS approved_by_name,
           lr.reject_reason,
           lr.submitted_at,
           lr.updated_at
         FROM leave_requests lr
         JOIN      users       u        ON lr.user_id       = u.id
         JOIN      leave_types lt       ON lr.leave_type_id = lt.id
         LEFT JOIN users       approver ON lr.approved_by   = approver.id
         ${where}
         ORDER BY lr.submitted_at DESC`,
        params,
      );

      res.json({ leaveRequests: rows });
    } catch (err) {
      console.error("Get all leave requests error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id/acknowledge — Acknowledge a pending sick leave request
// Protected: Manager
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/acknowledge",
  verifyToken,
  requireRole("Manager"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [rows] = await pool.query(
        `SELECT
           lr.id,
           lr.user_id,
           lr.leave_type_id,
           lr.total_days,
           lr.status,
           lr.start_date,
           lt.name AS leave_type_name
         FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.id = ?`,
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Leave request not found." });
      }

      const request = rows[0];

      if (request.status !== "pending") {
        return res.status(400).json({
          message: `Only pending requests can be acknowledged. Current status: '${request.status}'.`,
        });
      }

      if (request.leave_type_name !== "ลาป่วย") {
        return res.status(400).json({
          message: "Only sick leave (ลาป่วย) requests can be acknowledged.",
        });
      }

      const requestYear = new Date(request.start_date).getFullYear();

      await pool.query(
        `UPDATE leave_requests
         SET status = 'acknowledged', approved_by = ?
         WHERE id = ?`,
        [req.user.id, id],
      );

      await logAction(
        req.user.id,
        "request_approved",
        `Leave request ${id} acknowledged (sick leave) by ${req.user.id}.`,
      );

      res.json({ message: "Leave request acknowledged successfully." });
    } catch (err) {
      console.error("Acknowledge leave request error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id/approve — Approve a pending leave request
// Protected: Manager only
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/approve",
  verifyToken,
  requireRole("Manager"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [rows] = await pool.query(
        `SELECT id, user_id, leave_type_id, total_days, status, start_date
         FROM leave_requests
         WHERE id = ?`,
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Leave request not found." });
      }

      const request = rows[0];

      if (request.status !== "pending" && request.status !== "acknowledged") {
        return res.status(400).json({
          message: `Only pending or acknowledged requests can be approved. Current status: '${request.status}'.`,
        });
      }

      const requestYear = new Date(request.start_date).getFullYear();

      await pool.query(
        `UPDATE leave_requests
         SET status = 'approved', approved_by = ?
         WHERE id = ?`,
        [req.user.id, id],
      );

      await logAction(
        req.user.id,
        "request_approved",
        `Leave request ${id} approved by user ${req.user.id}.`,
      );

      res.json({ message: "Leave request approved successfully." });
    } catch (err) {
      console.error("Approve leave request error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id/reject — Reject a pending leave request
// Protected: Manager only
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/:id/reject",
  verifyToken,
  requireRole("Manager"),
  async (req, res) => {
    const { id } = req.params;
    const { reject_reason } = req.body;

    try {
      const [rows] = await pool.query(
        "SELECT id, user_id, status, total_days, leave_type_id, start_date FROM leave_requests WHERE id = ?",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Leave request not found." });
      }

      const request = rows[0];

      if (request.status !== "pending") {
        return res.status(400).json({
          message: `Only pending requests can be rejected. Current status: '${request.status}'.`,
        });
      }

      const requestYear = new Date(request.start_date).getFullYear();

      await pool.query(
        `UPDATE leave_requests
         SET status = 'rejected', approved_by = ?, reject_reason = ?
         WHERE id = ?`,
        [req.user.id, reject_reason ?? null, id],
      );

      await pool.query(
        `UPDATE leave_balances
         SET used_days = used_days - ?, remaining_days = remaining_days + ?
         WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
        [request.total_days, request.total_days, request.user_id, request.leave_type_id, requestYear]
      );

      await logAction(
        req.user.id,
        "request_rejected",
        `Leave request ${id} rejected by user ${req.user.id}.`,
      );

      res.json({ message: "Leave request rejected successfully." });
    } catch (err) {
      console.error("Reject leave request error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  },
);

module.exports = router;
