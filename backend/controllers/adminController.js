const {
  clearFailedLogins,
  getAdminAccounts,
  issueSessionToken,
  lockoutSecondsRemaining,
  recordFailedLogin,
  verifyAdminCredentials,
} = require('../utils/adminSession')

function clientId(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function adminLogin(req, res) {
  res.set?.('Cache-Control', 'no-store')

  if (!getAdminAccounts().length) {
    return res.status(503).json({ message: 'Admin access is not configured.' })
  }

  const localLockout = process.env.NODE_ENV !== 'production' && !process.env.REDIS_URL?.trim()
  const id = localLockout ? clientId(req) : null
  const locked = localLockout ? lockoutSecondsRemaining(id) : 0
  if (locked) {
    res.set?.('Retry-After', String(locked))
    return res.status(429).json({ message: 'Too many failed attempts. Please try again later.', retryAfterSeconds: locked })
  }

  const key = typeof req.body?.key === 'string' ? req.body.key.trim() : ''
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
  const name = verifyAdminCredentials(key, code)
  if (!name) {
    // Keep the same convenient lockout for local development. Production uses
    // the Redis-backed route limiter so every API instance shares the counter.
    if (localLockout) {
      const lockSeconds = recordFailedLogin(id)
      if (lockSeconds) {
        console.warn('Admin login locked after repeated failures from', id)
        res.set?.('Retry-After', String(lockSeconds))
        return res.status(429).json({ message: 'Too many failed attempts. Please try again later.', retryAfterSeconds: lockSeconds })
      }
    }
    return res.status(401).json({ message: 'The access key or authenticator code was not accepted.' })
  }

  if (localLockout) clearFailedLogins(id)
  const { token, expiresAt } = issueSessionToken(name)
  console.log(`Admin signed in: ${name}`)
  return res.json({ token, expiresAt: new Date(expiresAt).toISOString(), name })
}

module.exports = { adminLogin }
