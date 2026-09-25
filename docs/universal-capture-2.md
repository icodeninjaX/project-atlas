# Universal Capture 2.0 contract

- Phase: 17
- Local implementation: 2026-09-25
- Hosted state: Deployed and verified on 2026-09-25.

Capture accepts up to 1,000 characters and asks the selected model for one to five
independent proposals. Each proposal names an exact, nonoverlapping source phrase.
ATLAS rejects malformed batches and prepares every card from its own phrase, so an
amount or date in one action cannot populate another. The model never supplies a
record ID or writes to the database.

## Supported actions

- Create an expense or income transaction, task, career application, or knowledge
  concept through the existing domain action.
- Reschedule an existing open task. ATLAS retrieves at most 40 recent owner-scoped
  open tasks, ranks at most five matching titles, and requires a named choice when
  the match is ambiguous. Confirmation checks the selected ID, owner, open state,
  and `updated_at` version before updating the schedule.

Debt payments, account transfers, task completion, arbitrary edits, and other
intent-backlog entries stay unsupported until each has a safe preview and
confirmation contract. Unsupported cards show manual paths. A phrase such as
“Paid ₱2,500 to Billease” must not become a generic expense by default.

## Review and confirmation

The review shows each type, source phrase, warnings, editable fields, and candidate
record. Users can confirm or reject each card. “Confirm all” processes reviewed
cards in order, stopping at the first invalid or failed card. Earlier successful
actions remain saved; later cards remain unsaved. There is no claim of batch
atomicity or automatic rollback.

Previews are owner-scoped database records. A confirmation atomically claims one
pending preview before calling the existing deterministic domain action. A repeat,
expired preview, wrong operation, or foreign owner cannot claim it. Processing
previews cannot be replayed automatically after an uncertain failure, avoiding a
duplicate write. Domain records and the existing activity timeline are the audit
source; preview status is review state.

Preview confirmation expires after 30 minutes. A `pg_cron` job is scheduled to
remove expired preview rows every 30 minutes. Account deletion cascades to any remaining rows. The
Capture request quota continues to use its existing server-side reservation.
The database also caps each preview payload and active previews per owner.

## Local acceptance

- `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` passed.
- Application suite passed with 522 tests and 29 skips, including five opt-in
  synthetic live evaluation cases that also passed when run with a configured key.
- All three local migrations applied without resetting the database.
  `npx supabase test db` passed 186 assertions across 19 files, including owner
  isolation, atomic claim, duplicate rejection, payload limits, and retention
  scheduling.
- Five synthetic live model cases passed: mixed intent, ambiguous amount,
  unsupported transfer, instruction-like text, and task rescheduling.
- A disposable local account passed a signed-in Chromium review: two task cards
  on desktop, 320px layout without horizontal overflow, keyboard confirmation,
  two persisted tasks, an owner-resolved reschedule, and a mixed expense/task
  batch with an editable category and a persisted 38,000-centavo expense. The
  account was deleted after the check.

## Production acceptance

- Hosted project `pcdrusgiwhezfodabchp` applied migrations
  `20260925145457_capture_batch_previews`,
  `20260925145512_capture_preview_retention`, and
  `20260925145515_capture_preview_write_limits` before the app release. Local and
  hosted migration versions match.
- A hosted transaction with two synthetic owners verified owner-only reads,
  one-time claim and finish, and rejection of a foreign claim; it rolled back
  with no residual users or previews.
- GitHub CI [run 36151365201](https://github.com/icodeninjaX/project-atlas/actions/runs/36151365201)
  passed for implementation revision `a502abe`. Vercel deployment
  `dpl_4EM1sWxp8BeB2PEBEkFZefjSsFfE` is ready and assigned to
  [ATLAS production](https://atlas.kdvwebsiteservices.com); `/api/health`
  returned `ok`.
- A disposable hosted account passed two signed-in Chromium browser checks:
  desktop and 320px two-task review with keyboard confirmation, persisted
  tasks and reschedule, plus a mixed expense/task batch with a corrected
  category and a persisted 38,000-centavo expense. The account and all its
  task, transaction and preview records were removed after verification.
  Public test signup returned an email rate-limit response, so this account
  was provisioned directly for acceptance; signup/SMTP remains a separate
  [production Auth checklist](deployment.md) item.
- `atlas-capture-preview-prune` is active on `*/30 * * * *` and completed a
  successful hosted run at 2026-09-25 15:00 UTC.
- The [Supabase security advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
  flags the two authenticated Capture `SECURITY DEFINER` RPCs. Their exposure
  is intentional for atomic preview status changes; each checks `auth.uid()`,
  owner, state and allowed transition. Hosted owner-isolation tests passed.
  Earlier advisor findings on other tables/functions and leaked-password
  protection remain tracked in [MVP status](mvp-status.md) and the
  [security backlog](playwright-polish-backlog.md).

The Phase 6 Capture closeout checklist remains separate. Phase 17 acceptance
does not establish that all earlier single-action release scenarios passed.
