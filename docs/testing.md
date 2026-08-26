# Testing

Latest local snapshot: 2026-08-26. See [MVP status](mvp-status.md) for the release-level summary.

## Unit and component tests

```bash
npm run test
npm run test:watch
```

Vitest currently passes 193 tests across 53 files. Coverage includes currency input/formatting, account balances, transaction/account editing, debt recalculation, debt strategies, amortization, deterministic priorities, Manila date/week helpers, task scheduling and Focus mode, milestone-derived progress and rich text, shared validation, safe redirects, reminder delivery, CSV safety, shell/settings accessibility, offline behavior, and keyboard search.

## Static quality

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

The production build intentionally succeeds without Supabase or OpenAI keys.

The current CI quality job runs lint, type checking, unit tests, and the production build. `format:check` remains useful locally but currently reports legacy formatting drift across unchanged repository files; normalize that baseline as a separate mechanical cleanup rather than mixing it into feature work.

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

Latest credential-free Chromium result: 19 passed, 10 authenticated checks skipped, and 0 failed. Run both configured projects for full desktop/mobile coverage:

```bash
npm run test:e2e
```

## Accessibility

`@axe-core/playwright` is configured for the public landing, login, signup, and password-recovery routes. Component and browser checks also cover semantic navigation, labelled forms, visible focus, skip links, text status, reduced motion, chart text alternatives, dialog focus behavior, and touch-sized controls.

Authenticated Axe coverage still requires the dedicated disposable fixture. Add those checks to the existing authenticated workflow once its CI credentials and cleanup are in place.
