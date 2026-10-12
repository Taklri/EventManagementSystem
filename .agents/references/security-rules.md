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
- Profile updates allow an admin to update any profile or a user to update their own profile.

## Rate limits

- All `/api` routes use the global rate limiter: 100 requests per 10 minutes.
- Login: 5 requests per 15 minutes.
- Login OTP verification: 5 requests per 10 minutes.
- Registration: 5 requests per hour.
- Registration OTP verification: 5 requests per 10 minutes.
- Registration OTP resend: 3 requests per hour, with an application-level cooldown and resend count.
- Login OTP resend: 3 requests per hour, with the configured `OTP_RESEND_SECONDS` cooldown and at most 3 resends per challenge.
- OTP records also enforce a maximum of 5 incorrect attempts.

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
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and optional `CLOUDINARY_FOLDER` for server-side event cover uploads.

Never copy values from `.env` into documentation, AI skills, logs, responses, commits, or screenshots.

## Security change requirements

- Keep password and OTP values hashed at rest.
- Do not log passwords, OTPs, tokens, API keys, or database credentials.
- Attendance QR tokens are short-lived signed JWTs scoped to one event. Do not log or persist them outside the QR-session response intended for the admin display.
- Preserve credentialed CORS behavior for the configured frontend origin.
- Keep authorization checks on the server even when the frontend hides controls.
- Verify both successful and denied authentication/authorization paths after security-sensitive changes.
