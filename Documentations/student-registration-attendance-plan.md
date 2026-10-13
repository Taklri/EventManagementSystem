# Student Registration and Attendance Plan

**Status:** Implemented on `codex/registration-attendance-forms`; automated checks passed  
**Scope:** Student event registration forms and simplified QR attendance  
**Timezone:** Asia/Manila

## Goal

Replace the current one-click registration flow with a short event-specific form. A student becomes registered or waitlisted only after submitting valid answers.

Attendance will remain intentionally simple: an admin displays a signed event QR code, a signed-in student scans it, and the system records an immutable time-in followed by an immutable time-out on the next valid scan.

## Confirmed product rules

- Events with **No registration** are open events. They do not show a registration form and do not collect attendance scans.
- Events with **Registration required** show a form before registration is created.
- A valid form submission immediately creates either a `registered` or `waitlisted` registration. There is no admin approval queue in this phase.
- Student identity is taken from the authenticated account. Students do not type or edit their name, student ID, or email in the form.
- Admins can view submitted answers and export a print-friendly attendee list.
- Registration cancellation remains available before the event starts. A cancelled student must submit the form again to register again.
- Only students with `registered` status can record attendance. Waitlisted and cancelled students cannot.
- Attendance is recorded only once for time-in and once for time-out. Neither timestamp can be edited by the student.
- The server is authoritative for event windows, identity, registration status, QR validity, and duplicate scans.

## Registration form design

### Supported form items

Admins can add up to 12 items per event:

- Short text
- Long text
- Multiple choice
- Dropdown
- Radio/select
- Instruction-only text block

Answerable items can be marked required or optional. Instruction-only blocks never require an answer. Choice fields contain a bounded list of options and reject values that are not in the configured list.

### Student flow

1. The student opens an event with registration required.
2. The event action is **Complete registration**, which opens a dedicated page at `/events/:id/register`.
3. The page displays the event summary, locked student identity, instructions, and questions.
4. The frontend validates fields as the student works and shows field-level errors.
5. The student submits the form once.
6. The backend validates the current form, event state, registration window, and capacity.
7. The backend creates the registration only after validation succeeds.
8. The student is shown either a registered or waitlisted confirmation and can view the saved response from My Events.

If a submission fails validation, no registration record is created. A duplicate active submission returns the existing registration state instead of creating another record.

### Form stability

The form is versioned. Submitted registrations keep a snapshot of the question key, label, and answer so historical records remain readable.

For v1, the form is locked after the first submission for the event. This keeps printed and exported attendee lists consistent. Existing events without a form use an empty-form default and still require an explicit submission step before registration.

## Data and API changes

### Event form configuration

Add a registration form to the event document:

```json
{
  "registrationForm": {
    "version": 1,
    "items": [
      {
        "key": "attendance-preference",
        "type": "dropdown",
        "label": "Which session will you attend?",
        "helpText": "Choose one session.",
        "required": true,
        "options": ["Morning", "Afternoon"]
      }
    ]
  }
}
```

The backend validates the item count, supported types, labels, options, required flags, text lengths, and instruction-only items. Existing events receive safe empty-form defaults without a destructive migration.

### Registration record

Extend the registration record with:

- `formVersion`
- `answers`
- `submittedAt`

Each answer stores its form key, question label snapshot, and submitted value. Student identity remains the referenced user and is never accepted from the request body.

### Student endpoints

Add or extend the protected student endpoints:

```text
GET    /api/events/:id/registration/form
GET    /api/events/:id/registration
POST   /api/events/:id/registration
DELETE /api/events/:id/registration
GET    /api/events/my-registrations
```

The registration `POST` accepts:

```json
{
  "answers": [
    {
      "key": "attendance-preference",
      "value": "Morning"
    }
  ]
}
```

The existing `message` and `registration` response keys remain compatible. Validation errors return the existing top-level message structure plus field or issue details where useful.

### Admin endpoints

Add protected admin endpoints for submitted responses:

```text
GET /api/admin/events/:id/registrations
GET /api/admin/events/:id/registrations/export
```

The list endpoint supports pagination and status filtering. The export endpoint returns a print-friendly CSV containing student name, student ID, registration status, submission time, and submitted answers.

Only admins can access submitted answers and exports.

## Simplified attendance design

### Admin flow

1. Admin opens a registration-required event.
2. Admin generates an event-specific signed QR code.
3. The admin displays the QR code at the venue.
4. The admin can refresh the QR session if necessary.
5. Open events do not display QR attendance controls.

### Student flow

1. A signed-in, registered student scans the QR code with the phone camera.
2. The QR opens the protected attendance route.
3. The server verifies the signed token, event, student, registration status, and time window.
4. The first valid scan creates an attendance record with the student reference, student name snapshot, student ID snapshot, and `timeIn`.
5. The next valid scan updates only `timeOut`.
6. Further scans are rejected as already completed.

The browser never submits the student name or ID as trusted data. The server derives those values from the authenticated user and stores snapshots for reliable historical exports.

### Attendance timing defaults

- QR sessions may be generated before the event.
- Time-in is accepted from 30 minutes before the event start through the event end.
- Time-out is accepted after time-in until 30 minutes after the event end.
- Time-in after the event has ended is rejected.
- Time-out before time-in is impossible because no attendance record exists yet.
- Archived events and events without registration cannot collect attendance.

Student feedback states:

- Attendance is not open yet
- Time in recorded
- Already timed in; scan again when leaving
- Time out recorded
- Attendance already completed
- Attendance window closed
- QR code invalid or expired

### Attendance model and server rules

The attendance record contains:

- Event reference
- Student reference
- Student name snapshot
- Student ID snapshot
- Immutable `timeIn`
- Optional `timeOut`

The existing unique event/student index remains. The server rejects wrong-event QR codes, expired tokens, invalid signatures, duplicate completed scans, unregistered students, waitlisted students, cancelled students, archived events, and open events.

## Frontend work

### Admin create/edit page

Add a Registration form section with:

- Add item
- Remove item
- Reorder item
- Item type selector
- Required toggle
- Choice option editor
- Instruction-block editor
- Student-facing preview
- Clear validation and save feedback

The section is disabled or hidden when registration is set to No registration.

### Student event details

Update the registration panel to show:

- Open event when no registration is required
- Complete registration before submission
- Registered or waitlisted state after submission
- Capacity information
- View or update submitted answers where allowed
- Cancellation before the event starts

Do not show attendance controls on open events.

### My Events

Show registered, waitlisted, and cancelled events with:

- Registration status
- Form submission time
- Capacity or waitlist messaging
- Time-in status
- Time-out status
- Attendance completion state

### Admin event details

Show registration totals, answer submissions, export/print actions, QR controls, and attendance totals only for registration-required events.

## Implementation sequence

1. Extend the event and registration models with form configuration, versioning, answer snapshots, and identity snapshots.
2. Add backend form parsing and authoritative answer validation.
3. Update student registration endpoints to require and persist valid answers.
4. Add admin registration list and CSV export endpoints.
5. Add the admin form builder to create and edit pages.
6. Add the dedicated student registration page and success/error states.
7. Update event details and My Events registration states.
8. Simplify the QR attendance session and immutable time-in/time-out state machine.
9. Update admin event details with QR, roster, export, and attendance states.
10. Update API references and event-domain/security documentation.

## Verification plan

### Backend checks

- Form item type validation
- Required and optional answers
- Invalid options and unknown answer keys
- Instruction blocks receiving answers
- Maximum item count
- No registration record on invalid submission
- Duplicate submission behavior
- Capacity and waitlist behavior
- Cancel and re-register behavior
- Legacy events with empty forms
- Student/admin authorization
- Registration response export
- Open-event attendance rejection
- Registered, waitlisted, and cancelled attendance rejection
- QR signature, expiry, and event matching
- Time-in and time-out window boundaries
- Immutable time-in and time-out behavior
- Duplicate completed scans
- Archived event restrictions

### Frontend checks

- Form loading, empty, validation, and server-error states
- All supported question controls
- Locked student identity display
- Registration and waitlist confirmations
- Cancellation state
- My Events attendance state
- Admin form builder and preview
- Admin response table and export action
- QR status feedback
- Responsive mobile and desktop layouts
- Keyboard navigation and visible focus states
- `npm run lint`
- `npm run build`

## Security and compatibility

- Student registration, form retrieval, My Events, and attendance remain student-only.
- Form editing, submitted answers, exports, QR generation, and attendance summaries remain admin-only.
- Event reads stay protected according to the current role-separated portal rules.
- Identity, registration status, capacity, event dates, and QR validity are always checked server-side.
- No passwords, tokens, Cloudinary credentials, database URLs, or other secrets are added to source or documentation.
- Existing registration statuses and response keys remain compatible where practical.

## Guidance consulted

- `AGENTS.md`
- `EMS/AGENTS.md`
- `ems-backend/AGENTS.md`
- `.agents/README.md`
- `.agents/references/api-contract.md`
- `.agents/references/event-rules.md`
- `.agents/references/security-rules.md`
- `.agents/skills/frontend-ui/SKILL.md`
- `.agents/skills/backend-api/SKILL.md`
- `.agents/skills/auth-security/SKILL.md`
- `.agents/skills/event-domain/SKILL.md`
- `.agents/skills/verification/SKILL.md`

The implementation follows the approved checkpoints: backend contract and validation, admin form builder, student registration, then QR attendance. See `registration-attendance-implementation.md` for the delivered API and operating rules.
