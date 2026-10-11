---
name: frontend-ui
description: Build or review React 19 and Vite frontend pages, components, forms, layouts, styling, and API integrations for the Event Management System. Use when changing files under EMS/ or when a task affects the student or admin user interface.
---

# Frontend UI Skill

## Purpose

Use this skill for frontend work in `EMS/`. Keep the result consistent with the National University Event Management System and its existing backend contracts.

## Before changing code

1. Read the root `AGENTS.md` and `EMS/AGENTS.md`.
2. Read `../../references/architecture.md` for application boundaries.
3. Read `../../references/api-contract.md` when the task uses or changes an API request or response.
4. Inspect the existing page, component, style, and asset structure before adding a new pattern.
5. Confirm whether the task is for a student view, an admin view, or a shared component.

## Implementation rules

- Use React components and hooks consistently with the existing Vite application.
- Keep page-level composition separate from reusable UI components.
- Prefer small, focused components with clear props and responsibilities.
- Preserve existing routes, entrypoints, and Vite configuration unless the task specifically requires a change.
- Use Tailwind CSS for layout, spacing, responsive behavior, typography, and visual tokens.
- Use shadcn for general-purpose UI primitives such as buttons, inputs, dialogs, tabs, dropdowns, and badges.
- Use Material UI specifically for data-display components such as tables, following `Documentations/Readme.md`.
- Use Lucide icons for interface icons and actions. Keep icon size, stroke weight, and alignment consistent.
- Reuse existing styles and assets before introducing new design patterns.
- Keep API calls and response handling explicit; do not silently rename backend fields.
- Treat server-side authentication and authorization as authoritative. Frontend visibility checks are only a user-experience aid.
- Keep secrets, tokens, OTPs, private URLs, and backend credentials out of browser code.

## Visual design philosophy

The Figma screenshots are references for visual language, hierarchy, and interaction quality—not fixed page layouts. Layouts may change when the feature or viewport requires it, but new UI should preserve the same design philosophy:

- Professional, trustworthy, and appropriate for a National University student system.
- Calm, organized, and information-dense without feeling crowded.
- Clear hierarchy: page title, supporting context, primary action, content sections, and secondary metadata.
- Functional first: visual decoration must not compete with actions or important information.
- Consistent admin and student experiences using the same visual language, while adapting density and content to each role.
- Modular composition using cards, panels, tables, dialogs, tabs, badges, and structured lists where they improve clarity.

## Design system rules

### Typography

- Use Poppins as the primary interface font.
- Use weight and size to establish hierarchy rather than excessive capitalization or decoration.
- Use bold or semibold dark headings, readable regular body text, and smaller muted metadata.
- If Poppins is not yet configured in the application, do not silently substitute a different design direction; coordinate the font setup as part of the UI work.

### Color

- Use `#22356B` as the primary brand color for primary buttons, active navigation, selected states, important links, and key actions.
- Use a light, cool-neutral page background with white cards and panels.
- Use dark navy or charcoal for primary text and muted gray for supporting text.
- Use semantic colors consistently when those states exist: green for success or published, amber for draft or pending, red for destructive or cancelled, and restrained blue or purple for informational states. Do not imply a state that the current product model does not support.
- Do not rely on color alone to communicate status, permission, or errors.
- Prefer reusable Tailwind or CSS design tokens over scattered one-off color values.

### Surfaces, spacing, and shape

- Favor white cards and panels on a light page canvas.
- Use subtle borders, restrained shadows, and consistent moderate corner rounding.
- Follow a 4px/8px spacing rhythm; use generous card padding and clear section separation.
- Keep forms, tables, cards, and dialogs visually aligned on a common grid.
- Avoid heavy shadows, excessive gradients, neon colors, glassmorphism, and decorative clutter.

### Navigation and shells

- A persistent sidebar and top header are acceptable patterns, but they are not mandatory fixed layouts.
- Active navigation should be obvious through the primary navy color and accessible text/icon treatment.
- Header actions may include notifications and the current user profile.
- Keep administrative controls visually distinct from student discovery and participation flows.

### Admin and student surfaces

- Admin screens may use denser tables, search/filter controls, status badges, pagination, compact actions, and edit dialogs.
- Student screens may use more visual event cards, event imagery, category badges, date/location metadata, and tabs. Registration history and notification lists are valid design patterns only when their backend capabilities exist; do not invent them for current event work.
- Event detail screens should prioritize image/title, category/status, date/time/location, primary actions, description, schedule, and speakers when those data exist.
- Use clear primary, secondary, and destructive action treatments; never make destructive actions look like ordinary navigation.

### Dialogs, lists, and notifications

- Dialogs should have a clear title, grouped content, an understandable scroll region when needed, and visible cancel/confirm actions.
- Long forms should remain usable on smaller screens and keep important actions accessible.
- Notifications should use readable grouping, timestamps, concise category labels, unread indicators, and recognizable Lucide icons.
- Use event imagery and avatars consistently with appropriate aspect ratios, object fitting, and alternative text.

## State and user experience

For asynchronous operations, provide appropriate states:

- Loading state while the request is pending.
- Empty state when a successful response has no records.
- Error state for failed requests.
- Success feedback after a completed mutation.
- Disabled or guarded controls while a mutation is in progress.

Handle protected API responses deliberately:

- `401` means the user is unauthenticated or the access token is invalid or expired.
- `403` means the user is authenticated but lacks permission.
- Validation errors should be shown in a useful field or form-level location.
- Do not display raw stack traces, tokens, OTPs, or private server details.

## Accessibility and responsive behavior

- Give form controls visible labels or an equivalent accessible name.
- Use semantic elements and meaningful button text.
- Preserve keyboard access and visible focus states.
- Provide useful alternative text for meaningful images; use empty alt text for decorative images.
- Do not rely on color alone to communicate status or errors.
- Check layouts at mobile, tablet, and desktop widths.
- Ensure tables and event details remain understandable on narrow screens.

## Event and role behavior

- Read `../../references/event-rules.md` before implementing event screens.
- Do not add controls for registration, attendance, capacity, payments, approval, or venue workflows unless the backend contract has been intentionally expanded.
- Admin-only controls must not be treated as a replacement for backend authorization.
- Render event status using the backend-provided `status` value when available.
- Preserve the distinction between active and archived event results.

## Verification

Run from `EMS/` after frontend changes:

```text
npm run lint
npm run build
```

For visible behavior, also run:

```text
npm run dev
```

Manually check the affected student and admin flows, including loading, empty, error, success, unauthorized, and forbidden states when relevant. Report checks that were not possible.

## Completion checklist

- The changed component or page follows the existing project structure.
- API field names and authentication behavior match the backend contract.
- Responsive and accessible states are present.
- No unsupported product behavior was invented.
- `npm run lint` and `npm run build` pass, or failures are reported accurately.
