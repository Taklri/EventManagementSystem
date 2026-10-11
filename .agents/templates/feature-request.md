# AI Feature Request Template

Copy this template when asking an AI assistant to plan, implement, or test a feature in the National University Event Management System.

Replace the bracketed text and remove sections that do not apply. Give the AI enough context to understand the desired outcome, but do not include passwords, OTPs, tokens, API keys, database URLs, `.env` contents, or other secrets.

## Request

I want to add or change:

`[Describe the feature in one or two sentences.]`

The reason for this change is:

`[Describe the user or business problem.]`

## Users and permissions

- Primary user: `[admin / student / unauthenticated visitor / other]`
- Other affected users: `[roles or none]`
- Who may view this feature: `[roles]`
- Who may create, edit, or delete data: `[roles]`
- What must be denied: `[unauthenticated users, students, other roles, or none]`

## Requirements

- `[Requirement 1]`
- `[Requirement 2]`
- `[Requirement 3]`

## Out of scope

Do not implement or assume:

- `[Explicitly list related features that are not part of this request.]`
- `[Example: student registration, attendance tracking, capacity limits, payments, or notifications.]`

## Existing behavior to preserve

- Existing API behavior: `[routes, response shapes, or “not applicable”]`
- Existing event rules: `[status, dates, archive behavior, or “not applicable”]`
- Existing authentication/security behavior: `[OTP, JWT, cookie, CORS, rate-limit, or “not applicable”]`
- Existing UI conventions: Poppins, primary color `#22356B`, Tailwind CSS, shadcn, Material UI for tables, and Lucide icons.

## Expected UI behavior

- Page or component: `[name or location]`
- Entry point: `[navigation item, button, route, or “not applicable”]`
- Loading state: `[expected behavior]`
- Empty state: `[expected behavior]`
- Validation errors: `[expected behavior]`
- Success state: `[expected behavior]`
- Failure state: `[expected behavior]`
- Responsive/accessibility requirements: `[keyboard, labels, mobile behavior, focus, or other]`

## Expected API or data behavior

- Endpoint or model affected: `[route, controller, model, or “not applicable”]`
- Request data: `[fields and validation rules]`
- Response data: `[expected shape or “preserve existing shape”]`
- Status codes: `[expected success and error codes]`
- Database changes: `[none / fields / model / migration or data consideration]`
- External services: `[none / Brevo / other approved service]`

## Skills and references to use

Use the guidance that applies:

- `$frontend-ui` — frontend pages, components, forms, styling, and API integration
- `$backend-api` — routes, controllers, middleware, services, models, and API behavior
- `$auth-security` — authentication, authorization, cookies, CORS, rate limits, OTP, JWT, or Brevo
- `$event-domain` — event fields, dates, status, organizers, archives, and event operations
- `$verification` — checks and completion reporting

Also read the relevant files under `.agents/references/` before implementation.

## Planning instruction

Before changing files:

1. Inspect the existing implementation and relevant guidance.
2. Identify the affected files and boundaries.
3. Explain any API, data-model, permission, UI, or security impact.
4. Identify assumptions and unknown product decisions.
5. Create a step-by-step implementation plan.
6. List the verification checks that will be run.
7. Wait for my confirmation before implementing.

Do not invent unsupported workflows. If the request requires a new product capability, identify the required model, API, permissions, UI, and verification changes first.

## Implementation instruction

After I approve the plan:

1. Implement only the approved scope.
2. Preserve unrelated existing work.
3. Keep frontend/backend responsibilities in their current boundaries.
4. Preserve security and authorization enforcement on the server.
5. Inspect the changed files before reporting completion.

## Testing and verification instruction

After implementation:

- Run the applicable frontend checks: `npm run lint` and `npm run build` from `EMS/`.
- Run the applicable backend startup or API checks from `ems-backend/`.
- Test successful and invalid input paths.
- Test unauthenticated and unauthorized access where relevant.
- Test loading, empty, error, success, responsive, and accessibility states for affected UI.
- For event changes, test date boundaries, archive behavior, organizer validation, and admin-only mutations where relevant.
- Confirm no secrets or `.env` values were added.
- Report `Passed`, `Failed`, `Not run`, and `Scope notes` separately.
- Do not claim a test passed unless it was actually run.

## Completion report format

Use this format:

```text
Implemented
- [Summary of the completed change]

Changed files
- [File path and purpose]

Passed
- [Check and result]

Failed
- [Check and failure, or “None”]

Not run
- [Check and reason, or “None”]

Scope notes
- [Limitations, pre-existing changes, dependency requirements, or follow-up decisions]
```
