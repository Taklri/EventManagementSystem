# Registration and Attendance Implementation

## Registration

Admins create reusable registration forms from `/admin/registration-forms`, then select one on registration-required events. Supported item types are short text, long text, multiple choice, dropdown, radio, and instructions. Forms update in place without creating versions; submitted registrations keep answer and question-label snapshots. Existing embedded event forms remain readable as a legacy fallback.

Student registration lives at `/events/:id/register`. The page displays only configured questions and instructions; the server derives account identity and stores it with the submitted answers. The server validates answers and the event window before creating a registration. A full event is closed to new registrations. Cancelling before event start is supported; the available slot reopens automatically and registering again requires another form submission.

### API

All routes below require the indicated bearer-token role.

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/events/:id/registration/form` | Student | Current form, read-only identity metadata, and own submission |
| GET | `/api/admin/registration-forms` | Admin | Searchable active/archived reusable form list |
| POST | `/api/admin/registration-forms` | Admin | Create a reusable form |
| GET | `/api/admin/registration-forms/:id` | Admin | Read one form |
| PUT | `/api/admin/registration-forms/:id` | Admin | Update the current form in place |
| PATCH | `/api/admin/registration-forms/:id/archive` | Admin | Archive a form |
| PATCH | `/api/admin/registration-forms/:id/unarchive` | Admin | Unarchive a form |
| GET | `/api/events/:id/registration` | Student | Own registration and capacity state |
| POST | `/api/events/:id/registration` | Student | Validate `answers` and submit registration |
| DELETE | `/api/events/:id/registration` | Student | Cancel before event start |
| GET | `/api/events/my-registrations` | Student | Own events and attendance state |
| GET | `/api/admin/events/:id/registrations` | Admin | Counts and paginated response roster; `page`, `limit`, `status` filters |
| GET | `/api/admin/events/:id/registrations/export` | Admin | Full CSV with answers, timestamps, and signature column |

`POST /api/events/:id/registration` accepts `{ "answers": [{ "key": "course", "value": "Engineering" }] }`. Choice answers use configured option text; multiple-choice answers use an array. Invalid answers return `400` with `field: "answers"` and an `issues` array. The response retains `message` and `registration` on success. The event create and update endpoints accept `registrationForm` as JSON or a JSON string in multipart data.

The admin roster can print its current page. CSV export includes the complete list and is suited to printing a full venue roster. Archived forms are hidden from new event selection and are permanently cleaned up after 30 days only when no event references them.

## Attendance

Attendance is available only when registration is required. The admin displays a short-lived event QR code. A signed-in student scans it, reviews the event and account identity, and explicitly confirms the next action. First confirmation records `timeIn`; a later scan and confirmation records `timeOut`. Additional scans are rejected. The student cannot supply or edit attendance identity or timestamps.

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/admin/events/:id/attendance/session` | Admin | Create signed QR session |
| POST | `/api/events/:id/attendance/preview` | Student | Validate QR and show next action without saving |
| POST | `/api/events/:id/attendance` | Student | Confirm time in or time out |
| GET | `/api/admin/events/:id/attendance` | Admin | Attendance totals, including archived event history |
| GET | `/api/admin/events/:id/attendance/records` | Admin | Attendance records, including archived event history |

The student preview and confirmation endpoints accept `{ "token": "..." }`. QR sessions expire after at most 15 minutes and cannot outlive the event's attendance window. Time in opens when the event starts and closes at event end. Time out closes 30 minutes after event end. Archived and open events cannot generate or use attendance QR codes. Admins can still read historical totals after archive.

## Verification scope

Automated checks cover form definitions and answers, invalid submissions before persistence, capacity rejection and reopening after cancellation, QR preview without saving, time-in/time-out transitions, duplicate completed scans, and open or ineligible attendance rejection. Existing backend route and auth tests plus frontend lint/build are part of the final check. A live database and phone-camera scan are separate manual checks.
