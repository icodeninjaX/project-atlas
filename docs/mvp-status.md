# ATLAS MVP status

Last verified: 2026-08-26

## Executive summary

ATLAS is feature-complete for the scoped MVP and is in release-candidate validation. The application implements the end-to-end personal operating system promised in the repository: authentication and onboarding, the Today dashboard, tasks, goals and milestones, money and debt workflows, career tracking, weekly reviews, search and audit history, settings and security controls, reminders, and offline-first PWA behavior.

The remaining work is launch validation and environment configuration. It does not require adding another core product module.

## Implemented scope

| Area              | Current state                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation        | Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, responsive application shell, health route, loading/error/404 states, light/dark/system themes, and browser-local font selection.                         |
| Identity          | Supabase email/password auth, confirmation callback, recovery/reset, protected routes, onboarding, preserved deep links, session controls, TOTP MFA, email/password changes, and confirmed account deletion.                   |
| Today             | Data-driven daily route, deterministic priorities, financial snapshot, gratitude prompt, rotating wisdom, yesterday productivity report, privacy masking, and quick capture.                                                   |
| Tasks             | Create, edit, status, complete, and delete flows; Today, Upcoming, Overdue, Inbox, and Completed views; exact scheduling, conflict-aware time suggestions, Focus mode, completion feedback, and notifications.                 |
| Goals             | Create, edit, delete, status and category controls; rich-text milestone notes; milestone create/edit/complete/delete; milestone-derived progress; target dates; success definitions; and related tasks.                        |
| Money             | Account create/edit/archive/restore/delete, audited balance adjustment, income/expense create/edit/delete, transaction history, transfers, monthly budget planning, dashboard summaries, privacy masking, and CSV/JSON export. |
| Debts             | Create/edit, ordering strategies, payoff estimates with stated assumptions, payment create/delete with database-derived balances, paid/reopen behavior, and detail history.                                                    |
| Career            | Application create/edit, table and responsive Kanban views, customizable stage columns, guarded stage movement, next actions, overdue follow-ups, compensation metadata, and conversion summaries.                             |
| Reviews and audit | Weekly factual summaries, reflection drafts/submission/history/trends, owner-scoped search, filterable and paginated activity history, and authenticated export.                                                               |
| PWA and settings  | Install metadata, user-scoped page caches, offline fallback, IndexedDB mutation queue and idempotent replay, sync/storage controls, profile and preference persistence, privacy mode, reminders, and quiet hours.              |

## Verification snapshot

The following checks were run against the current working copy on 2026-08-26:

| Check                   | Result                                                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | Passed.                                                                                                                                                                     |
| `npm run typecheck`     | Passed; Next.js route types generated successfully.                                                                                                                         |
| `npm run test`          | Passed: 53 files and 193 tests.                                                                                                                                             |
| `npm run build`         | Passed with Next.js 16.3.2; 29 application routes generated.                                                                                                                |
| Chromium Playwright     | Passed: 19 public/PWA/edge/accessibility checks; 10 credential-dependent authenticated checks skipped; 0 failures.                                                          |
| Production smoke        | The public landing page, `/api/health`, and `/manifest.webmanifest` returned HTTP 200 at `https://atlas.kdvwebsiteservices.com`; health returned `Cache-Control: no-store`. |
| Database integration    | Not run in the latest local pass because the Docker daemon was unavailable.                                                                                                 |
| Repository format check | Not clean: the existing repository contains legacy Prettier drift outside the current MVP changes. CI does not currently gate on this command.                              |

## Launch gates

These are required before calling the release production-verified:

1. Apply the full migration chain to a disposable Supabase project and run every pgTAP test, including cross-user RLS, account balances, offline receipts, scheduled tasks, permanent archive deletion, and milestone-derived progress.
2. Configure a dedicated disposable E2E user and run the authenticated Playwright suite. Confirm deterministic cleanup and cross-user isolation without exposing credentials in reports or traces.
3. Configure production Auth URLs, SMTP, leaked-password protection where supported, service-role access, VAPID keys, `CRON_SECRET`, and edge rate limits. Re-run the deployment checklist.
4. Verify the latest commit in production across desktop and mobile, including sign-up/recovery, MFA, offline replay, exports, reminders, and account deletion.
5. Decide whether to normalize the legacy repository-wide Prettier drift before tagging the release; the current CI quality job already gates lint, type checking, unit tests, and the production build.

## Deferred beyond MVP

The following are useful enhancements but are not required to launch the scoped MVP:

- dedicated career application detail pages or drawers, bulk operations, and deeper reporting filters
- generated Supabase TypeScript database types
- expanded authenticated accessibility and visual-regression coverage
- richer calendar, recurring automation, attachment, knowledge, CRM, and AI-assisted workflows

The ordered post-MVP direction lives in [Future roadmap](future-roadmap.md).
