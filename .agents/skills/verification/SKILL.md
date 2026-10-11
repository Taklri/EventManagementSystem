---
name: verification
description: Verify Event Management System changes with the appropriate frontend, backend, API, security, event-domain, and repository checks. Use before reporting any implementation or documentation task as complete.
---

# Verification Skill

## Purpose

Use this skill before declaring work complete. Select checks based on the files and behavior changed; do not run unrelated checks merely to create noise.

## Before verifying

1. Read the root `AGENTS.md`.
2. Inspect `git status --short` and identify changes made for the current task.
3. Preserve pre-existing user changes. Do not reset, discard, clean, or rewrite unrelated files.
4. Read the relevant skill and reference files for the changed area:
   - `$frontend-ui` for `EMS/` changes.
   - `$backend-api` for routes, controllers, services, models, or utilities.
   - `$auth-security` for identity, tokens, cookies, OTP, CORS, rate limits, or permissions.
   - `$event-domain` for event behavior, dates, status, organizers, or archives.
5. Determine whether the change is frontend-only, backend-only, cross-stack, security-sensitive, event-related, or documentation-only.

## Repository and file checks

For every change:

- Inspect the final diff and changed-file list.
- Run `git diff --check` for whitespace errors when applicable.
- Confirm that only in-scope files changed.
- Check that no `.env` values, credentials, tokens, OTPs, or private configuration were added.
- Confirm that no generated dependency directories such as `node_modules/` were added.
- Do not modify or remove pre-existing unrelated work to make verification cleaner.

## Frontend verification

When files under `EMS/` change, run from `EMS/`:

```text
npm run lint
npm run build
```

When behavior or layout changes, run `npm run dev` and manually inspect the affected flow where possible.

Check as relevant:

- Student and admin views.
- Loading, empty, error, and success states.
- `401` and `403` behavior for protected flows.
- Responsive layout at narrow and wide viewports.
- Keyboard access, labels, focus states, and non-color status cues.
- Poppins, `#22356B`, Tailwind, shadcn, Material UI tables, and Lucide usage when UI styling is in scope.

## Backend verification

When files under `ems-backend/` change, run from `ems-backend/`:

```text
npm run dev
npm start
```

Confirm startup behavior as appropriate for the task. If startup requires unavailable environment variables, MongoDB, Brevo credentials, or another external dependency, report that verification limitation instead of fabricating a result.

For API changes, perform targeted smoke checks for:

- The changed success path.
- Invalid input.
- Missing resources when applicable.
- Unauthenticated access when applicable.
- Unauthorized role access when applicable.
- External-service failure when applicable.

The backend currently has no automated test suite. Do not report backend tests as passing unless an actual test command was run and succeeded.

## Security verification

For authentication or authorization changes, verify as relevant:

- Invalid or missing bearer tokens return `401`.
- Authenticated students cannot perform admin-only operations.
- Valid admins can perform allowed operations.
- Users cannot update another profile unless authorized as an admin.
- Invalid, expired, consumed, and over-attempt OTPs are rejected.
- Refresh and logout preserve refresh-cookie behavior.
- Rate limits remain attached to sensitive routes.
- No password, OTP, token, secret, or provider credential appears in output or changed files.

Use test credentials and test OTP values only.

## Event verification

For event-related changes, verify as relevant:

- Required event fields are validated.
- Invalid dates are rejected.
- `endDate` must be after `startDate`.
- Organizer references are validated.
- Status is correct before, at, during, at the end of, and after an event.
- Archived events are excluded from active collections.
- Archived events cannot be edited or archived again.
- Admin-only mutations remain protected.
- No unsupported registration, attendance, capacity, payment, venue, or approval behavior was introduced accidentally.

## Reporting format

Report verification in four groups:

```text
Passed
- <check and result>

Failed
- <check and failure, or “None”>

Not run
- <check and reason, or “None”>

Scope notes
- <pre-existing changes, external dependency limitations, or contract changes>
```

Use precise language:

- Say `npm run build passed` only when it actually passed.
- Say `not run` when a check was skipped.
- Say `blocked by missing MongoDB/environment configuration` when an external dependency prevents verification.
- Do not substitute a build check for an API or security check.
- Do not claim manual UI verification when the application was not opened and inspected.

## Completion criteria

A task is verified only when:

- Applicable checks passed or their limitations are clearly reported.
- The changed files match the requested scope.
- No sensitive values were introduced.
- Relevant security and permission paths were considered.
- The final report distinguishes passed, failed, and unrun checks.
