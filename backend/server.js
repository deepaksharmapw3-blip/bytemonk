require('dotenv').config()

const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const mongoose = require('mongoose')
const connectDatabase = require('./config/db')
const studentRoutes = require('./routes/studentRoutes')
const { errorHandler, notFound } = require('./middleware/errorMiddleware')
const Student = require('./models/Student')

const app = express()
const port = Number(process.env.PORT) || 5000
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    const error = new Error('Origin is not allowed.')
    error.status = 403
    return callback(error)
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}))
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1
  res.status(ready ? 200 : 503).set('Cache-Control', 'no-store').json({ status: ready ? 'ok' : 'unavailable', database: ready ? 'connected' : 'disconnected' })
})

app.use('/api/students', studentRoutes)
app.use(notFound)
app.use(errorHandler)

async function startServer() {
  try {
    await connectDatabase()
    await Student.init()
    app.listen(port, () => console.log(`ByteMonk API listening on port ${port}`))
  } catch (error) {
    if (typeof error.message === 'string' && error.message.startsWith('MONGO_URI')) {
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
    process.exitCode = 1
  }
}

if (require.main === module) startServer()

module.exports = app
