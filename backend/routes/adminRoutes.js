const express = require('express')
const rateLimit = require('express-rate-limit')
const { adminLogin } = require('../controllers/adminController')

const router = express.Router()
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again later.' },
})

router.post('/login', loginLimiter, adminLogin)

module.exports = router
