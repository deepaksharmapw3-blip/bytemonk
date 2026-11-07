# ByteMonk API

## Configure

Copy `.env.example` to `.env`, then set `MONGO_URI` to the Atlas driver URI, `MONGO_DB_NAME` to `bytemonk_portal`, the admin settings below, and `CLIENT_ORIGIN` to the frontend origin. Keep `.env` private; it is ignored by Git. Never put an admin key in a `VITE_` variable or frontend code.

### Admin access

- `ADMIN_API_KEYS` holds one named key per organizer, as `name:key` pairs separated by commas. Each key must be at least 16 characters. `ADMIN_API_KEY` (a single shared key) still works and signs in as `admin`.
- Organizers sign in once with their key at `POST /api/admin/login`. The server returns a short-lived signed session token (`ADMIN_SESSION_TTL_MINUTES`, default 120, maximum 1440). The dashboard sends that token, not the key, on every other request.
- Five wrong keys from one client lock that client out for 15 minutes, even if the correct key is then entered. The login route also has its own rate limit.
- `ADMIN_SESSION_SECRET` signs the session tokens (at least 32 random characters). Locally, run `npm run setup:env` once: it creates `.env` if needed and adds a generated secret and `TRUST_PROXY=0`, without touching values you already set. For your host, run `npm run secret` and paste the result into the host's environment variables. With `NODE_ENV=production` the server refuses to start without a valid secret; otherwise sessions end whenever it restarts. The placeholder from `.env.example` is never accepted.
- **Rotating a key:** add the new key, redeploy, then remove the old one. **Ending every active session at once:** change `ADMIN_SESSION_SECRET`. **Removing one organizer:** delete their entry and change `ADMIN_SESSION_SECRET` (their current session otherwise lasts until it expires).
- Scripts that call the admin routes must sign in first and use the returned token. The raw key is no longer accepted on `/api/students` routes.

### Running behind a proxy

Hosts such as Render, Railway and Heroku put a reverse proxy in front of the app. Set `TRUST_PROXY=1` there so Express sees each visitor's real IP address. Without it every visitor shares the proxy's IP, so the rate limits and the login lockout would treat all users as one person. Use the exact number of proxies; `TRUST_PROXY=true` is rejected because clients could then spoof their IP. Leave it at `0` when running locally (`npm run setup:env` adds that line). In production the server logs a warning if `TRUST_PROXY` is not set.

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
