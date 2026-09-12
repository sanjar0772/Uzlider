# Deploying Uzlider TMS to Railway

The app uses **PostgreSQL**. Railway provides a managed Postgres database, so
your data persists across deploys.

## Steps

### 1. Create the project
- In Railway: **New Project → Deploy from GitHub repo → `sanjar0772/Uzlider`**.

### 2. Add a PostgreSQL database
- In the project: **New → Database → Add PostgreSQL**.
- Railway creates a `Postgres` service with a `DATABASE_URL`.

### 3. Set the app service variables
Open your **app service → Variables** and add:

| Variable         | Value                                  |
|------------------|----------------------------------------|
| `DATABASE_URL`   | `${{ Postgres.DATABASE_URL }}`         |
| `AUTH_SECRET`    | a long random string (e.g. 40+ chars)  |
| `ADMIN_EMAIL`    | your login email (e.g. you@company.com)|
| `ADMIN_PASSWORD` | your initial password                  |

> `ADMIN_EMAIL` / `ADMIN_PASSWORD` create your first Owner account on the very
> first boot. If you skip them, a default `admin@uzlider.com` / `admin123` is
> created — change it immediately from the Profile page.
>
> **Clearing old demo data:** if your database still has demo records from an
> earlier deploy, add `RESET_DEMO` = `true` once, redeploy (it wipes everything
> and recreates just your admin), then delete the `RESET_DEMO` variable.

> `${{ Postgres.DATABASE_URL }}` is a Railway reference — it auto-links to the
> Postgres service you just added. Type it exactly like that.

Generate a secret quickly (any of these):
```bash
openssl rand -base64 48
```

### 4. Deploy
Railway runs:
- **Install** → `npm install` (also runs `prisma generate` via `postinstall`)
- **Build** → `npm run build`
- **Start** → `prisma db push` (creates the tables) → seed demo data (only if the
  DB is empty) → `next start`

That's it. The first boot creates the schema and seeds the five role accounts.

### 5. Log in
Open the deployed URL and sign in with your Owner account:
- the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set, or
- the default `admin@uzlider.com` / `admin123` if you didn't.

Then, as Owner, create real staff accounts (managers, dispatchers, drivers…)
from the **Users** page, and change your own password on the **Profile** page.

## Notes
- The seed only runs when the database has **no users**, so redeploys never wipe
  your real data.
- To wipe and reseed on purpose, run `npm run db:reset` locally against the DB.
- Roles are enforced both in the UI and in every API route.
