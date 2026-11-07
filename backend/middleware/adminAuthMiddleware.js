const { getAdminAccounts, verifySessionToken } = require('../utils/adminSession')

function requireAdmin(req, res, next) {
  if (!getAdminAccounts().length) {
    return res.status(503).json({ message: 'Admin access is not configured.' })
  }

  const authorization = req.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const session = match ? verifySessionToken(match[1].trim()) : null
  if (!session) {
    return res.status(401).json({ message: 'Admin authorization required.' })
  }

  req.admin = { name: session.name }
  return next()
}

module.exports = requireAdmin
