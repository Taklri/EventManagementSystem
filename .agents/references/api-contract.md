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
| `POST` | `/api/users/refresh` | Refresh cookie | Refresh the access token. |
| `POST` | `/api/users/logout` | Refresh cookie when present | Clear the refresh-token cookie. |

Registration defaults new users to the `student` role. The current user route does not expose the `getUsers` controller as an endpoint.

## Event endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/events` | Bearer token + `admin` role | Create an event. |
| `GET` | `/api/events` | Public | Return non-archived events with computed status. |
| `GET` | `/api/events/archived` | Public in current routing | Return archived events with computed status. |
| `GET` | `/api/events/:id` | Public | Return one event with its populated organizer and computed status. |
| `PUT` | `/api/events/:id` | Bearer token + `admin` role | Update a non-archived event. |
| `PATCH` | `/api/events/:id/archive` | Bearer token + `admin` role | Archive an event. |

## Response conventions

- Successful responses generally include a human-readable `message`.
- Collections use an `events` or `users` property.
- Event mutation and lookup responses use an `event` property.
- Authentication responses currently return the access token using the key `accesstoken`.
- Validation, authentication, authorization, not-found, conflict, rate-limit, and server failures return a `message` property.
- Do not change response names casually; coordinate frontend and backend changes when a contract must change.

## Protected request convention

Protected routes expect:

```text
Authorization: Bearer <access-token>
```

Refresh and logout use the `refreshToken` HTTP-only cookie rather than the Authorization header.
