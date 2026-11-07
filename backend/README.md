# ByteMonk API

## Configure

Copy `.env.example` to `.env`, then set `MONGO_URI` to the Atlas driver URI, `MONGO_DB_NAME` to `bytemonk_portal`, the admin settings below, and `CLIENT_ORIGIN` to the frontend origin. Keep `.env` private; it is ignored by Git. Never put an admin key in a `VITE_` variable or frontend code.

### Admin access

- `ADMIN_API_KEYS` holds one named key per organizer, as `name:key` pairs separated by commas. Each key must be at least 16 characters in development and 32 characters in production. Generate keys with `npm run admin:key` in `backend/`. `ADMIN_API_KEY` (a single shared key) is supported only in development; production rejects it.
- In production, each organizer must also have their own Base32 authenticator secret in `ADMIN_TOTP_SECRETS`, formatted as `name:secret,name:secret`. Generate a secret with `npm run secret:totp` in `backend/`, then enroll that secret in an authenticator app using its “enter setup key” option (time-based, 6 digits, 30 seconds). Do not send these secrets in chat or commit them.
- Organizers sign in with their key and current six-digit authenticator code at `POST /api/admin/login`. The server returns a short-lived signed session token (`ADMIN_SESSION_TTL_MINUTES`, default 120, maximum 1440). The dashboard sends that token, not the credentials, on every other request.
- Production requires `ADMIN_SESSION_SECRET`, separate 32-character-or-longer keys and authenticator secrets for every organizer, plus `REDIS_URL`. It refuses to start when these are missing. Development can still use key-only sign-in if no authenticator secret is configured.
- The login route allows four failed attempts per IP within 15 minutes; the fifth is blocked. In production this counter is stored in Redis, shared by all API instances, and successful logins do not count toward the limit. Local development uses the existing in-memory fallback when `REDIS_URL` is absent.
- `ADMIN_SESSION_SECRET` signs the session tokens (at least 32 random characters). Locally, run `npm run setup:env` once: it creates `.env` if needed and adds a generated secret and `TRUST_PROXY=0`, without touching values you already set. For your host, run `npm run secret` and paste the result into the host's environment variables. With `NODE_ENV=production` the server refuses to start without a valid secret; otherwise sessions end whenever it restarts. The placeholder from `.env.example` is never accepted.
- **Rotate or revoke one organizer:** replace their key or remove their `name:key` entry from `ADMIN_API_KEYS` and deploy the configuration change. Their existing sessions stop working as soon as the updated configuration is active. Remove the matching `name:secret` from `ADMIN_TOTP_SECRETS` too. **Ending every active session at once:** change `ADMIN_SESSION_SECRET`.
- Scripts that call the admin routes must sign in first and use the returned token. The raw key is no longer accepted on `/api/students` routes.

### Shared rate-limit storage

- Set `REDIS_URL` to a private managed Redis connection string on the API host. Prefer the TLS form (`rediss://`) when the provider offers it. The same Redis instance must be reachable by every API instance.
- Sign-in, registration, admin read, and admin write counters use separate Redis key prefixes. If Redis becomes unavailable, requests fail closed instead of silently reverting to per-instance counters.
- `REDIS_URL` is a server secret. Do not add it to the frontend environment, source control, or chat.

### Running behind a proxy

Hosts such as Render, Railway and Heroku put a reverse proxy in front of the app. Set `TRUST_PROXY=1` there so Express sees each visitor's real IP address. Without it visitors may share the proxy IP for rate limiting. Use the exact number of proxies; `TRUST_PROXY=true` is rejected because clients could then spoof their IP. Leave it at `0` when running locally (`npm run setup:env` adds that line).

## Run

```sh
npm install
npm run dev
```

The API starts only after MongoDB connects and the unique email index is ready. `GET /api/health` reports whether the database is connected.

## Tests

Run validation, authorization, lockout and proxy tests with `npm test`.

To verify a live Atlas connection and duplicate email handling, run `npm run test:atlas` with `RUN_ATLAS_INTEGRATION=1` set in the environment. In PowerShell:

```powershell
$env:RUN_ATLAS_INTEGRATION = '1'
npm run test:atlas
Remove-Item Env:RUN_ATLAS_INTEGRATION
```

The Atlas test inserts one uniquely named temporary record, confirms a second registration with the same email gets HTTP 409, then deletes the test record. It only runs when explicitly enabled and when `MONGO_URI` points to Atlas.

## Routes

- `POST /api/admin/login` — exchange an admin key for a short-lived session token. Locks a client out after repeated failures.
- `POST /api/students/register` — validate and save a student registration. Email addresses are normalized and unique.
- `GET /api/students` — paginated registration data; requires `Authorization: Bearer <session token>`.
- `GET /api/students/analytics` — aggregate interest and student counts; requires a session token.
- `GET /api/students/export` — CSV export; requires a session token.
- `DELETE /api/students/:id` — permanently delete one registration (used for student deletion requests); requires a session token.

Admin keys belong only in the server environment and in the organizer's own hands. Never embed one in the browser app.
