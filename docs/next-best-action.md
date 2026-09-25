# Phase 16 — Next Best Action

**Implementation:** Local, 2026-09-25. Hosted migration, deployment, and authenticated production browser verification remain open.

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

The local `.env.local` points at a hosted Supabase project, so the browser test explicitly overrode it with the disposable local Supabase instance. No test account or record was created in the hosted project. Apply both migrations in order and verify a signed-in, data-rich flow in the intended release environment before calling Phase 16 deployed.
