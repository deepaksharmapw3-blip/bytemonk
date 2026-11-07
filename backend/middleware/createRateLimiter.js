const rateLimit = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')

function createRateLimiter(options, redisClient, prefix) {
  const store = redisClient
    ? new RedisStore({
      prefix: `bytemonk:${prefix}:`,
      sendCommand: (...args) => redisClient.sendCommand(args),
    })
    : undefined

  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: false,
    ...options,
    ...(store ? { store } : {}),
  })
}

module.exports = createRateLimiter
