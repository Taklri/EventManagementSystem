# Student management frontend handoff

The `/admin/students` page is implemented in `src/pages/Adminstudentpage.jsx`.
It starts with an empty student list and uses React state only: no student API, database connection,
browser storage, or persistent save is implemented. Refresh clears local changes. No mock students are included.
The surrounding application still requires an administrator login.

## Current preview

- Search by name, student ID, or email; pagination displays ten records per page.
- View student details and edit student ID and name fields locally.
- Email and the events-joined count are read-only.
- Program, year level, and status are not part of this page.
- Summary counts start at zero. Event participation data must come from a future backend contract.

## Future backend integration

1. Replace the empty-list initialization in `AdminStudentsPage` with a student-list request, including loading, error, and empty states.
2. Replace the local-only behavior in `handleSave` with an update request. Update the displayed record and close the dialog only after a successful response; keep input and show an error on failure.
3. Map server records to the UI fields: `id` (stable unique identifier), `studentId`, `firstName`, `middleName` (empty string when absent), `lastName`, and `email`. Decide how to handle the `eventsJoined` count when actual participation data is available.
4. Define request and response contracts with the backend team; this frontend does not assume endpoint URLs or a database schema.
5. Enforce admin authorization, input validation, and student-ID uniqueness on the server. The current client validation only helps the user fill out the form.
6. Follow the application's existing authenticated request conventions and handle unauthenticated and forbidden responses. Keep database credentials and secrets on the backend.

Until those steps are implemented, the page is a frontend preview and does not modify real student records.
