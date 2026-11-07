const { createHash, createHmac, randomBytes, timingSafeEqual } = require('node:crypto')

const MIN_KEY_LENGTH = 16
const MIN_SECRET_LENGTH = 32

function isUsableKey(key) {
  return key.length >= MIN_KEY_LENGTH && !/replace-with/i.test(key)
}
const MAX_FAILURES = 5
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000
const MAX_TRACKED_CLIENTS = 10000

// Used only when ADMIN_SESSION_SECRET is not set. Sessions then end when the server restarts.
const fallbackSecret = randomBytes(32).toString('hex')

function sha256(value) {
  return createHash('sha256').update(value).digest()
}

/**
 * Admin accounts come from the environment:
 *   ADMIN_API_KEYS=alice:<key>,bob:<key>   one named key per organizer (preferred)
 *   ADMIN_API_KEY=<key>                    single shared key (still supported)
 * Keys shorter than MIN_KEY_LENGTH, or still containing the .env.example placeholder text, are ignored.
 */
function getAdminAccounts(env = process.env) {
  const accounts = []
  for (const entry of (env.ADMIN_API_KEYS || '').split(',')) {
    const trimmed = entry.trim()
    const separator = trimmed.indexOf(':')
    if (separator < 1) continue
    const name = trimmed.slice(0, separator).trim()
    const key = trimmed.slice(separator + 1).trim()
    if (name && isUsableKey(key)) accounts.push({ name, key })
  }
  const legacyKey = (env.ADMIN_API_KEY || '').trim()
  if (isUsableKey(legacyKey)) accounts.push({ name: 'admin', key: legacyKey })
  return accounts
}

function adminConfigWarnings(env = process.env) {
  const warnings = []
  const configured = (env.ADMIN_API_KEYS || '').split(',').filter(entry => entry.trim()).length + (env.ADMIN_API_KEY?.trim() ? 1 : 0)
  const usable = getAdminAccounts(env).length
  if (!configured) warnings.push('No admin keys are configured. The organizer dashboard is disabled.')
  else if (usable < configured) warnings.push(`Some admin keys were ignored because they are shorter than ${MIN_KEY_LENGTH} characters, still contain placeholder text, or are badly formatted.`)
  const secretProblem = sessionSecretProblem(env)
  if (secretProblem) warnings.push(`${secretProblem} Until then, admin sessions end whenever the server restarts.`)
  if (env.NODE_ENV === 'production' && !env.TRUST_PROXY?.trim()) warnings.push('TRUST_PROXY is not set. Behind a hosting proxy (Render, Railway, Heroku) set TRUST_PROXY=1, or rate limits and login lockout will treat all visitors as one.')
  return warnings
}

/** Returns the matching account name, or null. Every configured key is compared so timing does not reveal which one matched. */
function verifyAdminKey(provided, env = process.env) {
  if (typeof provided !== 'string' || !provided) return null
  const providedHash = sha256(provided)
  let matched = null
  for (const account of getAdminAccounts(env)) {
    if (timingSafeEqual(providedHash, sha256(account.key)) && !matched) matched = account.name
  }
  return matched
}

/** The configured signing secret, or null if it is missing, too short, or still the .env.example placeholder. */
function configuredSessionSecret(env = process.env) {
  const value = env.ADMIN_SESSION_SECRET?.trim()
  return value && value.length >= MIN_SECRET_LENGTH && !/replace-with/i.test(value) ? value : null
}

function sessionSecret(env = process.env) {
  return configuredSessionSecret(env) || fallbackSecret
}

/** Describes why the session secret is unusable while admin access is enabled, or returns null if it is fine. */
function sessionSecretProblem(env = process.env) {
  if (!getAdminAccounts(env).length || configuredSessionSecret(env)) return null
  return env.ADMIN_SESSION_SECRET?.trim()
    ? `ADMIN_SESSION_SECRET must be a random value of at least ${MIN_SECRET_LENGTH} characters and not the .env.example placeholder. Run "npm run setup:env" or "npm run secret" in backend/.`
    : 'ADMIN_SESSION_SECRET is not set. Run "npm run setup:env" in backend/ (or "npm run secret" to generate one for your host).'
}

function sessionTtlMs(env = process.env) {
  const minutes = Number(env.ADMIN_SESSION_TTL_MINUTES)
  return (Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 24 * 60) : 120) * 60 * 1000
}

function sign(payload, env) {
  return createHmac('sha256', sessionSecret(env)).update(payload).digest('base64url')
}

function issueSessionToken(name, env = process.env, now = Date.now()) {
  const expiresAt = now + sessionTtlMs(env)
  const payload = Buffer.from(JSON.stringify({ sub: name, iat: now, exp: expiresAt })).toString('base64url')
  return { token: `${payload}.${sign(payload, env)}`, expiresAt }
}

/** Returns { name, expiresAt } for a valid, unexpired token, otherwise null. */
function verifySessionToken(token, env = process.env, now = Date.now()) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  const expected = Buffer.from(sign(payload, env))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.sub !== 'string' || !Number.isFinite(data.exp) || data.exp <= now) return null
    return { name: data.sub, expiresAt: data.exp }
  } catch {
    return null
  }
}

// ---- Failed-login lockout (per client IP, in memory) ----
const attempts = new Map()

function lockoutSecondsRemaining(clientId, now = Date.now()) {
  const record = attempts.get(clientId)
  return record && record.lockedUntil > now ? Math.ceil((record.lockedUntil - now) / 1000) : 0
}

/** Records a failed login. Returns the lockout length in seconds if this failure triggered a lock, otherwise 0. */
function recordFailedLogin(clientId, now = Date.now()) {
  let record = attempts.get(clientId)
  if (!record || now - record.firstFailureAt > FAILURE_WINDOW_MS) {
    record = { count: 0, firstFailureAt: now, lockedUntil: 0 }
  }
  record.count += 1
  if (record.count >= MAX_FAILURES) record.lockedUntil = now + LOCKOUT_MS
  attempts.delete(clientId)
  attempts.set(clientId, record)
  if (attempts.size > MAX_TRACKED_CLIENTS) attempts.delete(attempts.keys().next().value)
  return record.lockedUntil > now ? Math.ceil(LOCKOUT_MS / 1000) : 0
}

function clearFailedLogins(clientId) {
  attempts.delete(clientId)
}

function resetLoginTracking() {
  attempts.clear()
}

module.exports = {
  MAX_FAILURES,
  adminConfigWarnings,
  clearFailedLogins,
  getAdminAccounts,
  issueSessionToken,
  lockoutSecondsRemaining,
  recordFailedLogin,
  resetLoginTracking,
  sessionSecretProblem,
  verifyAdminKey,
  verifySessionToken,
}
