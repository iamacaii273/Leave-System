const router = require('express').Router()
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { verifyToken, requireRole } = require('../middleware/auth')

// ─── GET /api/leave-balances/me ───────────────────────────────────────────────
// Get the current logged-in user's leave balances for the current year.
// Protected: all authenticated users.
router.get('/me', verifyToken, async (req, res) => {
  const currentYear = new Date().getFullYear()

  try {
    const [rows] = await pool.query(
      `SELECT
         lb.id,
         lb.user_id,
         lb.leave_type_id,
         lt.name  AS leave_type_name,
         lb.year,
         lb.total_days,
         lb.used_days,
         lb.remaining_days,
         lb.updated_at
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ?
         AND lb.year   = ?
       ORDER BY lt.name ASC`,
      [req.user.id, currentYear],
    )

    res.json({
      year: currentYear,
      balances: rows,
    })
  } catch (err) {
    console.error('GET /leave-balances/me error:', err)
    res.status(500).json({ message: 'Internal server error.' })
  }
})

// ─── GET /api/leave-balances/user/:userId ─────────────────────────────────────
// Get a specific user's leave balances for a given year (?year=YYYY).
// Defaults to the current year when the query param is omitted.
// Protected: HR and Super Admin only.
router.get(
  '/user/:userId',
  verifyToken,
  requireRole('HR', 'Super Admin'),
  async (req, res) => {
    const { userId } = req.params
    const currentYear = new Date().getFullYear()
    const rawYear = req.query.year
    const year = rawYear ? parseInt(rawYear, 10) : currentYear

    if (isNaN(year)) {
      return res.status(400).json({ message: 'Invalid year parameter.' })
    }

    try {
      // Verify the target user exists
      const [userRows] = await pool.query(
        'SELECT id, full_name, email FROM users WHERE id = ?',
        [userId],
      )

      if (userRows.length === 0) {
        return res.status(404).json({ message: 'User not found.' })
      }

      const [rows] = await pool.query(
        `SELECT
           lb.id,
           lb.user_id,
           lb.leave_type_id,
           lt.name  AS leave_type_name,
           lb.year,
           lb.total_days,
           lb.used_days,
           lb.remaining_days,
           lb.updated_at
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.user_id = ?
           AND lb.year   = ?
         ORDER BY lt.name ASC`,
        [userId, year],
      )

      res.json({
        user: userRows[0],
        year,
        balances: rows,
      })
    } catch (err) {
      console.error('GET /leave-balances/user/:userId error:', err)
      res.status(500).json({ message: 'Internal server error.' })
    }
  },
)

// ─── POST /api/leave-balances ─────────────────────────────────────────────────
// Initialize a leave balance entry for a user.
// Protected: HR and Super Admin only.
// Body: { user_id, leave_type_id, year, total_days }
router.post(
  '/',
  verifyToken,
  requireRole('HR', 'Super Admin'),
  async (req, res) => {
    const { user_id, leave_type_id, year, total_days } = req.body

    if (!user_id || !leave_type_id || !year || total_days === undefined) {
      return res.status(400).json({
        message: 'user_id, leave_type_id, year, and total_days are required.',
      })
    }

    const parsedTotalDays = parseFloat(total_days)
    if (isNaN(parsedTotalDays) || parsedTotalDays < 0) {
      return res
        .status(400)
        .json({ message: 'total_days must be a non-negative number.' })
    }

    const parsedYear = parseInt(year, 10)
    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: 'year must be a valid integer.' })
    }

    try {
      // Verify the target user exists
      const [userRows] = await pool.query(
        'SELECT id FROM users WHERE id = ?',
        [user_id],
      )
      if (userRows.length === 0) {
        return res.status(404).json({ message: 'User not found.' })
      }

      // Verify the leave type exists
      const [typeRows] = await pool.query(
        'SELECT id FROM leave_types WHERE id = ?',
        [leave_type_id],
      )
      if (typeRows.length === 0) {
        return res.status(404).json({ message: 'Leave type not found.' })
      }

      // Check for a duplicate entry (same user + leave_type + year)
      const [existing] = await pool.query(
        `SELECT id FROM leave_balances
         WHERE user_id       = ?
           AND leave_type_id = ?
           AND year          = ?`,
        [user_id, leave_type_id, parsedYear],
      )
      if (existing.length > 0) {
        return res.status(409).json({
          message:
            'A leave balance entry already exists for this user, leave type, and year.',
        })
      }

      const id = uuidv4()
      const used_days = 0
      const remaining_days = parsedTotalDays

      await pool.query(
        `INSERT INTO leave_balances
           (id, user_id, leave_type_id, year, total_days, used_days, remaining_days)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, user_id, leave_type_id, parsedYear, parsedTotalDays, used_days, remaining_days],
      )

      // Return the newly created record with leave_type_name joined in
      const [created] = await pool.query(
        `SELECT
           lb.id,
           lb.user_id,
           lb.leave_type_id,
           lt.name  AS leave_type_name,
           lb.year,
           lb.total_days,
           lb.used_days,
           lb.remaining_days,
           lb.updated_at
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.id = ?`,
        [id],
      )

      res.status(201).json({
        message: 'Leave balance created successfully.',
        balance: created[0],
      })
    } catch (err) {
      console.error('POST /leave-balances error:', err)
      res.status(500).json({ message: 'Internal server error.' })
    }
  },
)

// ─── PUT /api/leave-balances/:id ─────────────────────────────────────────────
// Update the total_days of an existing leave balance entry.
// Recalculates remaining_days = total_days - used_days.
// Protected: HR and Super Admin only.
router.put(
  '/:id',
  verifyToken,
  requireRole('HR', 'Super Admin'),
  async (req, res) => {
    const { id } = req.params
    const { total_days } = req.body

    if (total_days === undefined) {
      return res.status(400).json({ message: 'total_days is required.' })
    }

    const parsedTotalDays = parseFloat(total_days)
    if (isNaN(parsedTotalDays) || parsedTotalDays < 0) {
      return res
        .status(400)
        .json({ message: 'total_days must be a non-negative number.' })
    }

    try {
      // Fetch the existing record to read current used_days
      const [rows] = await pool.query(
        'SELECT id, used_days FROM leave_balances WHERE id = ?',
        [id],
      )

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Leave balance entry not found.' })
      }

      const usedDays = parseFloat(rows[0].used_days)
      const remainingDays = parsedTotalDays - usedDays

      if (remainingDays < 0) {
        return res.status(400).json({
          message: `total_days (${parsedTotalDays}) cannot be less than already used days (${usedDays}).`,
        })
      }

      await pool.query(
        `UPDATE leave_balances
         SET total_days     = ?,
             remaining_days = ?
         WHERE id = ?`,
        [parsedTotalDays, remainingDays, id],
      )

      // Return the updated record with leave_type_name joined in
      const [updated] = await pool.query(
        `SELECT
           lb.id,
           lb.user_id,
           lb.leave_type_id,
           lt.name  AS leave_type_name,
           lb.year,
           lb.total_days,
           lb.used_days,
           lb.remaining_days,
           lb.updated_at
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.id = ?`,
        [id],
      )

      res.json({
        message: 'Leave balance updated successfully.',
        balance: updated[0],
      })
    } catch (err) {
      console.error('PUT /leave-balances/:id error:', err)
      res.status(500).json({ message: 'Internal server error.' })
    }
  },
)

module.exports = router
