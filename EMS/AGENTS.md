# Frontend Agent Guide

## Scope

This directory contains the Event Management System frontend, built with React 19 and Vite.

Keep frontend work in this directory unless the task requires a coordinated backend API change. Check the backend contract before changing request payloads, authentication behavior, or response handling.

## Frontend conventions

- Prefer small, focused React components.
- Keep page-level composition separate from reusable UI components.
- Preserve the existing Vite entrypoint and build configuration unless the task requires a change.
- Use the project-approved UI libraries documented in `Documentations/Readme.md`: shadcn for general components and Material UI primarily for data-display components such as tables.
- Include loading, empty, error, and success states for asynchronous operations.
- Use accessible labels, keyboard-friendly controls, meaningful buttons, and useful image alt text.
- Keep responsive behavior in mind for student and administrator views.
- Do not place secrets or private backend configuration in frontend code.

## API integration

- Treat API response shapes as contracts; do not silently change field names.
- Preserve credentialed requests when authentication depends on cookies.
- Handle `401` and `403` responses distinctly.
- Do not expose raw server errors, tokens, OTPs, or private implementation details to users.

## Verification

Run from `EMS/`:

```text
npm run lint
npm run build
```

Use `npm run dev` for local visual verification and `npm run preview` to preview a production build.
