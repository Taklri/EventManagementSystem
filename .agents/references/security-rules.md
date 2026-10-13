# Security Reference

## Authentication flow

1. Login validates the normalized email and bcrypt password hash.
2. Login creates a hashed six-digit OTP and sends it through Brevo.
3. Login OTP verification checks existence, consumption, expiration, attempt count, and code validity.
4. Successful verification returns a short-lived access token and sets the refresh-token cookie.
5. Protected routes validate the access token from `Authorization: Bearer <token>`.
6. Refresh verifies the `refreshToken` cookie and issues a new access token plus refresh cookie.
7. Logout clears the `refreshToken` cookie.

Registration follows a similar OTP flow using `PendingRegistration`; the user is created only after registration OTP verification.

## Token and cookie behavior

- Access tokens contain the user ID in `sub` and the role in `role`.
- Access tokens expire after 15 minutes.
- Refresh tokens expire after 7 days.
- The refresh cookie is named `refreshToken`.
- The refresh cookie is `httpOnly`.
- The refresh cookie uses `sameSite: strict`.
- The refresh cookie is `secure` when `NODE_ENV=production`.

## Authorization behavior

- Missing or invalid bearer authentication returns `401`.
- Authenticated users without an allowed role return `403`.
- Event creation, update, archive, and unarchive operations require the `admin` role.
- Event catalog and detail reads require an authenticated `student` or `admin` role. Student registration, cancellation, and attendance endpoints require the `student` role. Registration and attendance summaries, QR session creation, and attendance record lookup require the `admin` role.
- The admin dashboard and admin event-list endpoints require a bearer token and the `admin` role. Portal route guards send students and admins to their own landing pages; backend middleware remains the authority for protected API access.
- Notification list and read routes allow the signed-in student or admin. Each user only receives and updates their own notices.
- Registration form list, create, read, update, archive, and unarchive endpoints require the `admin` role. Students cannot manage forms, and archived forms are not selectable for new event creation.
- Profile name updates allow an admin to update any profile or a user to update their own profile. Email changes are not accepted on `PUT /api/users/:id`.
- A signed-in user changes their own email or password only after a code sent to the current email address. Those codes are stored separately from login and password-reset codes. A successful password change sets `passwordChangedAt` and replaces the current session token; older access and refresh tokens are rejected.

## Rate limits

- All `/api` routes use the global rate limiter: 100 requests per 10 minutes.
- Login: 5 requests per 15 minutes.
- Login OTP verification: 5 requests per 10 minutes.
- Registration: 5 requests per hour.
- Registration OTP verification: 5 requests per 10 minutes.
- Registration OTP resend: 3 requests per hour, with an application-level cooldown and resend count.
- Login OTP resend: 3 requests per hour, with the configured `OTP_RESEND_SECONDS` cooldown and at most 3 resends per challenge.
- Profile email-change request: 5 requests per 15 minutes.
- Profile email-change verification: 5 requests per 10 minutes.
- Profile email-change resend: 3 requests per hour, with the configured `OTP_RESEND_SECONDS` cooldown and at most 3 resends per challenge.
- Profile password-change request: 5 requests per 15 minutes.
- Profile password-change verification: 5 requests per 10 minutes.
- Profile password-change resend: 3 requests per hour, with the configured `OTP_RESEND_SECONDS` cooldown and at most 3 resends per challenge.
- Password reset request: 5 requests per 15 minutes.
- Password reset OTP verification: 5 requests per 10 minutes.
- Password reset OTP resend: 3 requests per hour, with the configured `OTP_RESEND_SECONDS` cooldown and at most 3 resends per challenge.
- Password reset completion: 5 requests per 15 minutes.
- OTP records also enforce a maximum of 5 incorrect attempts.

Password reset uses its own OTP collection so a login code cannot change a password. A successful reset stores `passwordChangedAt` and does not issue an access token or refresh cookie. Access and refresh tokens issued before that time are rejected. A reset token includes `purpose: "password-reset"` and cannot be used as a bearer session token. Forgotten-password responses use the same message whether or not the email belongs to an account.

OTP rotation and verification use conditional database updates to reject stale or simultaneous attempts. Failed resend delivery restores the previous code when the challenge has not since been consumed. Registration temporarily marks a challenge consumed before account creation and releases the claim if creation fails. Pending records without the new consumed field are treated as unconsumed.

The frontend keeps access tokens in memory, refreshes active sessions before the 15-minute token expiry, and restores sessions with the HTTP-only cookie after reload. Passwords and OTP values are never persisted in browser storage.

## Environment variables

The backend reads private configuration from environment variables, including:

- `PORT`
- `MONGODB_URI`
- `FRONTEND_URL`
- `NODE_ENV`
- `JWT_SECRET_KEY`
- `JWT_REFRESH_SECRET_KEY`
- `OTP_EXPIRES_MINUTES`
- `OTP_RESEND_SECONDS`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, optional `CLOUDINARY_FOLDER` for event images, and optional `CLOUDINARY_PROFILE_FOLDER` for profile photos.

Never copy values from `.env` into documentation, AI skills, logs, responses, commits, or screenshots.

## Security change requirements

- Keep password and OTP values hashed at rest.
- Do not log passwords, OTPs, tokens, API keys, or database credentials.
- Attendance QR tokens are short-lived signed JWTs scoped to one event. Do not log or persist them outside the QR-session response intended for the admin display.
- Preserve credentialed CORS behavior for the configured frontend origin.
- Keep authorization checks on the server even when the frontend hides controls.
- Verify both successful and denied authentication/authorization paths after security-sensitive changes.

## Registration and QR access

- Student identity and school ID come from the verified account, never the registration form or attendance request body. Registration answers are validated against the event form before any record is created.
- Student form retrieval, submission, cancellation, QR preview, and QR confirmation require the student role. Admin response lists, CSV export, QR generation, and attendance history require the admin role.
- QR preview validates the event-specific signed token, expiry, registration status, and time window without saving. Confirmation repeats validation server-side. Time in is inserted once under the unique event/student index; time out uses a conditional update; completed attendance cannot be changed by another scan.
- Do not log or persist QR tokens beyond the admin display response. Archived and no-registration events reject attendance mutation. Historical admin attendance reads are permitted after archive.
