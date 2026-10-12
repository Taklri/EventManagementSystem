# API Contract Reference

## Base paths

- API routes are mounted under `/api`.
- User routes use `/api/users`.
- Event routes use `/api/events`.
- The root health response is `GET /` with `{ "message": "API is working" }`.

## User and authentication endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/users` | Public, rate-limited | Start student registration and send registration OTP. |
| `PUT` | `/api/users/:id` | Bearer access token | Update own profile, or update another profile as an admin. |
| `POST` | `/api/users/login` | Public, rate-limited | Validate credentials and send login OTP. |
| `POST` | `/api/users/verify-otp` | Public, rate-limited | Verify login OTP and issue an access token plus refresh cookie. |
| `POST` | `/api/users/verify-registration-otp` | Public, rate-limited | Verify registration OTP, create the student account, and issue tokens. |
| `POST` | `/api/users/resend-registration-otp` | Public, rate-limited | Resend a registration OTP within cooldown and count limits. |
| `POST` | `/api/users/resend-login-otp` | Public, rate-limited | Resend a login OTP within cooldown and count limits. |
| `POST` | `/api/users/refresh` | Refresh cookie | Refresh the access token. |
| `POST` | `/api/users/logout` | Refresh cookie when present | Clear the refresh-token cookie. |
| `GET` | `/api/admin/dashboard` | Bearer access token + `admin` role | Return event metrics and recently updated non-archived events for the admin dashboard. |

Registration defaults new users to the `student` role. The current user route does not expose the `getUsers` controller as an endpoint.

### Authentication payloads and validation

- Registration accepts string fields `studentId`, `firstName`, optional `middleName`, `lastName`, `email`, and `password`. IDs use `YYYY-######`; names allow Unicode letters, spaces, apostrophes, and hyphens. Email has no campus domain restriction and is trimmed/lowercased.
- Registration passwords require at least 8 characters, uppercase/lowercase letters, a number, and a symbol. The bcrypt input limit is 72 UTF-8 bytes. Login accepts existing passwords without applying new registration complexity rules.
- Login accepts `{ email, password }`. Both OTP verification endpoints accept `{ challengeId, otp }`, with a string challenge ID and a six-digit string code. Both resend endpoints accept `{ challengeId }`.
- Starting or resending an OTP returns `message`, `challengeId`, ISO `expiresAt`, and `retryAfterSeconds` (the configured resend cooldown). Registration start returns `202`; login start and resends return `200`.
- Verification returns `accesstoken`, a `user` display object with `firstName`, `lastName`, and `role`, and the refresh cookie; registration verification returns `201`, login verification returns `200`. Refresh also returns the display object so each portal can restore the name and role after reload.

The admin dashboard response is `{ metrics: { total, upcoming, ongoing, archived, registrations, attendees }, recentEvents: [] }`. Event counts exclude archived events except for `archived`; `upcoming` starts after the request time and `ongoing` includes both date boundaries. `registrations` counts active registered records and `attendees` counts attendance records with a time-in. Recent events are non-archived, limited to six, and ordered by `updatedAt` descending. A missing bearer token returns `401`; a non-admin token returns `403`.
- Resend cooldown failures return `429` with `retryAfterSeconds`. Expired challenges require restarting registration/login; consumed challenges and challenges with five incorrect attempts cannot be resent.
- The frontend uses `VITE_API_BASE_URL` for the API root, defaulting to `/api`. Vite proxies local `/api` calls to the backend on port 5000; production must route `/api` to the backend or configure an explicit API root. Cookie-based calls use credentials. Access tokens live in React memory and sessions restore through `/refresh`.

## Event endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/events` | Bearer token + `admin` role | Create an event. |
| `GET` | `/api/events` | Bearer token + `student` or `admin` role | Return non-archived events with computed status. |
| `GET` | `/api/events/archived` | Bearer token + `student` or `admin` role | Return archived events with computed status. |
| `GET` | `/api/events/:id` | Bearer token + `student` or `admin` role | Return one event with its populated organizer and computed status. |
| `GET` | `/api/admin/events` | Bearer token + `admin` role | Return a paginated admin event list including archived events. |
| `PUT` | `/api/events/:id` | Bearer token + `admin` role | Update a non-archived event. |
| `PATCH` | `/api/events/:id/archive` | Bearer token + `admin` role | Archive an event. |
| `PATCH` | `/api/events/:id/unarchive` | Bearer token + `admin` role | Restore an archived event to the non-archived catalog. |
| `GET` | `/api/events/:id/registration` | Bearer token + `student` role | Read the current student's registration state. |
| `POST` | `/api/events/:id/registration` | Bearer token + `student` role | Register or join the waitlist for an event. |
| `DELETE` | `/api/events/:id/registration` | Bearer token + `student` role | Cancel the current student's registration before the event starts. |
| `GET` | `/api/events/my-registrations` | Bearer token + `student` role | List the student's registered, waitlisted, and cancelled events. |
| `POST` | `/api/events/:id/attendance` | Bearer token + `student` role | Verify an event QR token and record time in or time out. |
| `GET` | `/api/admin/events/:id/registrations` | Bearer token + `admin` role | Return registration counts for an event. |
| `POST` | `/api/admin/events/:id/attendance/session` | Bearer token + `admin` role | Create a short-lived, event-specific attendance QR token. |
| `GET` | `/api/admin/events/:id/attendance` | Bearer token + `admin` role | Return attendance totals. |
| `GET` | `/api/admin/events/:id/attendance/records` | Bearer token + `admin` role | Return attendance records for an event. |

### Event discovery queries

`POST /api/events` accepts JSON or multipart form data. New requests send `title` (3–120 characters), `description` (10–1000), `location` (3–500), `organizerName` (3–120), `startDate`, `endDate`, `eventType`, optional `tags`, `agenda`, `speakers`, `requirements`, `reminders`, `registrationMode`, optional `capacity`, and optional `coverImage` or `speakerImages` (JPEG, PNG, or WebP, up to 5 MB each). Multipart local date/time values are interpreted in `Asia/Manila`; ISO values with `Z` or an offset are treated as absolute instants. Both dates must be on or after the current Asia/Manila calendar date, and the end must be after the start. Agenda times must be inside the event range and may overlap. Existing JSON requests using a valid `organizer` user ID remain supported. The response remains `{ message, event }` and includes the expanded event data, `organizerName`, and optional public image URLs. The creator is taken from the verified admin token. `createdBy` and Cloudinary public IDs are never returned.

`PUT /api/events/:id` accepts JSON or multipart form data for non-archived events. It supports the create fields, optional `coverImage` and `speakerImages`, `removeCoverImage=true`, and `removeSpeakerImageKeys`. Replacement and removal cannot be requested together for the cover image. Local date/time strings use `Asia/Manila`; explicit offsets remain absolute. Image uploads use the same type and 5 MB limit as creation. Archived events remain read-only. The response remains `{ message, event }`.

`GET /api/events` accepts optional `page` (1–1000000), `limit` (1–24, default 9), `search` (up to 100 characters, literal case-insensitive title/location search), and `status` (`active`, `upcoming`, `ongoing`, `all`; default `all`). With any discovery parameter, it returns `{ events, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }`. Empty results have `totalPages: 0`; pages beyond the last return an empty array with the requested page. With no discovery parameters, the existing `{ events }` collection response is preserved.

Authenticated student/admin event list results exclude archived events and sort by `startDate`, then `_id`, ascending. `active` includes events whose end is at or after the current instant; `upcoming` starts after now; `ongoing` includes both start/end boundaries. Status is computed at read time. Invalid query values return `400`.

`GET /api/admin/events` accepts `page` (1–1000000, default 1), `limit` (1–24, default 10), `search` (up to 100 characters; title, location, or organizer name), and `status` (`all`, `upcoming`, `ongoing`, `ended`, `archived`; default `all`). It returns `{ events, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }`, sorted by `startDate` then `_id` descending. `all` includes archived events; the date-based filters exclude them. Invalid filters return `400`. The frontend displays `Archived` instead of the computed date status for archived records.

The authenticated student portal uses `/home` with URL search/filter/page state, `/events/:id` for event details, `/my-events` for registration history and attendance state, and `/attendance/:id` for QR attendance. Home requests `status=active` and `limit=9`. Campus dates use `Asia/Manila`. Registration is only available for events with `registrationMode=required`; capacity creates waitlisted records when full, with no automatic promotion. Attendance is only available to registered students during the event window and uses a short-lived signed QR token.

### Event data defaults

Every event response includes safe defaults for fields added after the initial schema: `eventType` (`Other`), `tags`, `agenda`, `speakers`, `requirements`, `reminders` (empty arrays), and `registrationMode` (`none`). A speaker includes `clientKey`, `name`, `role`, and an optional public `photoUrl`. An agenda item includes `title`, optional `description`, `startDate`, `endDate`, and `speakerKeys`.

`GET /api/events/:id/registration` returns the current registration plus `capacity`, `registeredCount`, and `isFull` for the event. `GET /api/events/my-registrations` registrations also include `attendance: null` or `{ timeIn, timeOut }` for the current student's attendance record.

## Response conventions

- Successful responses generally include a human-readable `message`.
- Collections use an `events` or `users` property.
- Event mutation and lookup responses use an `event` property.
- Authentication responses currently return the access token using the key `accesstoken`.
- Validation, authentication, authorization, not-found, conflict, rate-limit, and server failures return a `message` property. Registration conflicts may also return `field` (`studentId` or `email`) so the frontend can place the conflict beside the affected input.
- Student IDs are unique across `User` records. Duplicate student IDs return `409` with a student-ID field error, including when a concurrent registration reaches OTP verification first.
- Do not change response names casually; coordinate frontend and backend changes when a contract must change.

## Protected request convention

Protected routes expect:

```text
Authorization: Bearer <access-token>
```

Refresh and logout use the `refreshToken` HTTP-only cookie rather than the Authorization header.
