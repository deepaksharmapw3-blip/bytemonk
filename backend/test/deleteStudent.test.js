const assert = require('node:assert/strict')
const test = require('node:test')

// Stand in for the Mongoose model so this test needs no database or driver.
const modelPath = require.resolve('../models/Student')
const calls = []
let existing = new Set()
const fakeStudent = {
  findByIdAndDelete(id) {
    calls.push(id)
    const found = existing.delete(id)
    return { select: () => ({ lean: async () => (found ? { _id: id } : null) }) }
  },
}
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: fakeStudent }
const { deleteStudent } = require('../controllers/studentController')

const mockResponse = () => ({
  statusCode: 200, body: undefined, headers: {},
  set(name, value) { this.headers[name] = value; return this },
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
})

test('deletes an existing registration and reports success', async () => {
  const id = 'a'.repeat(24)
  existing = new Set([id]); calls.length = 0
  const res = mockResponse()
  await deleteStudent({ params: { id }, admin: { name: 'alice' } }, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true, id })
  assert.deepEqual(calls, [id])
})

test('returns 404 when the registration is already gone', async () => {
  existing = new Set()
  const res = mockResponse()
  await deleteStudent({ params: { id: 'b'.repeat(24) }, admin: { name: 'alice' } }, res)
  assert.equal(res.statusCode, 404)
})

test('rejects malformed ids and query-operator payloads without touching the database', async () => {
  calls.length = 0
  for (const id of ['', '123', 'z'.repeat(24), '{"$ne":null}', undefined, { $ne: null }, ['a'.repeat(24)]]) {
    const res = mockResponse()
    await deleteStudent({ params: { id }, admin: { name: 'alice' } }, res)
    assert.equal(res.statusCode, 400)
  }
  assert.deepEqual(calls, [])
})

test('the delete route exists, is admin-guarded, and is not reachable without a session', () => {
  const requireAdmin = require('../middleware/adminAuthMiddleware')
  const router = require('../routes/studentRoutes')
  const layer = router.stack.find(item => item.route?.path === '/:id' && item.route.methods.delete)
  assert.ok(layer, 'DELETE /:id route is registered')
  assert.ok(layer.route.stack.some(item => item.handle === requireAdmin), 'DELETE /:id has the admin guard')
})
