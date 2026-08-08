# Testing

## Unit and component tests

```bash
npm run test
npm run test:watch
```

Vitest covers currency input/formatting, account balances, debt recalculation, debt strategies, amortization, deterministic priorities, Manila date/week helpers, shared validation, safe redirects, CSV safety, shell accessibility, and keyboard search behavior.

## Static quality

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

The production build intentionally succeeds without Supabase or OpenAI keys.

## Database integration tests

Install the Supabase CLI and use a disposable local database:

```bash
supabase start
supabase db reset
supabase test db
```

Never point these tests at production.

## End-to-end tests

Public tests need no credentials:

```bash
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

In CI or a fresh Linux environment, install the browser and its operating-system
dependencies deterministically before running the suite:

```bash
npx playwright install --with-deps chromium
```

Cache Playwright's browser directory when the CI provider supports it.

Authenticated tests require a dedicated migrated and seeded test project:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
E2E_EMAIL=
E2E_PASSWORD=
```

The authenticated suite skips without those values. It creates records, so the account and project must be disposable.

## Accessibility

Automated browser accessibility tooling is not yet included. Current checks cover semantic navigation, labelled forms, visible focus, skip links, text status, reduced motion, chart text alternatives, and touch-sized controls. Add `@axe-core/playwright` once the authenticated fixture is available.
