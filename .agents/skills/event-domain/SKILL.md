---
name: event-domain
description: Build or review event models, event APIs, event status behavior, event detail views, admin event operations, and archived-event behavior for the National University Event Management System. Use when a task affects event fields, dates, organizers, permissions, or event presentation.
---

# Event Domain Skill

## Purpose

Use this skill whenever a change affects the meaning, lifecycle, persistence, API behavior, permissions, or presentation of an event. Treat the current event reference and API contract as the source of truth.

## Before changing code

1. Read the root `AGENTS.md`.
2. Read `../../references/event-rules.md` completely.
3. Read `../../references/api-contract.md` for event endpoints and response shapes.
4. If changing backend behavior, read `ems-backend/AGENTS.md` and use `$backend-api`.
5. If changing event screens, read `EMS/AGENTS.md` and use `$frontend-ui`.
6. Identify whether the change affects public readers, students, admins, or multiple audiences.

## Current event model

The current event document contains:

- `title` — required, trimmed, 3–120 characters.
- `description` — required, trimmed, 10–1000 characters.
- `location` — required, trimmed, at least 3 characters.
- `organizer` — required reference to a `User`.
- `startDate` — required date.
- `endDate` — required date after `startDate`.
- `isArchived` — boolean, defaulting to `false`.
- `createdAt` and `updatedAt` — automatic timestamps.

Do not add fields merely because they appear in a design mockup. Confirm that the backend contract and product requirements support them first.

## Current permissions

- `admin` users can create, update, and archive events.
- `student` users cannot mutate events through the current event routes.
- Public users can currently read non-archived events, archived events, and individual events through the current GET routes.
- Server-side authorization is authoritative; frontend controls must not be treated as permission enforcement.

## Current event API

| Method | Path | Current behavior |
| --- | --- | --- |
| `POST` | `/api/events` | Admin-only event creation. |
| `GET` | `/api/events` | Public non-archived events with computed status. |
| `GET` | `/api/events/archived` | Public archived events with computed status. |
| `GET` | `/api/events/:id` | Public individual event lookup with populated organizer and computed status. |
| `PUT` | `/api/events/:id` | Admin-only update of a non-archived event. |
| `PATCH` | `/api/events/:id/archive` | Admin-only archive operation. |

Preserve response keys such as `events`, `event`, and `message` unless an intentional API contract change is being made.

## Event status

Status is computed at read time by `utils/eventStatus.js`; it is not stored in MongoDB:

- `Coming Soon` when the current time is before `startDate`.
- `Ongoing` when the current time is on or after `startDate` and on or before `endDate`.
- `Ended` when the current time is after `endDate`.

Use the backend-provided status in frontend displays when it is available. Do not create a second conflicting status calculation in the frontend.

When testing boundaries, verify behavior immediately before the start, at the start, during the event, at the end, and after the end.

## Mutation rules

### Create

Creation requires all of the following:

- Title
- Description
- Location
- Organizer
- Start date
- End date

Validate date parsing, ensure the end date is after the start date, and confirm that the organizer exists.

### Update

- Only admins may update events through the current route.
- Archived events cannot be edited.
- Partial updates are supported by the current controller.
- Updated dates must remain valid and maintain `endDate > startDate`.
- A changed organizer must reference an existing user.

### Archive

- Archiving sets `isArchived` to `true`; it does not delete the document.
- An already archived event cannot be archived again.
- Active-event collection queries exclude archived events.
- Archived-event queries include archived events.

## Product-boundary rule

The following are not currently implemented and must not be assumed to exist:

- Student registration for events
- Attendance tracking
- Capacity limits
- Dedicated venue management
- Payment processing
- Approval or rejection states
- Event notifications beyond authentication OTP email
- Stored event status values

If one of these becomes a confirmed product requirement, treat it as a deliberate feature expansion: define its data model, API contract, permissions, UI behavior, and verification before implementing it.

## Completion checklist

- Event fields match the current model or the change is explicitly intentional.
- Admin-only mutations remain server-enforced.
- Public reads preserve the current archive behavior.
- Date validation and status boundaries remain correct.
- Status remains computed unless the product contract is intentionally changed.
- Organizer references are validated.
- No unsupported event workflow was invented.
- Affected API, frontend, and permission paths are verified and reported accurately.
