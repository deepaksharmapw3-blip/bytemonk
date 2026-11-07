const {
  clearFailedLogins,
  getAdminAccounts,
  issueSessionToken,
  lockoutSecondsRemaining,
  recordFailedLogin,
  verifyAdminKey,
} = require('../utils/adminSession')

function clientId(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function adminLogin(req, res) {
  res.set?.('Cache-Control', 'no-store')

  if (!getAdminAccounts().length) {
    return res.status(503).json({ message: 'Admin access is not configured.' })
  }

  const id = clientId(req)
  const locked = lockoutSecondsRemaining(id)
  if (locked) {
    res.set?.('Retry-After', String(locked))
    return res.status(429).json({ message: 'Too many failed attempts. Please try again later.', retryAfterSeconds: locked })
  }

  const key = typeof req.body?.key === 'string' ? req.body.key.trim() : ''
  const name = verifyAdminKey(key)
  if (!name) {
    const lockSeconds = recordFailedLogin(id)
    if (lockSeconds) {
      console.warn('Admin login locked after repeated failures from', id)
      res.set?.('Retry-After', String(lockSeconds))
      return res.status(429).json({ message: 'Too many failed attempts. Please try again later.', retryAfterSeconds: lockSeconds })
    }
    return res.status(401).json({ message: 'That key was not accepted.' })
  }

  clearFailedLogins(id)
  const { token, expiresAt } = issueSessionToken(name)
  console.log(`Admin signed in: ${name}`)
  return res.json({ token, expiresAt: new Date(expiresAt).toISOString(), name })
}

module.exports = { adminLogin }
