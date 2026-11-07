const express = require('express')
const createRateLimiter = require('../middleware/createRateLimiter')
const requireAdmin = require('../middleware/adminAuthMiddleware')
const { deleteStudent, exportStudents, getAnalytics, getStudents, registerStudent } = require('../controllers/studentController')

function createStudentRoutes(redisClient) {
  const router = express.Router()
  const registrationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { message: 'Too many registration attempts. Please try again later.' },
  }, redisClient, 'student-registration')
  const adminReadLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    message: { message: 'Too many requests. Please try again later.' },
  }, redisClient, 'admin-read')

  const adminWriteLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    message: { message: 'Too many requests. Please try again later.' },
  }, redisClient, 'admin-write')

  router.post('/register', registrationLimiter, registerStudent)
  router.get('/', adminReadLimiter, requireAdmin, getStudents)
  router.get('/analytics', adminReadLimiter, requireAdmin, getAnalytics)
  router.get('/export', adminReadLimiter, requireAdmin, exportStudents)
  router.delete('/:id', adminWriteLimiter, requireAdmin, deleteStudent)
  return router
}

const defaultRouter = createStudentRoutes()
defaultRouter.createStudentRoutes = createStudentRoutes
module.exports = defaultRouter
