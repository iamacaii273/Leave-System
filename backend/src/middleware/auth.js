const jwt = require('jsonwebtoken')

/**
 * Middleware: verifyToken
 * Protects routes by requiring a valid JWT in the Authorization header.
 * Attaches the decoded user payload to req.user.
 *
 * Usage: router.get('/protected', verifyToken, (req, res) => { ... })
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' })
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid token format. Use: Bearer <token>' })
  }

  const token = parts[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // { id, email, role, role_id, iat, exp }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' })
    }
    return res.status(401).json({ message: 'Invalid token.' })
  }
}

/**
 * Middleware factory: requireRole(...roles)
 * Restricts a route to users whose role matches one of the allowed roles.
 * Must be used AFTER verifyToken.
 *
 * Usage: router.get('/admin', verifyToken, requireRole('Super Admin', 'HR'), (req, res) => { ... })
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      })
    }

    next()
  }
}

module.exports = { verifyToken, requireRole }
