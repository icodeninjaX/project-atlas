# Phase 16 — Next Best Action

**Implementation and production release:** 2026-09-25.

## Delivered scope

Today offers up to two application follow-up proposals selected by the existing Dayline rank. An application must have a follow-up date within Dayline's window and a nonterminal stage. Each card shows the proposed task, Dayline reason and urgency, a link to the application, any owner-scoped Graph goal links, and a reminder that plans outside ATLAS may have changed. No score or new AI ranking is introduced. The user can open the source, dismiss the proposal, or review and explicitly confirm task creation. There is no external contact or automatic financial action.

The confirmation creates a high-priority task scheduled for the recorded follow-up date or today when overdue. A database function locks and rechecks the signed-in owner's application, stage, follow-up date and update timestamp before writing. One owner/application/follow-up date choice prevents repeated confirmation from creating duplicate tasks. A dismissal is stored without creating a task. A changed or deleted application is rejected as stale. The client cannot directly insert choices, and the function does not accept a user ID. A refreshed proposal can appear after the application follow-up date changes.

This first action type uses existing Dayline priorities and recorded career data. It does not claim an objectively optimal action. Task, debt, goal, scenario, or grouped follow-up proposals are not part of this implementation. The new application-specific timeline trigger preserves application and stage events while avoiding a shared-trigger field error found during local acceptance.

## Local acceptance — 2026-09-25

- The migration applied to the existing local Supabase database without a reset.
- The full database suite passed: 170 assertions. New checks covered owner isolation, stale and terminal application state, explicit confirmation, dismissal, a scheduled task, duplicate prevention, and lack of direct choice insertion.
- The full application suite passed: 506 tests (24 skipped). Focused proposal and component tests covered ranking order, no-action cases, Graph goal labels, source evidence, review/cancel, confirmation and dismissal.
- A disposable signed-in local account passed the Chromium review at 1280px and 320px. The browser check confirmed the source link, cancellation without a task, and confirmation creating one task; the account was deleted afterward.
- Lint, typecheck, formatting, and production build passed.

The local browser test explicitly used the disposable local Supabase instance even though `.env.local` points at the hosted project.

## Production acceptance — 2026-09-25

- Applied `20260925130000_next_best_action.sql` and `20260925130100_fix_application_timeline_trigger.sql` to the hosted ProjectAtlas database in order. Hosted migration history matches the repository versions. The choice table, RPC, and application timeline trigger were inspected. Anonymous RPC execution and direct authenticated choice insertion are denied.
- A hosted transactional two-owner database check rejected a foreign confirmation, created one task for the owner, and returned `already_confirmed` for a repeat. Its synthetic rows were rolled back.
- Commit `c2cc09a43d8f6aea732fe54f0b3efa76516188cc` reached the production alias through Vercel deployment `dpl_CcLjjn3uYrzDzALxh8dPn3uBei3e` in the READY state. GitHub CI run `36144033900` passed its quality job; CI E2E was skipped because it has no disposable credentials. Production `/api/health` returned 200 with `Cache-Control: no-store`, and the deployment error scan found no errors.
- A disposable hosted account signed in and created two follow-up applications. The dashboard showed two proposals at desktop and 320px, with no horizontal overflow. Review and cancel left the proposal available. Confirmation created one task; dismissal stored the other choice. The initial browser run exceeded its overall 30-second test limit after the dismissal click, before its toast assertion. Hosted database inspection confirmed one `confirmed` choice with one task and one `dismissed` choice without a task. A separate signed-in browser run passed after reload: both proposals remained resolved and the task appeared in Tasks at 320px.
- The disposable account and its two applications, task, and choices were deleted. Hosted counts for that account were all zero afterward. The production runtime error scan found no dashboard errors during the release check.

The hosted security advisor still reports existing internal-table RLS and signed-in `SECURITY DEFINER` warnings, plus disabled leaked-password protection. The new authenticated choice RPC is also flagged as a signed-in definer function; its owner and state checks, restricted execute grant, and atomic choice/task write were verified for this phase. Broader production security configuration remains tracked in [MVP status](mvp-status.md).
