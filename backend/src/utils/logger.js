const pool = require('../db')
const { v4: uuidv4 } = require('uuid')

/**
 * Logs a user action into the user_logs table.
 *
 * @param {string} userId     - The ID of the user performing the action
 * @param {string} action     - One of the allowed enum values in user_logs.action
 * @param {string} description - Optional human-readable description
 */
const logAction = async (userId, action, description = null) => {
  const allowedActions = [
    'login',
    'logout',
    'request_submitted',
    'request_cancelled',
    'request_approved',
    'request_rejected',
    'profile_updated',
    'password_changed',
    'user_resigned',
    'user_created',
    'position_created',
    'position_updated',
    'position_deleted',
    'position_restored',
  ]

  if (!allowedActions.includes(action)) {
    console.warn(`[logger] Unknown action "${action}" — skipping log.`)
    return
  }

  try {
    await pool.query(
      `INSERT INTO user_logs (id, user_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), userId, action, description]
    )
  } catch (err) {
    // Logging should never crash the app — just warn
    console.warn(`[logger] Failed to log action "${action}" for user ${userId}:`, err.message)
  }
}

module.exports = { logAction }
