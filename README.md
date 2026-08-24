# ATLAS

**Your personal operating system.**

ATLAS is a private, Philippines-first life-management application for seeing money, debts, tasks, goals, career applications, and weekly reflection in one daily route. It stores pesos as integer centavos, displays dates in Asia/Manila, and treats Monday through Sunday as the default review week.

## Features

- Supabase email/password authentication, recovery, protected routes, and onboarding
- data-driven Today dashboard with deterministic Dayline priorities
- auditable accounts, income/expense transactions, monthly budgets, and server exports
- debt strategies, payment history, atomic balance recalculation, and amortization estimates
- task capture, Today/Upcoming/Inbox/Completed views, and keyboard shortcut
- goals with manual progress
- career table and Kanban views, stage history, overdue follow-ups, and conversion guards
- weekly factual summaries, guided reflections, drafts, submission, and score trends
- owner-scoped global search plus filterable, paginated activity history and export
- installable PWA with user-scoped offline page caches and automatic mutation replay
- device privacy mode, sync/storage controls, quick-capture defaults, and scoped session controls
- password/email changes, authenticated account deletion, and TOTP authenticator MFA
- opt-in daily web-push reminders with quiet hours and idempotent Vercel cron delivery
- dark-first responsive shell with light mode, focus states, reduced motion, loading, empty, and error states

## Stack

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui conventions, Supabase PostgreSQL/Auth/SSR, Zod, React Hook Form, Recharts, Lucide, date-fns, Vitest, Testing Library, Playwright, ESLint, Prettier, and npm.

## Local setup

Requirements: Node.js 20.9+ (Node 22 LTS recommended), npm, and a Supabase development project.

```bash
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase variables, the public landing and auth interface run, the production build succeeds, and protected pages redirect to the setup-aware login state.

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=
```

The service-role key enables authenticated account deletion and the reminder
delivery worker. The VAPID private key and cron secret are server-only. The
OpenAI key remains optional and unused by the current runtime.

## Supabase setup

Apply the migration and run the database tests in a dedicated local/test project:

```bash
supabase start
supabase db reset
supabase test db
```

After the reset, create a development Auth user through the app. To add fictional demo records, run `supabase/seed.sql` in the local Supabase Studio SQL editor. See [Database](docs/database.md) and [Security](docs/security.md).

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
```

For browser tests:

```bash
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

See [Testing](docs/testing.md) for authenticated and database fixtures.

## Deployment

The application targets Vercel and Supabase. Apply the database migration first, configure Auth callback URLs, set the three required public runtime variables in Vercel, run CI, and deploy. See [Deployment](docs/deployment.md).

## Folder structure

```text
src/app/          App Router pages, layouts, route handlers, and errors
src/components/   ATLAS, module, shared, and shadcn-style UI components
src/lib/          auth, Supabase, validation, calculations, and mutations
src/test/         Vitest environment
supabase/         migration, seed, and pgTAP tests
e2e/              Playwright public and authenticated workflows
docs/             architecture, database, security, testing, and delivery docs
```

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md)
- [Future roadmap](docs/future-roadmap.md)

## Screenshots

Screenshots will be added after a migrated Supabase test project is connected and representative fictional data can be rendered safely.

## Known limitations

- The newest SQL migration and pgTAP suite were not executed locally because Docker Desktop was unavailable; apply them to a disposable Supabase branch before production.
- Account deletion remains visibly disabled when `SUPABASE_SERVICE_ROLE_KEY` is absent.
- Browser reminders remain visibly disabled until VAPID and cron secrets are configured.
- Full edit dialogs, goal milestone management, transfer entry, and advanced transaction filters remain incomplete.
- Authenticated Playwright workflows require dedicated test credentials and skip without them.
- Automated axe accessibility checks are not yet configured.
