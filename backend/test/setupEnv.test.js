const assert = require('node:assert/strict')
const test = require('node:test')
const { ensureEnv, generateSecret } = require('../scripts/setup-env')

test('adds a strong ADMIN_SESSION_SECRET and TRUST_PROXY when missing, keeping other lines', () => {
  const { text, changes } = ensureEnv('PORT=5000\nMONGO_URI=mongodb://x\n', () => 'S'.repeat(64))
  assert.equal(changes.length, 2)
  assert.match(text, /^PORT=5000$/m)
  assert.match(text, /^MONGO_URI=mongodb:\/\/x$/m)
  assert.match(text, /^ADMIN_SESSION_SECRET=S{64}$/m)
  assert.match(text, /^TRUST_PROXY=0$/m)
})

test('replaces the placeholder secret in place without duplicating the line', () => {
  const { text } = ensureEnv('ADMIN_SESSION_SECRET=replace-with-a-different-long-random-secret\nTRUST_PROXY=1\n', () => 'N'.repeat(64))
  assert.equal(text.match(/^ADMIN_SESSION_SECRET=/gm).length, 1)
  assert.match(text, /^ADMIN_SESSION_SECRET=N{64}$/m)
  assert.match(text, /^TRUST_PROXY=1$/m)
})

test('leaves a real secret and an existing TRUST_PROXY untouched, so it is safe to run twice', () => {
  const original = `ADMIN_SESSION_SECRET=${'k'.repeat(50)}\nTRUST_PROXY=1\n`
  const { text, changes } = ensureEnv(original)
  assert.equal(text, original)
  assert.deepEqual(changes, [])
  const first = ensureEnv('PORT=1\n').text
  assert.equal(ensureEnv(first).changes.length, 0)
})

test('keeps Windows line endings and handles a file with no trailing newline', () => {
  const { text } = ensureEnv('PORT=5000\r\nMONGO_DB_NAME=x', () => 'W'.repeat(64))
  assert.ok(!/[^\r]\n/.test(text), 'no bare LF added to a CRLF file')
  assert.match(text, /MONGO_DB_NAME=x\r\nADMIN_SESSION_SECRET=/)
})

test('generated secrets are long and unique', () => {
  const a = generateSecret(); const b = generateSecret()
  assert.ok(a.length >= 32 && a !== b)
})
