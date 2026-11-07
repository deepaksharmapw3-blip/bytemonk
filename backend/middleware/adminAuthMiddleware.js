const { timingSafeEqual } = require('node:crypto')

function matchesSecret(provided, expected) {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
}

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    return res.status(503).json({ message: 'Admin access is not configured.' })
  }

  const authorization = req.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match || !matchesSecret(match[1], expected)) {
    return res.status(401).json({ message: 'Admin authorization required.' })
  }

  return next()
}

module.exports = requireAdmin
