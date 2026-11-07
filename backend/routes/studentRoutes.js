const express = require('express')
const rateLimit = require('express-rate-limit')
const requireAdmin = require('../middleware/adminAuthMiddleware')
const { deleteStudent, exportStudents, getAnalytics, getStudents, registerStudent } = require('../controllers/studentController')

const router = express.Router()
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
})
const adminReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
})

const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
})

router.post('/register', registrationLimiter, registerStudent)
router.get('/', adminReadLimiter, requireAdmin, getStudents)
router.get('/analytics', adminReadLimiter, requireAdmin, getAnalytics)
router.get('/export', adminReadLimiter, requireAdmin, exportStudents)
router.delete('/:id', adminWriteLimiter, requireAdmin, deleteStudent)

module.exports = router
