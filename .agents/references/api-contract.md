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

Registration defaults new users to the `student` role. The current user route does not expose the `getUsers` controller as an endpoint.

### Authentication payloads and validation

- Registration accepts string fields `studentId`, `firstName`, optional `middleName`, `lastName`, `email`, and `password`. IDs use `YYYY-######`; names allow Unicode letters, spaces, apostrophes, and hyphens. Email has no campus domain restriction and is trimmed/lowercased.
- Registration passwords require at least 8 characters, uppercase/lowercase letters, a number, and a symbol. The bcrypt input limit is 72 UTF-8 bytes. Login accepts existing passwords without applying new registration complexity rules.
- Login accepts `{ email, password }`. Both OTP verification endpoints accept `{ challengeId, otp }`, with a string challenge ID and a six-digit string code. Both resend endpoints accept `{ challengeId }`.
- Starting or resending an OTP returns `message`, `challengeId`, ISO `expiresAt`, and `retryAfterSeconds` (the configured resend cooldown). Registration start returns `202`; login start and resends return `200`.
- Verification returns `accesstoken`, a `user` display object with `firstName` and `lastName`, and the refresh cookie; registration verification returns `201`, login verification returns `200`. Refresh also returns the display object so the student header can restore the name after reload.
- Resend cooldown failures return `429` with `retryAfterSeconds`. Expired challenges require restarting registration/login; consumed challenges and challenges with five incorrect attempts cannot be resent.
- The frontend uses `VITE_API_BASE_URL` for the API root, defaulting to `/api`. Vite proxies local `/api` calls to the backend on port 5000; production must route `/api` to the backend or configure an explicit API root. Cookie-based calls use credentials. Access tokens live in React memory and sessions restore through `/refresh`.

## Event endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/events` | Bearer token + `admin` role | Create an event. |
| `GET` | `/api/events` | Public | Return non-archived events with computed status. |
| `GET` | `/api/events/archived` | Public in current routing | Return archived events with computed status. |
| `GET` | `/api/events/:id` | Public | Return one event with its populated organizer and computed status. |
| `PUT` | `/api/events/:id` | Bearer token + `admin` role | Update a non-archived event. |
| `PATCH` | `/api/events/:id/archive` | Bearer token + `admin` role | Archive an event. |

### Event discovery queries

`GET /api/events` accepts optional `page` (1–1000000), `limit` (1–24, default 9), `search` (up to 100 characters, literal case-insensitive title/location search), and `status` (`active`, `upcoming`, `ongoing`, `all`; default `all`). With any discovery parameter, it returns `{ events, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }`. Empty results have `totalPages: 0`; pages beyond the last return an empty array with the requested page. With no discovery parameters, the existing `{ events }` collection response is preserved.

All list results exclude archived events and sort by `startDate`, then `_id`, ascending. `active` includes events whose end is at or after the current instant; `upcoming` starts after now; `ongoing` includes both start/end boundaries. Status is computed at read time. Invalid query values return `400`.

The authenticated student portal uses `/home` with URL search/filter/page state, `/events/:id` for event details, and `/my-events` as a coming-soon page. Home requests `status=active` and `limit=9`. Campus dates use `Asia/Manila`. No student event registration data is created.

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
