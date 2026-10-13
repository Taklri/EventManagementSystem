# Event Management System frontend

React 19, Vite, and Tailwind CSS.

## Local development

1. Install dependencies with `npm install` in `EMS/` and `ems-backend/`.
2. Start the configured backend with `npm run dev` in `ems-backend/`.
3. Start the frontend with `npm run dev` in `EMS/`, then open the displayed localhost URL.

The frontend calls `/api` by default. Vite forwards those requests to the local backend on port 5000. If the API is hosted elsewhere, set the public `VITE_API_BASE_URL` value to the API root, including `/api`. Configure the backend's allowed frontend origin accordingly. Use consistent hostnames so the existing strict refresh cookie works.

Production hosting must forward `/api` to the backend or provide `VITE_API_BASE_URL` at build time. Frontend environment values are public; never put credentials or secrets in them.

## Authentication screens

- `/`: login, followed by `/login/otp`.
- `/register`: registration, followed by `/register/otp`.
- `/home`: authenticated welcome screen with sign out.

Both OTP screens require a challenge from the preceding form. Access tokens stay in memory; the HTTP-only refresh cookie restores a session after reload. Registration collects the student ID, names, year level, and program, accepts valid personal email addresses, and creates a student account only after email verification.

## Checks

Run `npm run lint` and `npm run build` in `EMS/`. Run `npm test` in `ems-backend/` for the focused auth checks; database and email delivery are simulated in that suite.
