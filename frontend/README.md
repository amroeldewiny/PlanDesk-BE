# PlanDesk BE frontend

The frontend is an Angular 22 standalone application for the PlanDesk company
management workspace.

## Structure

```text
src/app/
├── core/
│   ├── guards/        Route access checks
│   ├── interceptors/  HTTP request behavior
│   ├── layout/        Shared authenticated application shell
│   ├── models/        Cross-feature response and session types
│   └── services/      Authentication, tokens, and health checks
├── environments/      API endpoint configuration
└── features/
    ├── auth/
    ├── customers/
    ├── dashboard/
    ├── employees/
    ├── planning/
    └── work-orders/
```

Each business feature keeps its models, pages, and API service together. Pages
are lazy-loaded by `app.routes.ts`, while authenticated pages render inside the
shared `AppShell`.

## Development

Install dependencies and start the application:

```bash
npm ci
npm start
```

The UI runs at `http://localhost:4200` and expects the API at
`http://localhost:3000/api`.

## Verification

```bash
npm test
npm run build
```

The production build is written to `dist/frontend`.

## Authentication

The authentication service stores the current user and company in signals. The
HTTP interceptor attaches the access token only to PlanDesk API requests. Route
guards improve navigation behavior, but the backend remains the security
authority for authentication, company isolation, and roles.

V1 persists its short-lived access token in local storage. A later refresh-token
release should store long-lived credentials in Secure, HttpOnly cookies.
