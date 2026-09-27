# Weekly insight card

The Weekly reviews page has a **What changed this week** card. It writes a
short, evidence-checked note comparing this week so far with the same weekdays
last week (for example Monday–Thursday against Monday–Thursday), so a week in
progress is never compared with a full one.

## How it works

1. The user ticks the data-sharing checkbox and selects **Generate insight**.
   Nothing runs in the background or on a schedule.
2. `POST /api/reviews/insight` requires a signed-in user and explicit consent,
   then reserves one request from the freeform Analyst allowance
   (`reserve_ai_analyst_request_result`, type `freeform`) and audits the outcome
   with `finish_ai_analyst_request`. No new migration is needed.
3. `src/lib/reviews/insight.ts` calls the existing owner-scoped
   `getHistoricalMetricSeries` tool with fixed inputs: weekly grain, both
   windows, for expenses, income, debt payments and task completions. There is
   no planner call.
4. Every window must be covered in full: one complete fact whose period
   matches the requested dates. A window clipped to a first recorded day, or any
   partial result, makes the route return the facts without an AI note. Otherwise the fixed question and evidence go to the grounded answer
   step (`requestGroundedAnswer`), so every figure and comparison is verified
   against the cited evidence as described in
   [the freeform Analyst doc](analyst-freeform.md).
5. The card shows the claims (peso figures masked in privacy mode), the weekly
   facts and their limitations. Nothing is stored.

## Automatic last-week insight

The card also has a **Last week** section with an opt-in checkbox,
**Prepare last week's insight automatically**, stored as
`user_preferences.weekly_insight_auto` (off by default). Turning it on is
standing consent to send last week's totals to OpenAI once per week.

When it is on, the first visit to Weekly reviews in a new week calls
`POST /api/reviews/insight` with `{ "mode": "previous" }`. The route compares
the last full Monday–Sunday week with the week before, using the same fixed tool
calls and verified answer step.

Before any quota reservation or provider call, the route inserts a `pending`
claim row for the owner and week. The unique `(user_id, week_start)` constraint
makes the claim atomic, so concurrent first visits (two tabs) prepare the note
once; the other request sees "being prepared". The claim is then completed as
`answered`, `insufficient` or `failed`:

- A provider attempt is final for the week, even if the answer is rejected, so
  last week's totals are sent to OpenAI at most once per week.
- The claim is released (deleted) only when nothing was sent: a quota or
  reservation failure, or an evidence-gathering error. A later visit then
  retries.
- A claim still `pending` after two minutes was abandoned mid-request and reads
  as "could not be prepared", without a retry.
- If completing the claim fails, the pending row still blocks repeat attempts.

Later visits read the stored row server-side with no model call and no quota
use. The owner can still use **This week so far** at any time.

It runs in the owner's own session rather than a cron job. The historical
metrics RPC derives the owner from `auth.uid()` and keeps RLS in force, so a
background job would need a new service-role function that bypasses RLS.
Generation happens when the owner opens the page, with no click, at most once
per week.

### Database

Migration `20260927070000_weekly_insights.sql` adds the preference column and
the `weekly_insights` table: owner-only select, insert and delete under forced
RLS, a Monday `week_start`, JSON array checks, and a 64 KB payload
cap. The table is included in the JSON account export and cascades on account
deletion. Migration `20260927100000_weekly_insight_claims.sql` adds the `pending` and
`failed` statuses and an update policy that only lets the owner complete their
own `pending` claim to a final status; finished rows stay read-only.
`supabase/tests/weekly_insights.sql` covers the default, ownership, uniqueness,
Monday check, size cap, read/delete isolation, one claim per week, completing a
claim once and cross-owner completion. **Apply both migrations before deploying
this code**; otherwise the JSON export fails on the
missing table.
