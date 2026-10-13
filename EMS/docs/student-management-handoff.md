# Student management integration

`/admin/students` loads live student accounts from MongoDB through `GET /api/admin/students`.
Both list and update routes require a bearer token and the admin role.

- List response: `{ users: [{ id, studentId, firstName, middleName, lastName, yearLevel, program, email, eventsJoined }] }`.
- Only `User` records with role `student` appear, ordered by last name, first name, and ID.
- `eventsJoined` counts `EventRegistration` records with status `registered`; cancelled and waitlisted records are excluded.
- Search and pagination currently run in the frontend on the fetched list. Refresh reloads the list and counts.
- `PUT /api/admin/students/:id` accepts `studentId`, `firstName`, `middleName`, `lastName`, `yearLevel`, and `program` (all string fields; middle name may be empty).
- `program` must be one of the programs offered in the registration form, and `yearLevel` must be non-empty and at most 40 characters.
- Updates enforce student ID format, valid names, uniqueness across users, and student-only targets. Email, passwords, and roles cannot be changed through this endpoint.
- Validation returns 400, unauthenticated requests 401, forbidden requests 403, missing students 404, duplicate student IDs 409, and database failures 500.
- The UI retains edit input on failure and closes the dialog only after a successful save.

Run the backend with its existing private environment configuration and the frontend with its existing API configuration. No mock accounts or database seed records are created by this feature.
