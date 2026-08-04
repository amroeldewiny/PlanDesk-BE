# PlanDesk

PlanDesk is a multi-tenant business management platform for Belgian small businesses. It is being built to manage companies, users, customers, employees, projects, planning and related daily operations from one application.

The project currently includes company registration, secure authentication, protected user sessions and a dashboard foundation.

## Technology

### Frontend

- Angular 22
- TypeScript
- Standalone components
- Angular Router
- Reactive Forms and Signals

### Backend

- Node.js and Express 5
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- Zod validation
- Helmet and API rate limiting

## Project structure

```text
PlanDesk-BE/
├── backend/     Express API, Prisma schema and database migrations
├── frontend/    Angular web application
└── README.md
```

## Requirements

- Node.js 24.15 or newer
- npm 11 or newer
- PostgreSQL 17 or compatible

## Local setup

Clone the repository:

```bash
git clone https://github.com/amroeldewiny/PlanDesk-BE.git
cd PlanDesk-BE
```

### 1. Configure the backend

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env` with your local PostgreSQL connection and a strong JWT secret:

```env
PORT=3000
CLIENT_URL=http://localhost:4200
NODE_ENV=development
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/plandesk_db?schema=public"
JWT_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
JWT_EXPIRES_IN=15m
```

Create or update the database and start the API:

```bash
npx prisma migrate dev
npm run dev
```

The API runs at `http://localhost:3000`.

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

The application runs at `http://localhost:4200`.

## Available API routes

| Method | Route | Description | Authentication |
|---|---|---|---|
| `GET` | `/api/health` | Check API and database health | No |
| `POST` | `/api/auth/register` | Register a company owner | No |
| `POST` | `/api/auth/login` | Sign in | No |
| `GET` | `/api/auth/me` | Get the authenticated user | Bearer token |

## Useful commands

### Backend

```bash
npm run dev       # Start the development API
npm run build     # Generate Prisma Client and compile TypeScript
npm start         # Run the compiled API
npx prisma studio # Open the Prisma database interface
```

### Frontend

```bash
npm start         # Start the Angular development server
npm run build     # Create a production build
npm test          # Run frontend tests
```

## Security

- Passwords are hashed and are never returned by the API.
- JWTs are validated using issuer, audience and expiration claims.
- Authentication endpoints and the general API are rate-limited.
- Helmet provides standard HTTP security headers.
- Company and user status are verified for protected requests.
- Local environment files are excluded from Git.

Never commit `.env`, database passwords, JWT secrets or access tokens.

## Roadmap

- Customer management
- Employee and role management
- Projects and tasks
- Planning and appointments
- Dashboard reporting
- Refresh-token authentication
- Automated backend and frontend tests

## Author

Developed by [Amro Eldewiny](https://github.com/amroeldewiny).
