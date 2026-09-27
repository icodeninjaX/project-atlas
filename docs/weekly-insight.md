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
4. If any window is not fully available, the route returns the facts without an
   AI note. Otherwise the fixed question and evidence go to the grounded answer
   step (`requestGroundedAnswer`), so every figure and comparison is verified
   against the cited evidence as described in
   [the freeform Analyst doc](analyst-freeform.md).
5. The card shows the claims (peso figures masked in privacy mode), the weekly
   facts and their limitations. Nothing is stored.

## Why on demand

A scheduled job would send personal totals to OpenAI without a per-request
acknowledgement and would need a table for stored notes. The on-demand card
keeps the Analyst's consent model. A scheduled version can reuse
`gatherWeeklyInsightEvidence` if an opt-in setting and storage are added later.
