const express = require('express')
const createRateLimiter = require('../middleware/createRateLimiter')
const { adminLogin } = require('../controllers/adminController')

function createAdminRoutes(redisClient) {
  const router = express.Router()
  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 4,
    skipSuccessfulRequests: true,
    message: { message: 'Too many sign-in attempts. Please try again later.' },
  }, redisClient, 'admin-login')

  router.post('/login', loginLimiter, adminLogin)
  return router
}

const defaultRouter = createAdminRoutes()
defaultRouter.createAdminRoutes = createAdminRoutes
module.exports = defaultRouter
