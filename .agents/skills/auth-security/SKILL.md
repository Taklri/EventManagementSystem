---
name: auth-security
description: Build or review authentication, OTP verification, passwords, JWTs, cookies, CORS, rate limits, authorization, user roles, or Brevo email behavior for the Event Management System. Use for any security-sensitive change under ems-backend/ or any frontend flow that handles protected access.
---

# Authentication and Security Skill

## Purpose

Use this skill whenever a change can affect identity, access, credentials, tokens, email verification, cookies, rate limiting, or protected user and event behavior. Treat authentication and authorization changes as security-sensitive even when the code change appears small.

## Before changing code

1. Read the root `AGENTS.md` and `ems-backend/AGENTS.md`.
2. Read `../../references/security-rules.md` completely.
3. Read `../../references/api-contract.md` for affected user or protected endpoints.
4. Inspect the current authentication middleware, controllers, models, rate limiters, cookie configuration, and email service before changing behavior.
5. Identify the affected actor: unauthenticated visitor, student, admin, or another service.
6. State whether the change preserves the current contract or intentionally changes it.

## Current authentication flow

### Student registration

1. Registration validates student and profile fields.
2. The password is hashed before being stored in `PendingRegistration`.
3. A six-digit OTP is generated, hashed, given an expiration time, and emailed through Brevo.
4. Registration OTP verification checks the challenge, expiration, attempts, and submitted code.
5. A `User` is created only after successful verification, with the default `student` role.
6. The pending registration is deleted and tokens are issued.

### Login

1. Login normalizes the email and validates the password with bcrypt.
2. A six-digit login OTP is generated, hashed, stored, and emailed through Brevo.
3. Login OTP verification checks existence, consumption, expiration, attempt count, and code validity.
4. Successful verification marks the OTP consumed, issues an access token, and sets the refresh cookie.

### Refresh and logout

- Refresh reads the `refreshToken` HTTP-only cookie, verifies it with the refresh secret, finds the user, and issues a new access token plus refresh cookie.
- Logout clears the `refreshToken` cookie using matching cookie options.
- Do not move refresh tokens into normal response bodies or browser-readable storage without an intentional security review.

## Token and cookie rules

- Protected requests use `Authorization: Bearer <access-token>`.
- Access-token claims currently include the user ID in `sub` and role in `role`.
- Access tokens currently expire after 15 minutes.
- Refresh tokens currently expire after 7 days.
- The refresh cookie is named `refreshToken`.
- The refresh cookie is `httpOnly`, uses `sameSite: strict`, and is `secure` in production.
- Preserve credentialed CORS and the configured frontend origin.
- Do not change token claims, expiry, cookie names, or cookie flags without coordinating the frontend and API contract.

## Authorization rules

- Authentication proves identity; authorization decides whether that identity may perform the operation.
- Enforce permissions on the server even when the frontend hides a button.
- Missing or invalid bearer authentication returns `401`.
- An authenticated user without the required role returns `403`.
- Current supported roles are `student` and `admin`.
- Event creation, update, and archive operations require `admin`.
- Profile updates allow an admin to update another profile or a user to update their own profile.
- Never trust a role, user ID, organizer ID, or permission value supplied only by the client.

## OTP and rate-limit rules

- Store OTP hashes, not plaintext OTPs.
- Keep OTP expiration and consumed-state checks server-side.
- Preserve the six-digit format and maximum incorrect-attempt behavior.
- Do not log or return OTP values.
- Preserve the current rate limits unless a security change explicitly addresses them:
  - API: 100 requests per 10 minutes.
  - Login: 5 requests per 15 minutes.
  - Login OTP verification: 5 requests per 10 minutes.
  - Registration: 5 requests per hour.
  - Registration OTP verification: 5 requests per 10 minutes.
  - Registration OTP resend: 3 requests per hour plus application cooldown and resend limits.
- When changing an OTP flow, verify expired, consumed, invalid, repeated, and rate-limited attempts.

## Password, secret, and email rules

- Hash passwords with the existing bcrypt flow; never store or compare plaintext passwords directly.
- Keep Brevo access inside `services/brevoService.js` or an equivalent service boundary.
- Read secrets only from environment variables.
- Never commit, print, return, screenshot, or copy `.env` values.
- Never expose passwords, password hashes, OTPs, OTP hashes, access tokens, refresh tokens, JWT secrets, API keys, database URLs, or email-service credentials.
- Do not include sensitive values in AI skills, references, examples, fixtures, or error messages.
- Handle Brevo failures without returning private provider errors to clients.
- Preserve cleanup behavior when registration email delivery fails.

## Error and logging rules

- Use generic client-facing messages where detailed authentication failure information could reveal sensitive account state, unless preserving the current API contract requires otherwise.
- Keep `401` and `403` behavior distinct.
- Return validation failures as appropriate client errors rather than allowing avoidable uncaught exceptions.
- Do not return stack traces, JWT contents, provider responses, database errors, or environment values.
- Review every new log statement for credentials, tokens, OTPs, email addresses, personal data, and authorization data.

## Change checklist

Before completing a security-sensitive change, verify:

- Unauthenticated requests are rejected where required.
- Authenticated students cannot perform admin-only operations.
- Admin operations still work with a valid admin token.
- Own-profile and other-profile update rules remain correct.
- Expired, invalid, consumed, and over-attempt OTPs are rejected.
- Refresh and logout preserve cookie behavior.
- Rate limits remain active on sensitive endpoints.
- Secrets are not present in changed files or output.
- API response keys and status codes remain compatible, or the contract change is documented.

## Verification

Run from `ems-backend/`:

```text
npm run dev
npm start
```

Perform targeted smoke checks for the affected authentication or authorization flow. Use test credentials and test OTP values only. Report exactly what was checked and do not claim automated security tests passed when no automated test suite exists.
