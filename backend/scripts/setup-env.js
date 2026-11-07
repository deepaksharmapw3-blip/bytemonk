#!/usr/bin/env node
/**
 * Prepares backend/.env for the admin session settings.
 *   npm run setup:env   create .env from .env.example if missing, add a random ADMIN_SESSION_SECRET
 *                       and TRUST_PROXY=0 if they are missing. Existing real values are never changed.
 *   npm run secret      print a fresh random secret to paste into your hosting dashboard
 */
const { randomBytes } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const MIN_SECRET_LENGTH = 32
const generateSecret = () => randomBytes(48).toString('base64url')

function readValue(text, name) {
  const match = text.match(new RegExp(`^${name}=(.*)$`, 'm'))
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : undefined
}

function setValue(text, name, value, eol) {
  const line = `${name}=${value}`
  const pattern = new RegExp(`^${name}=.*$`, 'm')
  if (pattern.test(text)) return text.replace(pattern, () => line)
  return `${text}${text && !text.endsWith('\n') ? eol : ''}${line}${eol}`
}

/** Pure function: returns the updated .env text and a list of what changed. */
function ensureEnv(text, makeSecret = generateSecret) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const changes = []
  let next = text

  const secret = readValue(next, 'ADMIN_SESSION_SECRET')
  if (!secret || secret.length < MIN_SECRET_LENGTH || /replace-with/i.test(secret)) {
    next = setValue(next, 'ADMIN_SESSION_SECRET', makeSecret(), eol)
    changes.push('ADMIN_SESSION_SECRET: generated a new random secret')
  }
  if (readValue(next, 'TRUST_PROXY') === undefined) {
    next = setValue(next, 'TRUST_PROXY', '0', eol)
    changes.push('TRUST_PROXY: set to 0 for local use (set it to 1 on your hosting provider)')
  }
  return { text: next, changes }
}

function main() {
  if (process.argv.includes('--print-secret')) {
    console.log(generateSecret())
    return
  }

  const envPath = path.join(__dirname, '..', '.env')
  const examplePath = path.join(__dirname, '..', '.env.example')
  let created = false
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '')
    created = true
    console.log('Created backend/.env from .env.example. Fill in MONGO_URI and your admin keys.')
  }

  const { text, changes } = ensureEnv(fs.readFileSync(envPath, 'utf8'))
  if (changes.length) fs.writeFileSync(envPath, text)
  if (!changes.length && !created) console.log('backend/.env already has a valid ADMIN_SESSION_SECRET and TRUST_PROXY. Nothing to change.')
  for (const change of changes) console.log(`- ${change}`)
  if (changes.length) console.log('Updated backend/.env. Keep this file private; it is ignored by Git.')
}

if (require.main === module) main()

module.exports = { ensureEnv, generateSecret }
