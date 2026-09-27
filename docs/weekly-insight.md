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
calls and verified answer step, and stores the result in `weekly_insights`
(one row per owner and week). Later visits read the stored row with no model
call and no quota use. An incomplete week is stored as `insufficient` so it is
not retried every visit; a provider failure is not stored, so the next visit
retries it.

It runs in the owner's own session rather than a cron job. The historical
metrics RPC derives the owner from `auth.uid()` and keeps RLS in force, so a
background job would need a new service-role function that bypasses RLS.
Generation happens when the owner opens the page, with no click, at most once
per week.

### Database

Migration `20260927070000_weekly_insights.sql` adds the preference column and
the `weekly_insights` table: owner-only select, insert and delete under forced
RLS, no update, a Monday `week_start`, JSON array checks, and a 64 KB payload
cap. The table is included in the JSON account export and cascades on account
deletion. `supabase/tests/weekly_insights.sql` covers the default, ownership,
uniqueness, Monday check, size cap and read/delete isolation. **Apply the
migration before deploying this code**; otherwise the JSON export fails on the
missing table.
