# HelpFlow AI

HelpFlow AI is a full-stack IT help desk. Employees open support requests, an AI assistant triages each one (category, priority, responsible team, likely causes, first steps), and IT staff work the ticket through its lifecycle with AI-drafted replies, hand-over summaries and closing notes.

The interface is in Turkish.

| Admin dashboard | Ticket detail with AI assistant |
| --- | --- |
| ![Admin dashboard](docs/screenshots/admin-dashboard.png) | ![Ticket detail](docs/screenshots/ticket-detail.png) |

| AI preview while writing a ticket | Reports |
| --- | --- |
| ![AI preview](docs/screenshots/new-ticket-ai-preview.png) | ![Reports](docs/screenshots/reports.png) |

## Features

**Tickets**
- Create, edit, cancel, resolve, close and reopen, with a full status and assignment timeline
- Routing through `Ticket -> Category -> Support Unit`; transfer between teams with a reason
- Assign to yourself or to any member of the owning team
- Conversation with the requester, plus internal notes only IT staff can see
- File attachments (images, PDF, Office, text; 3 MB each, 5 per ticket) stored in PostgreSQL, so no object storage account is needed
- 1-5 satisfaction rating once a ticket is resolved
- Search and filters by status and priority

**AI assistant**
- Triage on creation: summary, category, team, priority, impact, causes, steps, follow-up questions, confidence score
- Live preview while the employee is still typing the request
- The employee's category is only overridden when the model is confident; the override is recorded and shown
- Reply suggestion, hand-over summary and closing note, written from the whole conversation
- Works without an API key: a rule-based Turkish keyword engine takes over whenever `OPENAI_API_KEY` is missing or the request fails, and the UI states which one produced the result

**Dashboards and reports**
- Role-specific dashboards: open load, unassigned tickets, 14-day opened/resolved trend, average resolution time, satisfaction
- Reports by category, team, department, priority, status and staff member, plus AI routing accuracy

**Roles**
- `EMPLOYEE` sees and manages their own tickets
- `IT_STAFF` sees their team's tickets and the ones assigned to them
- `ADMIN` sees everything and manages users, departments, teams and categories

## Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Router, React Hook Form, Zod, Recharts
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt, OpenAI API
- Tests: Vitest, Supertest
- Deployment: Vercel (frontend and serverless API) or Render, with any hosted PostgreSQL

## Quick Start

Requires Node.js 22 and a PostgreSQL database.

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run prisma:deploy     # create the tables
npm run seed              # default data, demo users and demo tickets
npm run dev:backend       # http://localhost:4000
npm run dev:frontend      # http://localhost:5173
```

Set `DATABASE_URL` and `JWT_SECRET` in `backend/.env`. `OPENAI_API_KEY` is optional.

## Demo Users

The login page has one-click buttons for these (hide them with `VITE_SHOW_DEMO_LOGINS=false`).

| Role | E-mail | Password |
| --- | --- | --- |
| Admin | `admin@demo.com` | `Admin123!` |
| Employee | `employee@demo.com` | `Employee123!` |
| IT staff (network) | `network.it@demo.com` | `Staff123!` |
| IT staff (printers) | `printer.it@demo.com` | `Staff123!` |
| IT staff (cameras) | `camera.it@demo.com` | `Staff123!` |

Demo users are only created when `SEED_DEMO_USERS=true` (or outside production); this includes a public demo admin (`admin@demo.com`) when `SEED_ADMIN_EMAIL` is a different address. Do not enable them on a deployment that holds real data.

Live demo: https://helpflowai.vercel.app

## Tests

```bash
npm run typecheck
npm test
```

Backend tests are integration tests that run against a real PostgreSQL database and wipe it between files. Point them at a dedicated database whose name contains `test`; the suite refuses to run otherwise:

```bash
createdb helpflow_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/helpflow_test npm run prisma:deploy
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/helpflow_test npm test
```

They cover authentication, role-based access, the ticket lifecycle, routing, transfers, ratings, attachments, admin management and the rule-based AI engine. Tests never call OpenAI.

## Project Structure

```text
backend/
  prisma/        schema, migrations, seed
  src/
    controllers/ request handlers
    services/    ticket logic, AI (OpenAI + rule engine), attachments, statistics
    routes/ middlewares/ validators/ utils/
  tests/         integration and unit tests
frontend/
  src/
    pages/       dashboard, tickets, ticket detail panels, admin, auth
    components/  layout, UI primitives, charts
    hooks/ lib/ contexts/ types/
```

## API Overview

All routes are under `/api` and, except `auth/login`, `auth/register`, `public/*` and `health`, need `Authorization: Bearer <token>`.

| Area | Routes |
| --- | --- |
| Auth | `POST auth/register`, `POST auth/login`, `GET auth/me` |
| Tickets | `GET/POST tickets`, `GET/PATCH/DELETE tickets/:id`, `PATCH tickets/:id/{assign,status,priority,category,transfer}`, `POST tickets/:id/{resolve,close,cancel,reopen,rating}` |
| Conversation | `GET/POST tickets/:id/messages`, `GET/POST tickets/:id/internal-notes` |
| Attachments | `POST tickets/:id/attachments`, `GET/DELETE tickets/:id/attachments/:attachmentId` |
| AI | `GET ai/status`, `POST ai/analyze-ticket`, `POST ai/tickets/:id/{reanalyze,suggest-reply,summary,closing-summary}` |
| Dashboards | `GET dashboard`, `GET reports/overview`, `GET reports/:group` |
| Admin | `users`, `departments`, `support-units`, `categories` (CRUD) |

Requests are rate limited per IP (180/min overall, 15/min on login and register, 30/min on AI routes).

## Production Deployment With Live Database

### Vercel + Prisma Postgres Database

For a Vercel-first deployment, create a Postgres database from Vercel Marketplace. Prisma Postgres and Neon both work. When the database is connected to the Vercel project, Vercel injects `DATABASE_URL` into the project environment.

Backend expects this variable:

```bash
DATABASE_URL="postgres://..."
```

Run migrations and seed data before first use:

```bash
cd backend
npm run prisma:deploy
npm run seed
```

Use these production seed variables so only your real admin account is created:

```bash
SEED_DEMO_USERS=false
SEED_ADMIN_EMAIL="you@example.com"
SEED_ADMIN_PASSWORD="use-a-strong-password"
```

### Backend on Vercel

The backend can run as a Vercel Serverless API from the `backend` folder.

Vercel project settings:

- Root Directory: `backend`
- Build Command: `npm run vercel-build`
- Install Command: `npm install`
- Output Directory: leave empty

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `FRONTEND_URL=https://your-frontend-domain.vercel.app`
- `CORS_ORIGINS=https://your-frontend-domain.vercel.app`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`
- `SEED_DEMO_USERS=false`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `APP_TIMEZONE=Europe/Istanbul` (optional, used for daily report buckets)

After the first backend deployment, run:

```bash
npm run seed
```

This creates departments, support units, categories, and the initial admin user.

### Single Vercel Project With Services

If Vercel detects this repository as a multi-service project, keep the Vercel Framework Preset set to `Services`. The root `vercel.json` defines:

- `frontend` at `/`
- `backend` at `/api`

For this mode, set frontend API URL to:

```bash
VITE_API_URL=/api
```

### Backend on Render

This repository includes `render.yaml` for a Render web service.

Required environment variables:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `FRONTEND_URL=https://your-vercel-domain.vercel.app`
- `CORS_ORIGINS=https://your-vercel-domain.vercel.app`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`
- `SEED_DEMO_USERS=false`
- `SEED_ADMIN_EMAIL=your-admin-email`
- `SEED_ADMIN_PASSWORD=your-strong-admin-password`

Build command:

```bash
npm install && npm run prisma:generate && npm run build
```

First deploy database setup:

```bash
npm run prisma:deploy
npm run seed
```

Start command:

```bash
npm run start
```

### Frontend on Vercel

Set the project root to `frontend`.

Required environment variable:

- `VITE_API_URL=https://your-backend-domain.vercel.app/api`

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

`frontend/vercel.json` is included so React Router routes work after refresh.
