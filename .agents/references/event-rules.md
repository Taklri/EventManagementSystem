# Event Domain Reference

## Current event fields

Events currently contain:

- `title` — required, trimmed, 3–120 characters.
- `description` — required, trimmed, 10–1000 characters.
- `location` — required, trimmed, at least 3 characters.
- `organizerName` — hosting organization text on new events; editable by admins.
- `organizer` — optional legacy reference to a `User`, retained for older events and JSON callers.
- `createdBy` — internal reference to the creating admin, set from the verified token.
- `imageUrl` — optional public Cloudinary cover URL; `imagePublicId` is internal for cleanup.
- `eventType` — one of `Seminar`, `Workshop`, `Webinar`, `Conference`, `Performance`, `Sports`, `Orientation`, or `Other`.
- `tags` — up to eight optional free-text labels.
- `agenda` — ordered program items with title, optional description, campus-time start/end, and speaker keys.
- `speakers` — embedded speaker profiles with name, role, and optional Cloudinary photo.
- `requirements` and `reminders` — optional display-only guidance lists.
- `registrationMode` — `none` or `required`; `capacity` is optional when registration is required.
- `startDate` — required date.
- `endDate` — required date after `startDate`.
- `isArchived` — boolean, defaulting to `false`.
- `createdAt` and `updatedAt` — automatic timestamps.

## Roles and permissions

- `admin` users can create, update, archive, and unarchive events.
- `student` users can browse protected events and manage only their own registrations and attendance.
- `admin` users can view all events and registration/attendance summaries.
- Unauthenticated users cannot read event routes; the server returns `401`, and authenticated users outside the student/admin roles receive `403`.
- The server, not the frontend, is responsible for enforcing event permissions.

## Event status

Status is computed at read time and is not currently stored as a database field:

- `Coming Soon` when the current time is before `startDate`.
- `Ongoing` when the current time is on or after `startDate` and on or before `endDate`.
- `Ended` when the current time is after `endDate`.

Status is added to returned event objects by `utils/eventStatus.js`.

## Mutation rules

- Creation requires `title`, `description`, `location`, `startDate`, `endDate`, a hosting organization name, and a valid event type. Legacy JSON callers may provide an existing `organizer` user ID instead.
- Start and end dates must parse as valid dates.
- `endDate` must be after `startDate`.
- Agenda dates must be inside the event range and end after their start. Agenda entries may overlap for parallel sessions.
- Capacity is optional for registration-required events and is removed when registration mode is `none`.
- New events must start and end on or after the current Asia/Manila calendar date. Events may start earlier today; updating older events retains its existing behavior.
- A supplied legacy organizer must reference an existing user. New events use hosting organization text.
- Archived events cannot be edited.
- Admins may update the event text, schedule, and cover image on non-archived events. Replaced or removed Cloudinary images are cleaned up after persistence succeeds.
- An already archived event cannot be archived again.
- Archiving sets `isArchived` to `true`; it does not delete the document.
- Unarchiving sets `isArchived` to `false`. An event that is not archived cannot be unarchived again.

## Registration and attendance

- Registration is available only when `registrationMode` is `required` and before the event starts.
- A full event places new students in `waitlisted` status. Waitlist entries preserve creation order and are not automatically promoted in v1.
- A student may cancel before the event starts; the record is retained with `cancelled` status.
- Attendance is available only for registered students during the event window. A signed, short-lived event QR token records the first scan as `timeIn` and the next as `timeOut`.
- No-registration events do not collect attendance records.

## Current non-features

The system does not implement organization accounts, online meeting links, venue directories, payment processing, approval or rejection states, automatic waitlist promotion, attendance photos/biometrics, or automated event reminders.
