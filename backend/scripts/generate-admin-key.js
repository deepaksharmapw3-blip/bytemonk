const { randomBytes } = require('node:crypto')

console.log(randomBytes(32).toString('base64url'))
