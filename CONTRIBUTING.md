# Contributing to ByteMonk

Thanks for helping out. This guide covers how to run the project locally and what we look for in a pull request.

## What you need

- Node.js 20.19 or newer (or 22.12+), with npm
- A MongoDB database. A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works well.

## Run it locally

Frontend, from the project root:

```sh
npm install
npm run dev
```

Backend, in a second terminal:

```sh
cd backend
npm install
npm run setup:env
```

`npm run setup:env` creates `backend/.env` from `backend/.env.example` and generates the session secret. Open `backend/.env` and fill in `MONGO_URI` and `ADMIN_API_KEYS` (one `name:key` pair per organizer, each key at least 16 characters). Then start the API:

```sh
npm run dev
```

The site runs at http://localhost:5173 and the API at http://localhost:5000. See [backend/README.md](backend/README.md) for every setting and route.

## Project layout

| Path | What lives there |
| --- | --- |
| `src/pages` | Home, registration, success, privacy, organizer dashboard and 404 pages |
| `src/components` | Shared header and footer |
| `src/api` | Calls to the backend |
| `src/styles`, `src/index.css` | Plain CSS. `base.css` is the browser reset. |
| `backend/controllers`, `routes`, `middleware` | Request handling, validation, admin auth |
| `backend/models` | Mongoose schema |
| `backend/test` | Backend tests |

## Before you open a pull request

From the project root:

```sh
npm run lint
npm run build
```

From `backend/`:

```sh
npm test
```

All of these should pass. If you change behaviour, add or update a test in `backend/test` where it makes sense.

## Guidelines

- **Keep changes focused.** One fix or feature per pull request, with a short description of what changed and why.
- **Registration choices live in two places.** Departments, years, interests, formats and timings are listed in the frontend (`src/pages/RegisterPage.jsx`, `src/data/interests.js`) and again in the backend (`backend/controllers/studentController.js`, `backend/models/Student.js`). Change both, or valid submissions will be rejected.
- **Never commit secrets or real data.** `backend/.env` is ignored by Git; keep it that way. Do not put admin keys in frontend code or in any `VITE_` variable.
- **Treat registrations as personal data.** They contain names, emails and phone numbers. Never paste real records into issues, pull requests or screenshots.
- **Match the existing style.** Function components, plain CSS in `src/styles`, and short, readable code.

## Reporting security problems

Please do not open a public issue for a vulnerability. Use the repository's **Security** tab and choose **Report a vulnerability** if it is available, or contact a maintainer privately.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
