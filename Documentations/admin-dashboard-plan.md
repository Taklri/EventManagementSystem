# Admin Dashboard Implementation Plan

**Status:** Implemented; manual admin-screen review remains  
**Reference:** Admin dashboard image shared in chat  
**Scope:** Admin dashboard and role-separated portal routing

## Goal

Create a responsive National University admin dashboard based on the supplied design. Keep event information connected to the existing backend. Display dashboard sections whose data does not exist yet as clearly identified static previews, ready to be connected when those features are implemented.

## Agreed decisions

- Admins have a separate `/admin` area. Students continue to use `/home`.
- A student cannot view admin portal pages, and an admin cannot view student portal pages. Signed-out visitors go to login.
- New admin-only data APIs enforce the `admin` role on the backend. Existing public event GET endpoints remain public.
- Follow the dashboard image's layout and hierarchy, adapting it for tablet and mobile screens.
- Keep registration totals, attendance totals, recent registrations, and activity/announcement content as static previews until their backend features exist. Mark them as previews so sample values are not mistaken for live data.
- Show only supported destinations in the admin navigation. Do not add sidebar links to unfinished registration, student, or organization sections.
- Show the Create event action as **Coming soon**. There is an event-creation API, but no event-creation frontend form in this phase.

## Implementation

### 1. Role-aware authentication and routes

- Add `role` to the existing safe user summary returned by successful login OTP verification, registration OTP verification, and session refresh. Preserve `accesstoken` and refresh-cookie behavior.
- Keep the authenticated user and role in React auth state. Direct admins to `/admin` after login or refresh and students to `/home`.
- Guard admin routes and student routes separately. A signed-in user who opens the other role's page is redirected to their own landing page. Avoid showing protected content while the session is being restored.
- Continue enforcing admin authorization on backend event mutations. Protect any new dashboard endpoint with the existing bearer-token authentication and admin-role middleware.

### 2. Admin shell and dashboard UI

- Create reusable admin shell components for NU branding, responsive navigation, current-user menu, and sign-out.
- Build the dashboard with a welcome header, event summary cards, event-management overview, recent registrations preview, and activity/announcements preview.
- Use live event data for event counts and the overview. Use explicit preview labels for unsupported sections. Never present hard-coded registrations or attendance numbers as live metrics.
- Keep the Create event control visible with a Coming soon explanation. It will not submit to the API in this phase.
- Use Tailwind CSS, Poppins, the existing NU colors, and restrained Lucide icons. Use responsive layouts, keyboard-accessible controls, visible focus states, and reduced-motion-aware animation where it improves navigation.

### 3. Backend dashboard data

- Add an admin-only summary endpoint for the event counts and recent event overview needed by the dashboard. Calculate event statuses from start and end dates; do not persist a status field.
- Keep the current event list and detail API responses and public-read permissions unchanged.
- Document the new endpoint and the role field in `.agents/references/api-contract.md` and update the security reference if needed.

## Expected files

- Frontend: `EMS/src/App.jsx`, `EMS/src/context/AuthProvider.jsx`, `EMS/src/pages/OtpPage.jsx`, `EMS/src/lib/api.js`, and new admin shell/dashboard components under `EMS/src/components/` and `EMS/src/pages/`.
- Backend: `ems-backend/controller/authUserController.js` and a focused admin dashboard route/controller under `ems-backend/`.
- Documentation: relevant `.agents/references/` contract and security notes.

The repository is on the focused `AdminPortal` branch. Preserve the committed student-portal work while implementing the admin dashboard.

## Verification after implementation

- Confirm successful login and refresh send each role to its own portal.
- Confirm signed-out visitors cannot open either portal; students cannot open admin pages; admins cannot open student pages.
- Confirm the new dashboard API returns `401` without authentication, `403` for a student, and data for an admin.
- Check event counts against actual event records, including upcoming/ongoing date boundaries and archived records.
- Check loading, empty, and API-error states and desktop, tablet, and mobile layouts.
- Run frontend lint and build, applicable backend checks, inspect the changed files, and confirm no secrets were added. Report any checks that could not be completed.

## Guidance consulted

`AGENTS.md`, `EMS/AGENTS.md`, `ems-backend/AGENTS.md`, `.agents/README.md`, the architecture/API/security/event references, and the frontend UI, backend API, auth security, event domain, and verification skills.

Implementation was approved by the user after this plan was reviewed. The dashboard endpoint returned `401` without authentication, `403` for a student token, and `200` for an admin token during local smoke checks. The frontend build and all 26 backend checks passed. Full frontend lint is blocked by a pre-existing unused import in `EMS/src/pages/Test.jsx`; the changed frontend files lint cleanly. A visual review with an actual admin session remains to be done.
