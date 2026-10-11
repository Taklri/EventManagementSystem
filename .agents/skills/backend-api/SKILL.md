---
name: backend-api
description: Build or review Express 5 routes, controllers, middleware, services, Mongoose models, and API behavior for the Event Management System. Use when changing files under ems-backend/ or when a task affects backend request and response contracts.
---

# Backend API Skill

## Purpose

Use this skill for backend work in `ems-backend/`. Preserve the current API boundaries, security controls, data contracts, and National University Event Management System behavior.

## Before changing code

1. Read the root `AGENTS.md` and `ems-backend/AGENTS.md`.
2. Read `../../references/architecture.md` for the backend request flow.
3. Read `../../references/api-contract.md` before changing a route, request body, response shape, status code, or authentication requirement.
4. Read `../../references/security-rules.md` for authentication, authorization, cookies, rate limits, and environment variables.
5. Inspect the existing route, controller, model, middleware, service, or utility before adding a new implementation.
6. Confirm whether the change affects students, admins, public event readers, or more than one audience.

## Responsibility boundaries

Preserve the existing backend layering:

```text
server.js
  -> routes/
  -> middleware/
  -> controller/
  -> services/, models/, or utils/
```

- `server.js` owns application startup, global middleware, database startup, and API mounting.
- `routes/` owns HTTP paths, methods, and route-level middleware composition.
- `middleware/` owns reusable authentication, authorization, and rate-limiting checks.
- `controller/` owns request validation, orchestration, and response formatting.
- `services/` owns external integrations and reusable service operations.
- `models/` owns Mongoose schemas, persistence rules, and model-level validation.
- `utils/` owns reusable deterministic logic such as OTP helpers and computed event status.
- `config/` owns infrastructure configuration such as the database connection.

Do not put database queries in route definitions or duplicate authentication and authorization logic across controllers.

## Route and request rules

- Keep API routes under the existing `/api` mount unless a deliberate contract change is required.
- Use the existing `/api/users` and `/api/events` route groups for related endpoints.
- Compose authentication and role middleware at the route boundary for protected operations.
- Treat all request body, path parameter, query parameter, date, identifier, and external-service inputs as untrusted.
- Validate required fields before persistence or external side effects.
- Normalize values consistently with current behavior, such as lowercasing emails and trimming user input.
- Preserve the current `Authorization: Bearer <access-token>` convention for protected requests.
- Do not make a route public merely because the frontend hides or shows its control.

## Current role behavior

- Supported roles are `student` and `admin`.
- Event creation, update, and archive routes require authentication and the `admin` role.
- Event GET routes are public in the current routing.
- Profile updates require authentication and allow an admin to update another profile or a user to update their own profile.
- Keep server-side authorization as the source of truth.

## Controller and response rules

- Return early for invalid input, missing resources, authentication failures, and authorization failures.
- Use the existing response style with a human-readable `message` property.
- Preserve established collection and object keys such as `events`, `users`, `event`, and `accesstoken`.
- Use status codes consistently with the current API contract: validation failures as `400`, unauthenticated requests as `401`, forbidden actions as `403`, missing resources as `404`, conflicts as `409`, rate limits as `429`, and server failures as `500` when appropriate.
- Map expected Mongoose validation, cast, and duplicate-key errors to useful client responses.
- Do not return passwords, password hashes, OTP hashes, refresh tokens, API keys, or private configuration.
- Do not expose stack traces or raw provider errors to clients.
- Log only information that is safe for the development environment and never log credentials or tokens.

## Database and model rules

- Use Mongoose models for persistence and preserve the existing schema responsibilities.
- Keep model validation close to the model when it expresses a data invariant.
- Keep request-specific validation in controllers or a dedicated validation layer when one is introduced.
- Validate relationships before assigning referenced documents when current behavior requires it.
- Preserve timestamps, references, archive flags, and computed fields unless the task explicitly changes the data contract.
- Do not introduce stored event status values while status remains computed from dates.
- Do not add registration, attendance, capacity, payment, venue, or approval data unless the product contract has been intentionally expanded.

## External services and configuration

- Keep Brevo integration inside the service layer.
- Read private configuration from environment variables.
- Never copy environment values into source code, logs, documentation, or AI guidance.
- Preserve credentialed CORS behavior and the configured frontend origin.
- Handle external-service failures without returning private provider details.

## Verification

Run from `ems-backend/` after backend changes:

```text
npm run dev
npm start
```

For API changes, perform an appropriate smoke check against the affected endpoint and report the request, expected result, and actual result without exposing secrets. Check both permitted and denied paths when authentication or authorization is affected.

There is currently no automated backend test suite. Do not claim tests passed unless an actual test suite has been added and run.

## Completion checklist

- The change follows the existing route/controller/middleware/service/model boundaries.
- Request validation and error handling are explicit.
- API response keys and status codes match the documented contract or the contract change is clearly coordinated.
- Authentication and authorization remain server-enforced.
- No secrets or sensitive values are exposed.
- Unsupported product behavior was not invented.
- The backend starts successfully and relevant API smoke checks are reported accurately.
