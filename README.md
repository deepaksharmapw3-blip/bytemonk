# ByteMonk Student Interest Portal

A responsive student interest portal for collecting workshop preferences and helping ByteMonk organizers plan community events.

## Features

- Student registration with client and server-side validation.
- Duplicate email prevention in MongoDB.
- Organizer dashboard with analytics, search, filters, and CSV export.
- Admin routes protected by a server-side bearer key.
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

Edit `backend/.env` with your MongoDB Atlas URI and a long private `ADMIN_API_KEY`, then start the API:

```powershell
npm run dev
```

The API listens on port 5000 by default. Keep `backend/.env` private; it is excluded from Git. Do not put the admin key in a `VITE_` variable or frontend code.

## Tests

Run backend validation and authorization tests from `backend/`:

```powershell
npm test
```

The optional live Atlas check inserts a temporary registration, verifies duplicate email rejection, and deletes the test record. Follow the steps in [backend/README.md](backend/README.md) to enable it explicitly.
