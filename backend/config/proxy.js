/**
 * Parses TRUST_PROXY for Express.
 *   unset / "false" / "0"  -> don't trust proxy headers (local development)
 *   "1", "2", ...          -> number of reverse-proxy hops in front of the app (Render, Railway, Heroku, Nginx: 1)
 *   "loopback,10.0.0.0/8"  -> trust specific addresses or subnets
 * "true" is rejected: it would let any client spoof X-Forwarded-For and dodge rate limits and lockouts.
 */
function parseTrustProxy(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw || raw.toLowerCase() === 'false') return false
  if (raw.toLowerCase() === 'true') {
    throw new Error('TRUST_PROXY=true is unsafe. Use the number of proxy hops (for example 1) or a list of trusted proxy addresses.')
  }
  if (/^\d+$/.test(raw)) return Number(raw)
  return raw
}

module.exports = { parseTrustProxy }
