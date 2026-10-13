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
| `GET` | `/api/users/me` | Bearer access token | Return the signed-in profile without the password or image public id. |
| `PATCH` | `/api/users/me` | Bearer access token | Update the signed-in user's name, and student ID when the caller is a student. |
| `PUT` | `/api/users/me/photo` | Bearer access token | Replace the signed-in user's profile photo. |
| `DELETE` | `/api/users/me/photo` | Bearer access token | Remove the signed-in user's profile photo. |
| `POST` | `/api/users/me/email/otp` | Bearer access token, rate-limited | Check the current password, then email a code to the current address and remember the requested address. |
| `POST` | `/api/users/me/email/verify` | Bearer access token, rate-limited | Apply the requested email after a valid code. |
| `POST` | `/api/users/me/email/resend` | Bearer access token, rate-limited | Resend the email-change code to the current address. |
| `POST` | `/api/users/me/password/otp` | Bearer access token, rate-limited | Check the current password, then email a code to the current address and store a hash of the requested password. |
| `POST` | `/api/users/me/password/verify` | Bearer access token, rate-limited | Apply the new password after a valid code and issue a new session. |
| `POST` | `/api/users/me/password/resend` | Bearer access token, rate-limited | Resend the password-change code to the current address. |
| `PUT` | `/api/users/:id` | Bearer access token | Update own name, or another user's name as an admin. Email changes are ignored. |
| `POST` | `/api/users/login` | Public, rate-limited | Validate credentials and send login OTP. |
| `POST` | `/api/users/verify-otp` | Public, rate-limited | Verify login OTP and issue an access token plus refresh cookie. |
| `POST` | `/api/users/verify-registration-otp` | Public, rate-limited | Verify registration OTP, create the student account, and issue tokens. |
| `POST` | `/api/users/resend-registration-otp` | Public, rate-limited | Resend a registration OTP within cooldown and count limits. |
| `POST` | `/api/users/resend-login-otp` | Public, rate-limited | Resend a login OTP within cooldown and count limits. |
| `POST` | `/api/users/forgot-password` | Public, rate-limited | Send a password-reset OTP when the email belongs to an account. The response message is the same when it does not. |
| `POST` | `/api/users/verify-reset-otp` | Public, rate-limited | Verify a password-reset OTP and return a short-lived reset token. |
| `POST` | `/api/users/resend-reset-otp` | Public, rate-limited | Resend a password-reset OTP within cooldown and count limits. |
| `POST` | `/api/users/reset-password` | Public, rate-limited | Set a new password with a valid reset token. |
| `POST` | `/api/users/refresh` | Refresh cookie | Refresh the access token. |
| `POST` | `/api/users/logout` | Refresh cookie when present | Clear the refresh-token cookie. |
| `GET` | `/api/notifications` | Bearer access token + `student` role | List the signed-in student's notifications, newest first, with `unreadCount`. |
| `PATCH` | `/api/notifications/read-all` | Bearer access token + `student` role | Mark all of that student's unread notifications as read. |
| `PATCH` | `/api/notifications/:id/read` | Bearer access token + `student` role | Mark one of that student's notifications as read. |
| `GET` | `/api/admin/dashboard` | Bearer access token + `admin` role | Return event metrics and recently updated non-archived events for the admin dashboard. |

Student registration and attendance notifications are created only after those actions succeed. Creating an event notifies every current student that the event is available. `GET /api/notifications` returns `{ notifications, unreadCount }`. Each notification includes `_id`, `type`, `title`, `message`, `event`, `readAt`, and `createdAt`. An admin token returns `403`. A notification id that does not belong to the student returns `404`.

Registration defaults new users to the `student` role. The current user route does not expose the `getUsers` controller as an endpoint.

### Authentication payloads and validation

- Registration accepts string fields `studentId`, `firstName`, optional `middleName`, `lastName`, `email`, and `password`. IDs use `YYYY-######`; names allow Unicode letters, spaces, apostrophes, and hyphens. Email has no campus domain restriction and is trimmed/lowercased.
- Registration passwords require at least 8 characters, uppercase/lowercase letters, a number, and a symbol. The bcrypt input limit is 72 UTF-8 bytes. Login accepts existing passwords without applying new registration complexity rules.
- Login accepts `{ email, password }`. Both OTP verification endpoints accept `{ challengeId, otp }`, with a string challenge ID and a six-digit string code. Both resend endpoints accept `{ challengeId }`.
- `POST /api/users/forgot-password` accepts `{ email }` and always returns **200** with the same `message` for a known or unknown account. A known account also returns `challengeId`, ISO `expiresAt`, and `retryAfterSeconds`. Invalid email input returns **400**.
- `POST /api/users/verify-reset-otp` accepts `{ challengeId, otp }` and returns `resetToken` plus ISO `expiresAt`. It does not return `accesstoken` or set the refresh cookie. The reset token has `purpose: "password-reset"` and expires in 10 minutes.
- `POST /api/users/resend-reset-otp` accepts `{ challengeId }` and uses the login resend cooldown and limit.
- `POST /api/users/reset-password` accepts `{ resetToken, password }`. The password uses the registration complexity rules. Success returns **200** and does not issue a session. Reused, expired, or wrong-purpose tokens return **401**.
- Starting or resending an OTP returns `message`, `challengeId`, ISO `expiresAt`, and `retryAfterSeconds` (the configured resend cooldown). Registration start returns `202`; login start and resends return `200`.
- Verification returns `accesstoken`, a `user` display object with `firstName`, `lastName`, `role`, and `imageUrl`, and the refresh cookie; registration verification returns `201`, login verification returns `200`. Refresh also returns the display object so each portal can restore the name, role, and photo after reload.
- `GET /api/users/me` returns `{ user }` with `id`, `firstName`, `middleName`, `lastName`, `email`, `role`, and `imageUrl`. Student responses also include `studentId`. A missing token returns **401**.
- `PATCH /api/users/me` accepts `firstName`, optional `middleName`, `lastName`, and `studentId` for students. Student IDs use `YYYY-######` and are rejected with **409** when another user or pending registration already has that ID. An admin request does not change a student ID. Names follow the registration character rules.
- Profile photos are JPEG, PNG, or WebP files up to 5 MB, sent as multipart field `photo`. The image is stored in Cloudinary. Responses include `imageUrl` and never include the Cloudinary public id. Replacing or removing a photo deletes the previous stored file.
- Email and password changes require `currentPassword`. A missing password returns **400**. A wrong password returns **401** and does not create or email a code. A matching password sends a code to the current email address. The new email is stored only after `POST /api/users/me/email/verify` succeeds and the address is still unused. The new password hash is stored on its own challenge and applied only after `POST /api/users/me/password/verify`. That verification sets `passwordChangedAt`, returns a new `accesstoken`, and sets a new refresh cookie. Older access and refresh tokens are rejected. These codes use separate collections from login and password-reset codes, with the same expiry, five-attempt limit, resend cooldown, and rate limits as password reset. A failed write releases the code so it can be tried again.

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
| `GET` | `/api/events/:id/attendance` | Bearer token + `student` role | Return the student's attendance state and whether camera submission is currently open. |
| `POST` | `/api/events/:id/attendance` | Bearer token + `student` role | Accept one JPEG, PNG, or WebP `photo` (multipart, up to 5 MB) and record the next server timestamp as time in or time out. |
| `GET` | `/api/admin/events/:id/registrations` | Bearer token + `admin` role | Return registration counts for an event. |
| `POST` | `/api/admin/events/:id/attendance/session` | Bearer token + `admin` role | Legacy QR-session endpoint retained for already-issued links; the portal uses camera photos instead. |
| `GET` | `/api/admin/events/:id/attendance` | Bearer token + `admin` role | Return attendance totals. |
| `GET` | `/api/admin/events/:id/attendance/records` | Bearer token + `admin` role | Return attendance records for an event. |
| `GET` | `/api/admin/registration-forms/:id/responses` | Bearer token + `admin` role | Return paginated responses submitted through a reusable registration form. |
| `GET` | `/api/admin/registration-forms/:id/responses/:responseId` | Bearer token + `admin` role | Return one submitted response and its answer snapshot. |
| `GET` | `/api/admin/registration-forms/:id/responses/export` | Bearer token + `admin` role | Download a formatted Excel workbook for a reusable form's responses. |

### Event discovery queries

`POST /api/events` accepts JSON or multipart form data. New requests send `title` (3–120 characters), `description` (10–1000), `location` (3–500), `organizerName` (3–120), `startDate`, `endDate`, `eventType`, optional `tags`, `agenda`, `speakers`, `requirements`, `reminders`, `registrationMode`, optional `capacity`, and optional `coverImage` or `speakerImages` (JPEG, PNG, or WebP, up to 5 MB each). Multipart local date/time values are interpreted in `Asia/Manila`; ISO values with `Z` or an offset are treated as absolute instants. Both dates must be on or after the current Asia/Manila calendar date, and the end must be after the start. Agenda times must be inside the event range and may overlap. Existing JSON requests using a valid `organizer` user ID remain supported. The response remains `{ message, event }` and includes the expanded event data, `organizerName`, and optional public image URLs. The creator is taken from the verified admin token. `createdBy` and Cloudinary public IDs are never returned.

`PUT /api/events/:id` accepts JSON or multipart form data for non-archived events. It supports the create fields, optional `coverImage` and `speakerImages`, `removeCoverImage=true`, and `removeSpeakerImageKeys`. Replacement and removal cannot be requested together for the cover image. Local date/time strings use `Asia/Manila`; explicit offsets remain absolute. Image uploads use the same type and 5 MB limit as creation. Archived events remain read-only. The response remains `{ message, event }`.

`GET /api/events` accepts optional `page` (1–1000000), `limit` (1–24, default 9), `search` (up to 100 characters, literal case-insensitive title/location search), and `status` (`active`, `upcoming`, `ongoing`, `all`; default `all`). With any discovery parameter, it returns `{ events, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }`. Empty results have `totalPages: 0`; pages beyond the last return an empty array with the requested page. With no discovery parameters, the existing `{ events }` collection response is preserved.

Authenticated student/admin event list results exclude archived events and sort by `startDate`, then `_id`, ascending. `active` includes events whose end is at or after the current instant; `upcoming` starts after now; `ongoing` includes both start/end boundaries. Status is computed at read time. Invalid query values return `400`.

`GET /api/admin/events` accepts `page` (1–1000000, default 1), `limit` (1–24, default 10), `search` (up to 100 characters; title, location, or organizer name), and `status` (`all`, `upcoming`, `ongoing`, `ended`, `archived`; default `all`). It returns `{ events, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }`, sorted by `createdAt` then `_id` descending so the newest created event appears first. `all` includes archived events; the date-based filters exclude them. Invalid filters return `400`. The frontend displays `Archived` instead of the computed date status for archived records.

The authenticated student portal uses `/home` with URL search/filter/page state, `/events/:id` for event details, `/my-events` for registration history and attendance state, and `/attendance/:id` for camera attendance. Home requests `status=active` and `limit=9`. Campus dates use `Asia/Manila`. Registration is only available for events with `registrationMode=required`; capacity creates waitlisted records when full, with no automatic promotion. Attendance is only available to registered students during the event window and requires a camera photo submission. The browser never supplies the student identity or attendance timestamp.

### Event data defaults

Every event response includes safe defaults for fields added after the initial schema: `eventType` (`Other`), `tags`, `agenda`, `speakers`, `requirements`, `reminders` (empty arrays), and `registrationMode` (`none`). A speaker includes `clientKey`, `name`, `role`, and an optional public `photoUrl`. An agenda item includes `title`, optional `description`, `startDate`, `endDate`, and `speakerKeys`.

`GET /api/events/:id/registration` returns the current registration plus `capacity`, `registeredCount`, `isFull`, and the current student's attendance state. When present, attendance includes `timeIn`, `timeOut`, `timeInPhotoUrl`, and `timeOutPhotoUrl`; the URLs are read-only Cloudinary proof previews. `GET /api/events/my-registrations` registrations also include `attendance: null` or `{ timeIn, timeOut }` for the current student's attendance record.

## Reusable registration forms

Admin form endpoints are protected by the admin role. They support list, create, read, update, archive, and unarchive operations under `/api/admin/registration-forms`. Form updates modify the current questions in place; submitted registrations retain answer and question-label snapshots. New required-registration events use `registrationFormId`; open events clear form and capacity. Archived forms stay available to attached events and are cleaned up after 30 days only when unreferenced.

`GET /api/admin/registration-forms/:id/responses` returns `{ form, responses, pagination }` for all submitted registrations belonging to events that use the reusable form. It accepts `page`, `limit`, and `search`; response students include `studentId`, `name`, `program`, and `yearLevel`. `GET /api/admin/registration-forms/:id/responses/:responseId` returns one response for the dedicated admin answer view. `GET /api/admin/registration-forms/:id/responses/export` returns a formatted `.xlsx` workbook with response and question sheets.

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

## Registration forms and confirmed attendance

Registration-required events resolve a reusable form from `registrationFormId`, then fall back to the legacy embedded `registrationForm`, then an empty form. New form items use `text` (question labels 5–100 characters), `multipleChoice` (single answer, up to 10 options), `multipleAnswer`, `dropdown`, and `instructions`; there may be up to 12 items. Legacy `shortText`, `longText`, `radio`, and array-valued `multipleChoice` items remain readable for existing forms. Forms update in place and event form selection locks after the first submitted registration.

`GET /api/events/:id/registration/form` is student-only and returns `{ event, form, identity, registration }`. Identity is read-only metadata derived server-side and is not a configurable form field. `POST /api/events/:id/registration` accepts `{ answers: [{ key, value }] }`; `multipleChoice` values are strings and `multipleAnswer` values are arrays. Legacy array-valued `multipleChoice` answers remain accepted. Invalid answers return `400` with `field: "answers"` and `issues`. No registration is saved until answers pass validation. Existing no-form events use an empty form but still require submission.

`GET /api/admin/events/:id/registrations` is admin-only and now returns `{ registration, registrations, pagination }`; it accepts `page`, `limit`, `search`, and `status` (`all`, `registered`, `waitlisted`, `cancelled`). Search matches the registered student's name, student ID, program, or year level. Each populated student includes `name`, `studentId`, `email`, `program`, and `yearLevel`. `GET /api/admin/events/:id/registrations/export` returns the complete CSV roster with submitted answers and a blank signature column.

`GET /api/events/:id/attendance` is student-only and returns the next action, attendance state, event timing, and whether submission is currently open. `POST /api/events/:id/attendance` accepts a multipart `photo` field. The server validates the image bytes as JPEG, PNG, or WebP, uploads the proof to Cloudinary, and records the server timestamp. The first accepted photo records time in; only the next accepted photo can record time out; subsequent submissions receive `409`. Time in runs from 30 minutes before event start to event end; time out runs until 30 minutes after event end. Open and archived events cannot collect attendance. Stored proof URLs are exposed to the admin roster for review; Cloudinary public IDs remain private. The legacy signed-QR preview and confirmation routes remain readable only for already-issued links and are no longer used by the portal. Admin attendance summaries and records remain readable after archive.
