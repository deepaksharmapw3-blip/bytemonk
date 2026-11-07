const assert = require('node:assert/strict')
const test = require('node:test')
const requireAdmin = require('../middleware/adminAuthMiddleware')
const { adminLogin } = require('../controllers/adminController')
const { parseTrustProxy } = require('../config/proxy')
const session = require('../utils/adminSession')

const KEY = 'a-long-private-organizer-key'

function withEnv(t, values) {
  const originals = {}
  for (const name of Object.keys(values)) {
    originals[name] = process.env[name]
    if (values[name] === undefined) delete process.env[name]
    else process.env[name] = values[name]
  }
  session.resetLoginTracking()
  t.after(() => {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    session.resetLoginTracking()
  })
}

function mockResponse() {
  return {
    statusCode: 200, body: undefined, headers: {},
    set(name, value) { this.headers[name] = value; return this },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

const login = (key, ip = '203.0.113.7') => {
  const res = mockResponse()
  adminLogin({ ip, body: { key } }, res)
  return res
}

test('named keys and the legacy key are both accepted, short keys are ignored', t => {
  withEnv(t, { ADMIN_API_KEYS: 'alice:alice-private-key-123,bob:bob-private-key-4567,eve:short', ADMIN_API_KEY: KEY })
  assert.deepEqual(session.getAdminAccounts().map(account => account.name), ['alice', 'bob', 'admin'])
  assert.equal(session.verifyAdminKey('bob-private-key-4567'), 'bob')
  assert.equal(session.verifyAdminKey(KEY), 'admin')
  assert.equal(session.verifyAdminKey('short'), null)
  assert.equal(session.verifyAdminKey(''), null)
})

test('session tokens verify, expire, and reject tampering', t => {
  withEnv(t, { ADMIN_API_KEY: KEY, ADMIN_SESSION_SECRET: 'x'.repeat(40), ADMIN_SESSION_TTL_MINUTES: '30' })
  const now = Date.now()
  const { token, expiresAt } = session.issueSessionToken('alice', process.env, now)
  assert.equal(expiresAt - now, 30 * 60 * 1000)
  assert.equal(session.verifySessionToken(token, process.env, now + 1000).name, 'alice')
  assert.equal(session.verifySessionToken(token, process.env, expiresAt + 1), null)

  const [payload, signature] = token.split('.')
  const forged = Buffer.from(JSON.stringify({ sub: 'mallory', iat: now, exp: expiresAt })).toString('base64url')
  assert.equal(session.verifySessionToken(`${forged}.${signature}`, process.env, now), null)
  assert.equal(session.verifySessionToken(`${payload}.${signature.slice(0, -2)}AA`, process.env, now), null)
  assert.equal(session.verifySessionToken('garbage', process.env, now), null)

  process.env.ADMIN_SESSION_SECRET = 'y'.repeat(40)
  assert.equal(session.verifySessionToken(token, process.env, now), null, 'changing the secret ends all sessions')
})

test('login issues a token for a valid key and rejects a wrong one', t => {
  withEnv(t, { ADMIN_API_KEY: KEY, ADMIN_API_KEYS: undefined })
  const ok = login(KEY)
  assert.equal(ok.statusCode, 200)
  assert.equal(ok.body.name, 'admin')
  assert.ok(session.verifySessionToken(ok.body.token))
  assert.equal(ok.body.key, undefined)

  const bad = login('wrong-wrong-wrong-wrong')
  assert.equal(bad.statusCode, 401)
  assert.equal(bad.body.token, undefined)
})

test('login reports 503 when no admin key is configured', t => {
  withEnv(t, { ADMIN_API_KEY: undefined, ADMIN_API_KEYS: undefined })
  assert.equal(login(KEY).statusCode, 503)
})

test('five wrong keys lock the client out, even for the correct key, but other clients are unaffected', t => {
  withEnv(t, { ADMIN_API_KEY: KEY, ADMIN_API_KEYS: undefined })
  for (let attempt = 1; attempt <= 4; attempt += 1) assert.equal(login('wrong-wrong-wrong-wrong').statusCode, 401)
  const locking = login('wrong-wrong-wrong-wrong')
  assert.equal(locking.statusCode, 429)
  assert.ok(locking.body.retryAfterSeconds > 0)
  assert.ok(locking.headers['Retry-After'])

  assert.equal(login(KEY).statusCode, 429, 'correct key is refused while locked')
  assert.equal(login(KEY, '198.51.100.9').statusCode, 200, 'a different client can still sign in')
})

test('lockout expires and a successful login clears earlier failures', t => {
  withEnv(t, { ADMIN_API_KEY: KEY, ADMIN_API_KEYS: undefined })
  const start = Date.now()
  for (let attempt = 0; attempt < 5; attempt += 1) session.recordFailedLogin('client-a', start)
  assert.ok(session.lockoutSecondsRemaining('client-a', start + 1000) > 0)
  assert.equal(session.lockoutSecondsRemaining('client-a', start + 16 * 60 * 1000), 0)

  for (let attempt = 0; attempt < 3; attempt += 1) login('wrong-wrong-wrong-wrong')
  assert.equal(login(KEY).statusCode, 200)
  for (let attempt = 0; attempt < 4; attempt += 1) assert.equal(login('wrong-wrong-wrong-wrong').statusCode, 401)
})

test('requireAdmin accepts a session token but not the raw admin key', t => {
  withEnv(t, { ADMIN_API_KEY: KEY, ADMIN_API_KEYS: undefined })
  const call = authorization => {
    const res = mockResponse()
    const req = { get: name => (name.toLowerCase() === 'authorization' ? authorization : '') }
    let passed = false
    requireAdmin(req, res, () => { passed = true })
    return { res, passed, req }
  }

  const { token } = session.issueSessionToken('alice')
  const allowed = call(`Bearer ${token}`)
  assert.equal(allowed.passed, true)
  assert.equal(allowed.req.admin.name, 'alice')

  for (const header of [`Bearer ${KEY}`, 'Bearer nonsense', '', 'Basic abc']) {
    const denied = call(header)
    assert.equal(denied.passed, false)
    assert.equal(denied.res.statusCode, 401)
  }

  const expired = session.issueSessionToken('alice', process.env, Date.now() - 3 * 60 * 60 * 1000)
  assert.equal(call(`Bearer ${expired.token}`).res.statusCode, 401)
})

test('TRUST_PROXY accepts hop counts and address lists but refuses the spoofable "true"', () => {
  assert.equal(parseTrustProxy(undefined), false)
  assert.equal(parseTrustProxy(''), false)
  assert.equal(parseTrustProxy('false'), false)
  assert.equal(parseTrustProxy('0'), 0)
  assert.equal(parseTrustProxy('1'), 1)
  assert.equal(parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8')
  assert.throws(() => parseTrustProxy('true'), /unsafe/)
})

test('placeholder keys copied from .env.example are never accepted', t => {
  withEnv(t, { ADMIN_API_KEYS: 'alice:replace-with-a-long-random-key', ADMIN_API_KEY: 'replace-with-a-long-random-secret' })
  assert.equal(session.getAdminAccounts().length, 0)
  assert.equal(login('replace-with-a-long-random-key').statusCode, 503)
})

test('a placeholder or short ADMIN_SESSION_SECRET is not used for signing and is reported', t => {
  withEnv(t, { ADMIN_API_KEY: KEY, ADMIN_API_KEYS: undefined, ADMIN_SESSION_SECRET: 'replace-with-a-different-long-random-secret' })
  assert.match(session.sessionSecretProblem(), /ADMIN_SESSION_SECRET/)
  const { token } = session.issueSessionToken('alice')
  // A token signed with the public placeholder must not be accepted.
  const payload = token.split('.')[0]
  const { createHmac } = require('node:crypto')
  const forged = `${payload}.${createHmac('sha256', 'replace-with-a-different-long-random-secret').update(payload).digest('base64url')}`
  assert.equal(session.verifySessionToken(forged), null)

  process.env.ADMIN_SESSION_SECRET = 'short'
  assert.match(session.sessionSecretProblem(), /at least 32/)
  process.env.ADMIN_SESSION_SECRET = 'z'.repeat(48)
  assert.equal(session.sessionSecretProblem(), null)
})

test('no secret problem is reported while admin access is disabled; production without TRUST_PROXY warns', t => {
  withEnv(t, { ADMIN_API_KEY: undefined, ADMIN_API_KEYS: undefined, ADMIN_SESSION_SECRET: undefined })
  assert.equal(session.sessionSecretProblem(), null)
  const env = { ADMIN_API_KEY: KEY, ADMIN_SESSION_SECRET: 'z'.repeat(48), NODE_ENV: 'production' }
  assert.ok(session.adminConfigWarnings(env).some(warning => warning.includes('TRUST_PROXY')))
  assert.equal(session.adminConfigWarnings({ ...env, TRUST_PROXY: '1' }).length, 0)
})
