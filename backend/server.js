require('dotenv').config()

const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const mongoose = require('mongoose')
const connectDatabase = require('./config/db')
const { connectRateLimitRedis } = require('./config/redis')
const { parseTrustProxy } = require('./config/proxy')
const { adminConfigWarnings, adminMfaProblem, sessionSecretProblem } = require('./utils/adminSession')
const adminRoutes = require('./routes/adminRoutes')
const studentRoutes = require('./routes/studentRoutes')
const { errorHandler, notFound } = require('./middleware/errorMiddleware')
const Student = require('./models/Student')

const port = Number(process.env.PORT) || 5000
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

function createApp(redisClient) {
  const app = express()
  app.disable('x-powered-by')
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY)
  if (trustProxy !== false) app.set('trust proxy', trustProxy)
  app.use(helmet())
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      const error = new Error('Origin is not allowed.')
      error.status = 403
      return callback(error)
    },
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }))
  app.use(express.json({ limit: '16kb' }))

  app.get('/api/health', (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1
    const rateLimitReady = !redisClient || redisClient.isReady
    const ready = databaseReady && rateLimitReady
    res.status(ready ? 200 : 503).set('Cache-Control', 'no-store').json({
      status: ready ? 'ok' : 'unavailable',
      database: databaseReady ? 'connected' : 'disconnected',
      rateLimitStore: redisClient ? (rateLimitReady ? 'connected' : 'disconnected') : 'memory',
    })
  })

  app.use('/api/admin', adminRoutes.createAdminRoutes(redisClient))
  app.use('/api/students', studentRoutes.createStudentRoutes(redisClient))
  app.use(notFound)
  app.use(errorHandler)
  return app
}

const app = createApp()

async function startServer() {
  let redisClient
  try {
    if (process.env.NODE_ENV === 'production') {
      const secretProblem = sessionSecretProblem()
      if (secretProblem) throw new Error(secretProblem)
      const mfaProblem = adminMfaProblem()
      if (mfaProblem) throw new Error(mfaProblem)
    }
    for (const warning of adminConfigWarnings()) console.warn(warning)
    redisClient = await connectRateLimitRedis()
    if (!redisClient) console.warn('REDIS_URL is not set. Using in-memory rate limits for local development only.')
    await connectDatabase()
    await Student.init()
    createApp(redisClient).listen(port, () => console.log(`ByteMonk API listening on port ${port}`))
  } catch (error) {
    if (typeof error.message === 'string' && /^(MONGO_URI|ADMIN_SESSION_SECRET|ADMIN_TOTP_SECRETS|ADMIN_API_KEYS|REDIS_URL)/.test(error.message)) {
      console.error(error.message)
    } else if (error.syscall === 'querySrv') {
      console.error(`Backend startup failed: MongoDB Atlas DNS SRV lookup was refused (${error.code || 'network error'}). Use a DNS resolver that permits SRV queries, or copy the complete non-SRV mongodb:// connection string from Atlas.`)
    } else if (error.name === 'MongooseServerSelectionError') {
      const serverErrors = [...(error.reason?.servers?.values?.() || [])]
        .map(server => server.error?.code || server.error?.name)
        .filter(Boolean)
      const codes = [...new Set(serverErrors)].join(', ')
      console.error(`Backend startup failed: Could not reach MongoDB Atlas${codes ? ` (${codes})` : ''}. Check Atlas Network Access for this machine's public IP, cluster status, and outbound access to port 27017.`)
    } else {
      console.error('Backend startup failed:', error.name || 'Error', error.code || '')
    }
    if (redisClient?.isOpen) await redisClient.quit().catch(() => {})
    process.exitCode = 1
  }
}

if (require.main === module) startServer()

app.createApp = createApp
module.exports = app
