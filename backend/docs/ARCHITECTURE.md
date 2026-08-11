# PlanDesk BE Architecture

## Overview

PlanDesk BE is a multi-company SaaS application for Belgian cleaning and service businesses.

It manages:

- Customers
- Employees
- Work orders
- Employee assignments
- Weekly planning
- Company dashboards
- User authentication and permissions

Every company has an isolated workspace. Data belonging to one company must never be accessible by another company.

## Technology Stack

### Frontend

- Angular
- TypeScript
- Standalone components
- Angular Router
- Angular HttpClient
- Signals
- SCSS

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod validation
- JWT authentication
- Vitest

## Repository Structure

```text
plandesk-be/
├── backend/
│   ├── prisma/
│   └── src/
│       ├── common/
│       ├── config/
│       ├── generated/
│       ├── middleware/
│       └── modules/
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── core/
│       │   └── features/
│       └── environments/
└── docs/