# Project Atlas

**Your personal operating system.**

Project Atlas is a private, Philippines-first life-management application for seeing money, debts, tasks, goals, career applications, and weekly reflection in one daily route. It stores pesos as integer centavos, displays dates in Asia/Manila, and treats Monday through Sunday as the default review week.

## Features

- Supabase email/password authentication, recovery, protected routes, and onboarding
- data-driven Today dashboard with deterministic Dayline priorities
- auditable accounts, income/expense transactions, monthly budgets, and server exports
- debt strategies, payment history, atomic balance recalculation, and amortization estimates
- task capture, Today/Upcoming/Inbox/Completed views, and keyboard shortcut
- goals with manual progress
- career table and Kanban views, stage history, overdue follow-ups, and conversion guards
- weekly factual summaries, guided reflections, drafts, submission, and score trends
- owner-scoped global search and activity history schema
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
```

The service-role and OpenAI keys are server-only and unused by the MVP runtime.

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
src/components/   Atlas, module, shared, and shadcn-style UI components
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

- The SQL migration and pgTAP suite are not executed in this workspace because no Supabase CLI, PostgreSQL client, or test project was available.
- Permanent account deletion is intentionally disabled until a secure administrative endpoint is deployed.
- Full edit dialogs, goal milestone management, transfer entry, advanced transaction filters, and an activity-history screen remain incomplete.
- Authenticated Playwright workflows require dedicated test credentials and skip without them.
- Automated axe accessibility checks are not yet configured.
