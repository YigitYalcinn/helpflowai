# HelpFlow AI

HelpFlow AI is a full-stack IT support request management system inspired by internal help desk workflows. Employees create tickets, IT teams manage lifecycle and assignment, and AI analyzes each request to suggest category, priority, responsible support unit, possible causes, and resolution steps.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Recharts
- Backend: Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt, OpenAI API
- Deployment target: Vercel frontend, Render/Railway backend, Neon/Supabase PostgreSQL

## Project Structure

```text
helpflow-ai/
  frontend/
  backend/
  README.md
```

## Quick Start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run prisma:generate
npm run seed
npm run dev:backend
npm run dev:frontend
```

Set `DATABASE_URL`, `JWT_SECRET`, and optionally `OPENAI_API_KEY` in `backend/.env`.

## Demo Users

- `admin@demo.com` / `Admin123!` / ADMIN
- `employee@demo.com` / `Employee123!` / EMPLOYEE
- `printer.it@demo.com` / `Staff123!` / IT_STAFF
- `network.it@demo.com` / `Staff123!` / IT_STAFF
- `camera.it@demo.com` / `Staff123!` / IT_STAFF

## Core Capabilities

- JWT authentication and role-based authorization
- Employee, IT Staff, and Admin dashboards
- Ticket CRUD, assignment, transfer, status lifecycle, messages, internal notes
- Department, support unit, and category management
- Ticket routing through `Ticket -> Category -> Support Unit`
- AI ticket analysis stored in `ticket_ai_analysis`
- Dashboard and report endpoints for category, support unit, department, and priority metrics

## Backend Scripts

```bash
cd backend
npm run dev
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

## Frontend Scripts

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

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

After the first backend deployment, run:

```bash
npm run seed
```

This creates departments, support units, categories, and the initial admin user.

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
