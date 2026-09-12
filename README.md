# 🚚 Uzlider TMS — Truck Management System

A role-based management system for a US trucking company. Built for owners,
managers, dispatchers, updaters and truck drivers.

Trilingual interface: **English / Русский / O'zbekcha** (switch in the top bar).

## Features

- **Authentication & roles** — every role sees only what it should:
  - **Owner** & **Manager** — full access (loads, drivers, users)
  - **Dispatcher** — create/assign loads, manage drivers
  - **Updater** — update load statuses and post progress updates
  - **Driver** — sees only their own loads and can update their status
- **Loads** — create, edit, assign a driver, search & filter, delete, full
  status-update history (location + notes)
- **Drivers** — profiles with truck/trailer/license, availability status
- **Users** — owner/manager can create accounts and assign roles
- **Dashboard** — live stats (total / active / delivered loads, available drivers)

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) ORM + SQLite (no external DB needed)
- Cookie-based auth (JWT via `jose`), passwords hashed with `bcryptjs`

## Getting started

```bash
npm install
npm run setup   # creates the SQLite DB and loads demo data
npm run dev     # http://localhost:3000
```

Then open http://localhost:3000 and sign in with one of the demo accounts below.

### Demo accounts

| Role       | Email                  | Password      |
|------------|------------------------|---------------|
| Owner      | owner@uzlider.com      | `owner123`    |
| Manager    | manager@uzlider.com    | `manager123`  |
| Dispatcher | dispatch@uzlider.com   | `dispatch123` |
| Updater    | updater@uzlider.com    | `updater123`  |
| Driver     | driver@uzlider.com     | `driver123`   |

## Scripts

| Script            | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start the dev server                     |
| `npm run build`   | Production build                         |
| `npm run start`   | Run the production build                 |
| `npm run setup`   | Push schema + seed demo data             |
| `npm run db:reset`| Wipe & reseed the database               |

## Notes

- `.env` holds `DATABASE_URL` and `AUTH_SECRET`. **Change `AUTH_SECRET` before
  deploying to production.**
- The SQLite database file (`prisma/dev.db`) is git-ignored.
