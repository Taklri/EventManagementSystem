# Event Domain Reference

## Current event fields

Events currently contain:

- `title` — required, trimmed, 3–120 characters.
- `description` — required, trimmed, 10–1000 characters.
- `location` — required, trimmed, at least 3 characters.
- `organizer` — required reference to a `User`.
- `startDate` — required date.
- `endDate` — required date after `startDate`.
- `isArchived` — boolean, defaulting to `false`.
- `createdAt` and `updatedAt` — automatic timestamps.

## Roles and permissions

- `admin` users can create, update, and archive events.
- `student` users cannot mutate events through the current event routes.
- Public users can currently read non-archived events, archived events, and individual events through the public GET routes.
- The server, not the frontend, is responsible for enforcing event permissions.

## Event status

Status is computed at read time and is not currently stored as a database field:

- `Coming Soon` when the current time is before `startDate`.
- `Ongoing` when the current time is on or after `startDate` and on or before `endDate`.
- `Ended` when the current time is after `endDate`.

Status is added to returned event objects by `utils/eventStatus.js`.

## Mutation rules

- Creation requires `title`, `description`, `location`, `organizer`, `startDate`, and `endDate`.
- Start and end dates must parse as valid dates.
- `endDate` must be after `startDate`.
- The organizer must reference an existing user.
- Archived events cannot be edited.
- An already archived event cannot be archived again.
- Archiving sets `isArchived` to `true`; it does not delete the document.

## Current non-features

Do not assume the system currently implements:

- Student event registration
- Attendance tracking
- Capacity limits
- Venue management
- Payment processing
- Approval or rejection states
- Event notifications beyond authentication OTP email
- Stored event status values
