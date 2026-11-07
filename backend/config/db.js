const mongoose = require('mongoose')

async function connectDatabase() {
  const uri = process.env.MONGO_URI?.trim()
  if (!uri) throw new Error('MONGO_URI is required.')
  if (/[<>]/.test(uri)) throw new Error('MONGO_URI contains angle brackets. Replace template placeholders and percent-encode literal special characters in credentials.')
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) throw new Error('MONGO_URI must be a MongoDB connection string.')

  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB_NAME || 'bytemonk_portal',
    serverSelectionTimeoutMS: 10000,
  })
  console.log('MongoDB connection established.')
  return mongoose.connection
}

module.exports = connectDatabase
