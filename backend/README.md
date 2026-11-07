# ByteMonk API

## Configure

Copy `.env.example` to `.env`, then set `MONGO_URI` to the Atlas driver URI, `MONGO_DB_NAME` to `bytemonk_portal`, `ADMIN_API_KEY` to a long private key, and `CLIENT_ORIGIN` to the frontend origin. Keep `.env` private; it is ignored by Git. Do not put `ADMIN_API_KEY` in a `VITE_` variable or frontend code.

## Run

```sh
npm install
npm run dev
```

The API starts only after MongoDB connects and the unique email index is ready. `GET /api/health` reports whether the database is connected.

## Tests

Run validation and authorization tests with `npm test`.

To verify a live Atlas connection and duplicate email handling, run `npm run test:atlas` with `RUN_ATLAS_INTEGRATION=1` set in the environment. In PowerShell:

```powershell
$env:RUN_ATLAS_INTEGRATION = '1'
npm run test:atlas
Remove-Item Env:RUN_ATLAS_INTEGRATION
```

The Atlas test inserts one uniquely named temporary record, confirms a second registration with the same email gets HTTP 409, then deletes the test record. It only runs when explicitly enabled and when `MONGO_URI` points to Atlas.

## Routes

- `POST /api/students/register` — validate and save a student registration. Email addresses are normalized and unique.
- `GET /api/students` — paginated registration data; requires `Authorization: Bearer <ADMIN_API_KEY>`.
- `GET /api/students/analytics` — aggregate interest and student counts; requires the admin key.
- `GET /api/students/export` — CSV export; requires the admin key.

Admin keys belong only in server-side tools or environments. Never embed one in the browser app.
