# ByteMonk Student Interest Portal

A responsive student interest portal for collecting workshop preferences and helping ByteMonk organizers plan community events.

## Features

- Student registration with client and server-side validation.
- Duplicate email prevention in MongoDB.
- Organizer dashboard with analytics, search, filters, and CSV export.
- Organizer sign-in with per-organizer keys, short-lived sessions, and lockout after repeated failed attempts.
- Branded favicon, link-preview (Open Graph) tags, and a proper 404 page. Set `VITE_SITE_URL` when deploying so shared links show a preview image.
- Privacy policy page linked from the consent checkbox and footer. Set `VITE_CONTACT_EMAIL` so students can reach you for data requests.
- Organizers can permanently delete a registration from the dashboard (search by email, then delete) to honor deletion requests.
- Responsive landing, registration, success, and organizer pages.

## Run the frontend

From the project root:

```powershell
npm install
npm run dev
```

The Vite development server uses `http://localhost:5173` by default.

## Run the backend

In a second terminal:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Run `npm run setup:env` to generate the session secret, then edit `backend/.env` with your MongoDB Atlas URI, your organizers' admin keys (`ADMIN_API_KEYS`) and an `ADMIN_SESSION_SECRET`, then start the API:

```powershell
npm run dev
```

The API listens on port 5000 by default. Keep `backend/.env` private; it is excluded from Git. Do not put an admin key in a `VITE_` variable or frontend code. See [backend/README.md](backend/README.md) for admin sign-in, lockout, and the `TRUST_PROXY` setting to use when deployed.

## Tests

Run backend validation and authorization tests from `backend/`:

```powershell
npm test
```

The optional live Atlas check inserts a temporary registration, verifies duplicate email rejection, and deletes the test record. Follow the steps in [backend/README.md](backend/README.md) to enable it explicitly.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) to get started. ByteMonk is released under the [MIT License](LICENSE).
