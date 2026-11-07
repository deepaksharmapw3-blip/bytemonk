const assert = require('node:assert/strict')
const test = require('node:test')
const mongoose = require('mongoose')
const Student = require('../models/Student')
const studentRoutes = require('../routes/studentRoutes')
const connectDatabase = require('../config/db')
const { errorHandler } = require('../middleware/errorMiddleware')
const requireAdmin = require('../middleware/adminAuthMiddleware')
const { registerStudent, validateRegistration } = require('../controllers/studentController')

const validRegistration = {
  name: 'Aanya Sharma',
  email: 'Aanya.Sharma@example.edu',
  countryCode: '+91',
  whatsapp: '9876543210',
  department: 'Computer Science & Engineering',
  year: '2nd year',
  interests: ['Web Development'],
  skill: 'Beginner',
  formats: ['Hands-on workshops'],
  timing: 'Weekend mornings',
  goals: '',
  suggestions: '',
  consent: true,
}

test('validates and normalizes a valid student registration', () => {
  const result = validateRegistration(validRegistration)
  assert.equal(result.errors, undefined)
  assert.equal(result.value.email, 'aanya.sharma@example.edu')
  assert.equal(result.value.whatsapp, '9876543210')
})

test('rejects empty submissions and invalid email and phone values', () => {
  assert.ok(validateRegistration({}).errors)
  assert.ok(validateRegistration({ ...validRegistration, email: 'person@domain..com' }).errors.email)
  assert.ok(validateRegistration({ ...validRegistration, email: '.person@domain.com' }).errors.email)
  assert.ok(validateRegistration({ ...validRegistration, whatsapp: '123-abc' }).errors.whatsapp)
  assert.ok(validateRegistration({ ...validRegistration, whatsapp: '123456' }).errors.whatsapp)
})

test('rejects unsupported registration choices supplied directly to the API', () => {
  assert.ok(validateRegistration({ ...validRegistration, department: 'Unlisted department' }).errors.department)
  assert.ok(validateRegistration({ ...validRegistration, year: 'Year 99' }).errors.year)
  assert.ok(validateRegistration({ ...validRegistration, interests: ['Database password theft'] }).errors.interests)
})

test('student email has a unique database index for duplicate prevention', () => {
  assert.ok(Student.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique === true))
})

test('admin student, analytics, and export routes all require authorization', t => {
  const originalKey = process.env.ADMIN_API_KEY
  delete process.env.ADMIN_API_KEY
  t.after(() => {
    if (originalKey === undefined) delete process.env.ADMIN_API_KEY
    else process.env.ADMIN_API_KEY = originalKey
  })

  for (const path of ['/api/students', '/api/students/analytics', '/api/students/export']) {
    const route = studentRoutes.stack.find(layer => layer.route?.path === path.replace('/api/students', '') || (path === '/api/students' && layer.route?.path === '/'))?.route
    assert.ok(route, `route ${path} exists`)
    assert.ok(route.stack.some(layer => layer.handle === requireAdmin), `${path} has the admin guard`)
  }

  let status
  let payload
  const response = { status(code) { status = code; return this }, json(body) { payload = body; return this } }
  requireAdmin({ get: () => '' }, response, () => assert.fail('unauthenticated request passed'))
  assert.equal(status, 503)
  assert.equal(payload.message, 'Admin access is not configured.')
})

test('registration endpoint returns a validation error for an empty submission without touching the database', async () => {
  let status
  let payload
  const response = { status(code) { status = code; return this }, json(body) { payload = body; return this } }
  await registerStudent({ body: {} }, response)
  assert.equal(status, 400)
  assert.ok(payload.errors)
})

test('API failures return a generic message without exposing internal details', () => {
  let status
  let payload
  const response = {
    headersSent: false,
    status(code) { status = code; return this },
    json(body) { payload = body; return this },
  }
  errorHandler(new Error('private connection detail'), {}, response, () => {})
  assert.equal(status, 500)
  assert.equal(payload.message, 'Something went wrong. Please try again later.')
  assert.equal(JSON.stringify(payload).includes('private connection detail'), false)
})

test('database connection failures propagate without printing the connection URI', async t => {
  const originalUri = process.env.MONGO_URI
  process.env.MONGO_URI = 'mongodb://example.invalid/private'
  t.after(() => {
    if (originalUri === undefined) delete process.env.MONGO_URI
    else process.env.MONGO_URI = originalUri
  })
  t.mock.method(mongoose, 'connect', async () => {
    throw Object.assign(new Error('connection failed'), { name: 'MongooseServerSelectionError', code: 'ECONNREFUSED' })
  })

  await assert.rejects(connectDatabase(), error => error.code === 'ECONNREFUSED')
})
