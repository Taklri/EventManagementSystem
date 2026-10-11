# System Architecture Reference

## Repository boundaries

```text
EMS/                    React 19 + Vite frontend
ems-backend/            Node.js + Express + MongoDB backend
Documentations/         Human-facing project notes
```

## Backend request flow

```text
HTTP request
  -> Express application in server.js
  -> global middleware: CORS, JSON parsing, cookies
  -> /api rate limiter
  -> route module
  -> authentication/authorization middleware when required
  -> controller
  -> service, model, or utility
  -> JSON response
```

## Backend responsibilities

- `server.js` starts the application, loads environment variables, connects to MongoDB, mounts `/api`, and starts listening.
- `routes/` maps HTTP methods and paths to controllers.
- `middleware/` handles authentication, role authorization, and rate limiting.
- `controller/` validates requests, coordinates operations, and formats responses.
- `services/` contains external integrations, including Brevo email delivery.
- `models/` defines Mongoose persistence schemas.
- `utils/` contains reusable operations such as OTP helpers and computed event status.
- `config/` contains infrastructure configuration such as the MongoDB connection.

## Frontend responsibilities

`EMS/` contains the Vite application entrypoint, React components/pages, styles, and static assets. Frontend code consumes backend APIs; it must not replace server-side authentication, authorization, validation, or security controls.

## Data flow rules

- The backend is the source of truth for permissions and persisted data.
- The frontend should treat API response fields as contracts.
- Event status is calculated from event dates by the backend and returned with event responses.
- Authentication uses a short-lived access token for protected requests and an HTTP-only refresh-token cookie for refresh/logout behavior.
