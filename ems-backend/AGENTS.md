# Backend Agent Guide

## Scope

This directory contains the Node.js, Express, and MongoDB backend for the Event Management System.

Keep API, authentication, database, middleware, and email-service changes here. Coordinate with the frontend when request or response contracts change.

## Backend structure

- `server.js` — application startup, global middleware, database startup, and API mounting.
- `routes/` — HTTP route definitions and route-level middleware.
- `controller/` — request handling and response orchestration.
- `services/` — integrations and reusable business services such as Brevo email.
- `models/` — Mongoose schemas and persistence models.
- `middleware/` — authentication, authorization, and rate limiting.
- `utils/` — reusable domain utilities such as event-status calculation and OTP helpers.
- `config/` — infrastructure configuration such as the database connection.

Preserve this separation. Do not put database queries in route definitions or duplicate authentication logic in individual controllers.

## Current authorization rules

- `student` and `admin` are the supported roles.
- Event creation, update, archive, and unarchive operations are admin-only.
- Event reads require an authenticated student or admin token. Registration and attendance actions are student-only; registration summaries and QR attendance controls are admin-only.
- Authorization must remain enforced on the server, not only in the frontend.

## Security and configuration

- Load private configuration from environment variables.
- Never commit or print `.env` values.
- Preserve password hashing, OTP handling, JWT handling, cookie configuration, credentialed CORS, and rate limiting.
- Return appropriate `401` responses for unauthenticated requests and `403` responses for authenticated users without permission.
- Validate identifiers, request bodies, dates, and other user-controlled values before persistence or sensitive operations.

## Backend verification

Run from `ems-backend/`:

```text
npm run dev
npm start
```

Run `npm test` for the focused authentication checks. These use simulated database and email responses; also perform appropriate live API smoke checks and report exactly what was verified.
