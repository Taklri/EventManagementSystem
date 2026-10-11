# Using the AI Guidance System

This directory is the working guide for developers and AI assistants contributing to the National University Event Management System.

For a copy-and-fill feature request, use [`templates/feature-request.md`](templates/feature-request.md).

Use the guidance in this order:

1. Read the applicable `AGENTS.md` file for the directory being changed.
2. Read the relevant project references under `.agents/references/`.
3. Read the skill or skills that match the work.
4. Plan the change before editing application code.
5. Implement only the agreed scope.
6. Run the applicable verification checks and report the results accurately.

The guidance describes the current system. It does not replace the application source code, API behavior, or an explicit product decision.

## What each guidance area is for

### `AGENTS.md`

Use `AGENTS.md` for directory-level rules and boundaries:

- project structure
- frontend/backend ownership
- development commands
- security expectations
- branch and commit conventions
- AI skill routing

Read the root [AGENTS.md](../AGENTS.md) for repository-wide rules. When working inside `EMS/` or `ems-backend/`, also read that directory's `AGENTS.md`.

### `.agents/references/`

Use references for stable project facts:

- `architecture.md` — application structure and request flow
- `api-contract.md` — current routes, authentication requirements, and response expectations
- `event-rules.md` — event fields, permissions, archive behavior, and computed status
- `security-rules.md` — OTP, JWT, cookies, CORS, rate limiting, and secret-handling rules

Do not copy secrets or environment values into these documents. If the code changes, update the affected reference only when the documented project fact has intentionally changed.

### `.agents/skills/`

Use skills for repeatable work patterns. A skill is selected by the kind of change, not merely by the file extension.

| Work area | Skill |
| --- | --- |
| React pages, components, forms, layouts, styling, or frontend API integration | `$frontend-ui` |
| Express routes, controllers, middleware, services, models, or API behavior | `$backend-api` |
| OTP, passwords, JWTs, cookies, CORS, rate limits, authorization, or Brevo email | `$auth-security` |
| Event fields, dates, status, ownership, archive behavior, or event operations | `$event-domain` |
| Linting, builds, API checks, security checks, and completion reporting | `$verification` |

Read every skill that applies. For example, an admin event form that changes an authenticated API needs `$frontend-ui`, `$event-domain`, `$backend-api`, and `$auth-security`, followed by `$verification`.

## How to use the guidance when planning

Before implementation, write a short change plan that answers:

1. What user-visible or system behavior is changing?
2. Which frontend and backend boundaries are affected?
3. Which current API contracts, event rules, or security rules must remain intact?
4. Which skills and references were consulted?
5. What files are expected to change?
6. How will the change be verified?

Keep planning separate from implementation. If the requested feature is not currently supported—such as event registration, attendance, capacity limits, payments, approval states, or stored event status—identify it as a feature expansion instead of quietly treating it as existing behavior.

## How to use the guidance when implementing

During implementation:

- Keep frontend work in `EMS/` and backend work in `ems-backend/` unless a shared change is necessary.
- Preserve existing controller, service, middleware, model, and route responsibilities.
- Preserve API response shapes unless the change explicitly includes a contract update.
- Keep admin-only event mutations enforced by the backend, not only hidden in the UI.
- Keep event status computed from dates unless the product contract intentionally changes.
- Follow the UI system: Poppins, primary color `#22356B`, Tailwind CSS, shadcn primitives, Material UI for tables, and Lucide icons.
- Do not add passwords, OTPs, tokens, API keys, database URLs, or `.env` contents to source, logs, screenshots, documentation, or AI guidance.
- Do not add product workflows that are not confirmed and represented in the data model, API, permissions, UI, and verification plan.

If implementation reveals that the plan depends on an unknown product rule, pause and clarify the rule before choosing behavior that could change the system contract.

## How to use the guidance when testing

Use `$verification` before declaring work complete. At minimum:

### Frontend changes

From `EMS/`, run:

```text
npm run lint
npm run build
```

Run `npm run dev` and manually check affected screens when the change affects layout, forms, navigation, loading states, errors, permissions, or responsive behavior.

### Backend changes

From `ems-backend/`, run:

```text
npm run dev
npm start
```

Exercise affected endpoints where practical. Check successful requests, validation failures, unauthenticated requests, forbidden-role requests, not-found behavior, and relevant error responses. Run `npm test` for focused backend authentication checks with simulated database and email responses. These checks do not replace live API or email-delivery verification.

### Security-sensitive changes

Check both allowed and denied paths, including authentication state, role authorization, cookie behavior, CORS credentials, rate limits, OTP handling, and secret exposure. Never use real credentials or real OTPs in documentation or screenshots.

### Event-domain changes

Check date boundaries for Coming Soon, Ongoing, and Ended; archived-event behavior; public reads; admin-only mutations; organizer validation; and the affected event fields.

## How to report completion

A useful completion report should include:

- what changed
- which files changed
- checks that passed
- checks that failed
- checks that were not run and why
- any remaining risks or follow-up decisions

Use precise language. Say `npm run build passed` only after running it successfully. Say `not run` when a check was unavailable or outside the task scope. Do not treat a successful lint or build as proof that API permissions, security behavior, or every UI state was manually verified.

## Keeping this guidance accurate

Update this directory when a confirmed product or architecture change makes the guidance inaccurate. Keep:

- current facts in `.agents/references/`
- repeatable procedures in `.agents/skills/`
- directory boundaries in `AGENTS.md`
- developer onboarding and usage workflow in this file

When editing AI guidance, check for conflicting rules, broken references, invented features, copied secrets, and mismatched commands before committing the documentation change.
