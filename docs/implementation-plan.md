# ATLAS implementation plan

Last reviewed: 2026-08-26

Release state: **MVP feature-complete; production validation in progress.** The current evidence and launch gates are tracked in [MVP status](mvp-status.md).

Status legend: planned, in progress, complete, blocked.

## Phase 1 — Foundation

Status: complete

- Scaffold Next.js 16 App Router with strict TypeScript, Tailwind CSS v4, ESLint, Prettier, Vitest, and Playwright.
- Establish the ATLAS design system, responsive application shell, light/dark themes, loading/error states, health endpoint, and environment validation.
- Add lazy browser/server Supabase clients so builds do not require live credentials.
- Validate with lint, type checking, unit tests, and a production build.

Result: foundation code and production build are implemented. Final full-suite verification is repeated in Phase 7.

## Phase 2 — Database and authentication

Status: implementation complete; clean database execution pending

- Create PostgreSQL migrations for every MVP entity, constraints, indexes, timestamp triggers, debt/account invariants, activity history, search, offline receipts, reminders, settings, scheduled tasks, account adjustments, and milestone-derived progress.
- Enable RLS and add owner-scoped policies with `USING` and `WITH CHECK`.
- Add email/password authentication, password recovery, protected routes, profile provisioning, onboarding, session scope controls, TOTP MFA, and confirmed account deletion.
- Add SQL security and invariant tests for cross-user isolation and database-owned calculations.

Result: the full migration chain, auth UI, proxy, recovery/reset, onboarding RPC, security settings, and pgTAP suites are present. Applying the chain from zero and running pgTAP remain launch gates because the Docker daemon was unavailable during the latest local verification.

## Phase 3 — Tasks and goals

Status: complete for MVP

- Implement task capture and Today, Upcoming, Overdue, Inbox, and Completed views.
- Implement goal CRUD, milestones, related tasks, progress, filters, and dashboard summaries.
- Add keyboard shortcuts and rollback-safe interactions.

Result: task create/edit/status/delete, exact scheduling, time recommendations, Focus mode, completion feedback, goal CRUD, rich milestone management, milestone-derived progress, category colors, related tasks, dashboard summaries, keyboard shortcuts, and offline-safe mutations are implemented.

## Phase 4 — Money and debts

Status: complete for MVP

- Implement accounts, categories, auditable transactions, budgets, filtering, summaries, and accessible charts.
- Implement debts, payment history, atomic balance recalculation, strategies, and payoff projections with stated assumptions.
- Unit-test all money and debt calculations before implementation.

Result: account create/edit/archive/restore/permanent-delete, auditable balance adjustment, income/expense create/edit/delete and history, transfer entry, budgets, debt create/edit, payment history, strategies, projections, privacy masking, and exports are implemented. Bulk operations and deeper reporting filters are post-MVP enhancements.

## Phase 5 — Career tracker

Status: complete for MVP

- Implement application table, Kanban view, detail flow, stage events, next actions, filtering, and conversion metrics.

Result: creation and editing, table and responsive Kanban views, customizable stage columns, stage events, next actions, overdue states, salary ranges, and guarded conversion metrics are implemented. A dedicated detail surface, bulk actions, and advanced reporting filters are deferred beyond MVP.

## Phase 6 — Weekly reviews and search

Status: complete for MVP

- Implement weekly review drafts/submission, factual prefill metrics, history, and trends.
- Implement owner-scoped global search, activity history, and authenticated JSON/CSV exports.

Result: guided reviews, drafts/submission, factual prefill, trends, search RPC, activity history, and exports are implemented.

## Phase 7 — Quality and delivery

Status: implementation complete; launch validation in progress

- Complete responsive, keyboard, screen-reader, reduced-motion, empty, loading, and error states.
- Add unit, integration, RLS, and Playwright coverage for the acceptance workflows.
- Add CI, deployment documentation, and a final production verification pass.

Result: the responsive shell and product states are implemented; public routes have automated Axe checks; the local lint, type, unit, build, and credential-free Chromium Playwright gates pass; CI and deployment documentation are present. Authenticated Playwright, clean-database pgTAP, production Auth/security configuration, and a final production pass remain launch gates.

## Validation gate

At the end of each phase run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Playwright and database integration tests require their documented dedicated environments and must never target production.

The repository-wide `format:check` currently reports legacy formatting drift in unchanged files. The active CI quality job gates lint, type checking, unit tests, and the production build; the format baseline should be normalized in a separate mechanical cleanup.
