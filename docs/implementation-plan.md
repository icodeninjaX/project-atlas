# ATLAS implementation plan

Status legend: planned, in progress, complete, blocked.

## Phase 1 — Foundation

Status: complete

- Scaffold Next.js 16 App Router with strict TypeScript, Tailwind CSS v4, ESLint, Prettier, Vitest, and Playwright.
- Establish the ATLAS design system, responsive application shell, light/dark themes, loading/error states, health endpoint, and environment validation.
- Add lazy browser/server Supabase clients so builds do not require live credentials.
- Validate with lint, type checking, unit tests, and a production build.

Result: foundation code and production build are implemented. Final full-suite verification is repeated in Phase 7.

## Phase 2 — Database and authentication

Status: implemented, database execution blocked

- Create PostgreSQL migrations for every MVP entity, constraints, indexes, timestamp triggers, debt/account invariants, activity history, and search.
- Enable RLS and add owner-scoped policies with `USING` and `WITH CHECK`.
- Add email/password authentication, password recovery, protected routes, profile provisioning, and onboarding.
- Add SQL security tests for cross-user isolation.

Result: migration, auth UI, proxy, recovery, reset, onboarding RPC, and pgTAP are present. Applying the migration and running pgTAP requires a Supabase CLI/test project not available in this workspace.

## Phase 3 — Tasks and goals

Status: partially complete

- Implement task capture and Today, Upcoming, Inbox, and Completed views.
- Implement goal CRUD, milestones, related tasks, progress, filters, and dashboard summaries.
- Add keyboard shortcuts and rollback-safe interactions.

Result: task capture/status/delete and goal creation/progress are implemented. Goal milestone management and full edit dialogs remain.

## Phase 4 — Money and debts

Status: partially complete

- Implement accounts, categories, auditable transactions, budgets, filtering, summaries, and accessible charts.
- Implement debts, payment history, atomic balance recalculation, strategies, and payoff projections with stated assumptions.
- Unit-test all money and debt calculations before implementation.

Result: accounts, income/expense transactions, budgets, debt creation/payments, strategies, and projections are implemented. Transfer entry, full edit flows, and advanced transaction filters remain.

## Phase 5 — Career tracker

Status: substantially complete

- Implement application table, Kanban view, detail flow, stage events, next actions, filtering, and conversion metrics.

Result: creation, table/Kanban views, stage events, next actions, overdue states, salary ranges, and guarded conversion metrics are implemented. A dedicated detail drawer and advanced filters remain.

## Phase 6 — Weekly reviews and search

Status: complete for current MVP depth

- Implement weekly review drafts/submission, factual prefill metrics, history, and trends.
- Implement owner-scoped global search, activity history, and authenticated JSON/CSV exports.

Result: guided reviews, drafts/submission, factual prefill, trends, search RPC, activity history, and exports are implemented.

## Phase 7 — Quality and delivery

Status: in progress

- Complete responsive, keyboard, screen-reader, reduced-motion, empty, loading, and error states.
- Add unit, integration, RLS, and Playwright coverage for the acceptance workflows.
- Add CI, deployment documentation, and a final production verification pass.

## Validation gate

At the end of each phase run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Playwright and database integration tests require their documented dedicated environments and must never target production.
