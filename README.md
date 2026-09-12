# 🚚 Uzlider TMS — Truck Management System

A role-based management system for a US trucking company. Built for owners,
managers, dispatchers, updaters and truck drivers.

Trilingual interface: **English / Русский / O'zbekcha** (switch in the top bar).

## Features

- **Authentication & 6 roles** — every role sees only what it should:
  - **Owner** & **Manager** — full access
  - **Dispatcher** — loads, drivers, trucks, customers, dispatch board
  - **Updater** — post status updates
  - **Accountant** — invoices, billing, reports
  - **Driver** — sees only their own loads, updates their own status
- **Dashboard** — role-aware KPIs, revenue chart, loads-by-status donut,
  top drivers, unassigned loads; drivers get a big current-load card
- **Dispatch board** — kanban view; assign drivers and move loads across
  statuses in one click
- **Loads** — full CRUD with customer, driver, truck, equipment, rate,
  driver pay & margin, search & filter, status-update history
- **Drivers** — profiles, availability, linked truck
- **Trucks** — fleet with unit #, plate, make/model, status, assigned driver
- **Customers** — brokers/shippers with contacts and MC #
- **Invoices** — billing per load, mark sent/paid, outstanding tracking
- **Reports** — revenue by month, by driver, by status (Accountant+)
- **Activity log** — who changed what (Owner/Manager)
- **Live GPS tracking** — drivers turn on location sharing from a one-tap
  control; dispatchers see the whole fleet on a live, auto-refreshing map
  (`Live tracking` page) with each driver's status and current load
- **Telegram integration** — connect a bot in **Settings** to get instant
  alerts in your group/channel on new loads and status updates
- **Users** — role management
- **Profile** — change your own password, theme & language
- **Polish** — light/dark mode, 3 languages, toasts, confirm dialogs,
  loading skeletons, responsive layout

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) ORM + **PostgreSQL**
- Roles & statuses modeled as first-class Postgres enums
- Cookie-based auth (JWT via `jose`), passwords hashed with `bcryptjs`

## Getting started (local)

You need a PostgreSQL database. Copy `.env.example` to `.env` and set
`DATABASE_URL` and `AUTH_SECRET`, then:

```bash
npm install
npm run setup   # pushes the schema and seeds demo data
npm run dev     # http://localhost:3000
```

Then open http://localhost:3000 and sign in with the Owner account created by
the seed (default `admin@uzlider.com` / `admin123`, or your `ADMIN_EMAIL` /
`ADMIN_PASSWORD`). Create the rest of your staff from the **Users** page.

## Deploying

See [DEPLOY.md](DEPLOY.md) for step-by-step Railway deployment (with managed
PostgreSQL).

### First account

The seed creates a single **Owner** account (no demo data):
`ADMIN_EMAIL` / `ADMIN_PASSWORD`, or the default `admin@uzlider.com` /
`admin123`. Sign in, change your password, and create the rest of the team
from the **Users** page.

## Scripts

| Script            | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start the dev server                     |
| `npm run build`   | Production build                         |
| `npm run start`   | Run the production build                 |
| `npm run setup`   | Push schema + seed demo data             |
| `npm run db:reset`| Wipe & reseed the database               |

## Notes

- `.env` holds `DATABASE_URL` (PostgreSQL) and `AUTH_SECRET`. **Change
  `AUTH_SECRET` before deploying to production.**
- The seed only runs when the database is empty, so redeploys never wipe data.
- **Live GPS** uses the browser Geolocation API, which requires **HTTPS** (or
  `localhost`). Production hosts like Railway/Vercel serve HTTPS, so it works
  out of the box; drivers must allow the location permission prompt.
- **Telegram** is configured entirely from the **Settings** page (bot token +
  chat ID) — no environment variables needed. Create a bot with
  [@BotFather](https://t.me/BotFather), add it to your group/channel, then use
  **Send test** to verify. The host must allow outbound HTTPS to
  `api.telegram.org`.
