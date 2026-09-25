# Universal Capture 2.0 contract

- Phase: 17
- Local implementation: 2026-09-25
- Hosted state: Not deployed or verified.

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

## Release boundary

The hosted application and migrations are unverified. Apply all three migrations before
deploying the new Capture page, confirm `pg_cron` runs in the target database, and
repeat an authenticated hosted batch review with a disposable account. Keep the
Phase 6 Capture closeout checklist separate; this implementation does not prove
that earlier hosted Capture acceptance items are closed.
