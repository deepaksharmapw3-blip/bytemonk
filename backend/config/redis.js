const { createClient } = require('redis')

async function connectRateLimitRedis() {
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is required in production so rate limits are shared across API instances.')
    }
    return null
  }

  const client = createClient({ url, socket: { connectTimeout: 5000 } })
  client.on('error', error => console.error('Rate-limit Redis connection error:', error.code || error.name || 'Error'))
  await client.connect()
  return client
}

module.exports = { connectRateLimitRedis }
