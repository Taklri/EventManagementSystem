# Event Management System — AI Agent Guide

## Project overview

This repository is the National University Event Management System. It is currently split into:

- `EMS/` — React 19 and Vite frontend.
- `ems-backend/` — Node.js, Express, and MongoDB backend.
- `Documentations/` — human-facing project notes.

The system currently supports two roles: `admin` and `student`. Administrators create, update, and archive events. Students and unauthenticated users can read event information through the current public GET routes, including the routes that expose archived events.

## Working boundaries

- Keep frontend changes inside `EMS/` unless a shared project change is required.
- Keep API, authentication, database, middleware, and email changes inside `ems-backend/`.
- Do not move logic between frontend and backend without documenting the reason.
- Do not invent registration, attendance, payment, venue, or approval workflows; they are not currently implemented.
- Preserve the existing route, controller, service, middleware, and model responsibilities.

## Development commands

Frontend:

```text
cd EMS
npm run dev
npm run lint
npm run build
npm run preview
```

Backend:

```text
cd ems-backend
npm run dev
npm start
```

Run `npm test` in `ems-backend/` for the focused authentication checks, which use simulated database and email responses. Do not claim live database or email delivery was verified by these tests.

## Git and collaboration rules

- Do not develop directly on `main`.
- Create a focused feature or task branch before application changes.
- Pull the latest `main` before creating a new branch when working with the remote repository.
- Use clear conventional commit messages such as `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, and `chore:`.
- Keep unrelated work out of the current branch.
- Do not rewrite or delete another contributor's work without discussing it first.
- Use pull requests for review before merging.

## Security expectations

- Never commit `.env` files, passwords, OTPs, JWT secrets, API keys, database URLs, or private email-service credentials.
- Never expose passwords, OTPs, tokens, or secrets in logs, responses, screenshots, documentation, or AI guidance.
- Preserve authentication, authorization, cookie, CORS, and rate-limiting protections when changing backend code.
- Treat authentication and authorization changes as security-sensitive and verify both allowed and denied paths.

## AI skill routing

For a practical workflow covering planning, implementation, testing, and completion reporting, read `.agents/README.md`.

Use the canonical skills under `.agents/skills/` when the task matches:

- `$frontend-ui` — React pages, components, forms, layout, styling, and frontend API integration.
- `$backend-api` — Express routes, controllers, middleware, services, models, and API behavior.
- `$auth-security` — OTP, passwords, JWTs, cookies, CORS, rate limiting, authorization, or Brevo email.
- `$event-domain` — event fields, event status, event ownership, archive behavior, or admin event operations.
- `$verification` — final checks, builds, linting, API smoke checks, and completion reporting.

Read only the skill and references needed for the task. Keep skills focused on repeatable workflows; keep durable project facts in `.agents/references/`.

## Completion reporting

Before reporting a change as complete:

1. Inspect the changed files.
2. Run the applicable frontend or backend checks.
3. Confirm no secrets were added.
4. Report checks that were run and checks that were unavailable.
5. Do not claim behavior was verified when it was not tested.
