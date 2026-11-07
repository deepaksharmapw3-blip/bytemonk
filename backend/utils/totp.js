const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto')

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function encodeBase32(buffer) {
  let bits = 0
  let value = 0
  let encoded = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      encoded += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits) encoded += ALPHABET[(value << (5 - bits)) & 31]
  return encoded
}

function decodeBase32(secret) {
  const normalized = secret.toUpperCase().replace(/=+$/g, '')
  if (!/^[A-Z2-7]+$/.test(normalized)) return null
  let bits = 0
  let value = 0
  const bytes = []
  for (const character of normalized) {
    value = (value << 5) | ALPHABET.indexOf(character)
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function generateTotpSecret() {
  return encodeBase32(randomBytes(20))
}

function totpAt(secretBytes, counter) {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', secretBytes).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

function verifyTotp(code, secret, now = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false
  const secretBytes = decodeBase32(secret)
  if (!secretBytes || secretBytes.length < 16) return false
  const supplied = Buffer.from(code)
  const currentStep = Math.floor(now / 30_000)
  for (let drift = -1; drift <= 1; drift += 1) {
    const step = currentStep + drift
    if (step < 0) continue
    const expected = Buffer.from(totpAt(secretBytes, step))
    if (timingSafeEqual(supplied, expected)) return true
  }
  return false
}

module.exports = { decodeBase32, generateTotpSecret, verifyTotp }
