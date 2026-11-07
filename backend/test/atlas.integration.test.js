require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const mongoose = require('mongoose')
const Student = require('../models/Student')
const connectDatabase = require('../config/db')
const { registerStudent } = require('../controllers/studentController')

const enabled = process.env.RUN_ATLAS_INTEGRATION === '1'

test('Atlas persists a registration and rejects a duplicate email', { skip: !enabled }, async () => {
  assert.ok(process.env.MONGO_URI, 'Set MONGO_URI in backend/.env before running the Atlas integration test.')
  assert.ok(/mongodb\.net/i.test(process.env.MONGO_URI), 'MONGO_URI must point to a MongoDB Atlas cluster.')
  const email = `atlas-check-${randomUUID()}@example.invalid`
  let inserted = false

  try {
    try {
      await connectDatabase()
    } catch (error) {
      throw new Error(`Atlas connection failed (${error.name || 'Error'}${error.code ? `, ${error.code}` : ''}). Check the Atlas URI, IP access list, cluster status, and network.`)
    }
    await Student.init()

    const submit = async () => {
      let status
      let payload
      const response = {
        status(code) { status = code; return this },
        json(body) { payload = body; return this },
      }
      await registerStudent({
        body: {
          name: 'Atlas Integration Check',
          email,
          countryCode: '+91',
          whatsapp: '9876543210',
          department: 'Computer Science & Engineering',
          year: '2nd year',
          interests: ['Web Development'],
          skill: 'Beginner',
          formats: ['Hands-on workshops'],
          timing: 'Weekend mornings',
          goals: 'Temporary automated database check.',
          suggestions: '',
          consent: true,
        },
      }, response)
      return { status, payload }
    }

    const first = await submit()
    assert.equal(first.status, 201, 'first registration should be inserted')
    inserted = true
    assert.ok(first.payload.registrationId, 'first response should include a registration id')

    const duplicate = await submit()
    assert.equal(duplicate.status, 409, 'duplicate email should be rejected')
    assert.equal(duplicate.payload.message, 'A registration with this email already exists.')
    assert.equal(await Student.countDocuments({ email }), 1, 'only one record should exist for the test email')
  } finally {
    if (mongoose.connection.readyState !== 0) {
      if (inserted) await Student.deleteOne({ email }).catch(() => {})
      await mongoose.disconnect().catch(() => {})
    }
  }
})
