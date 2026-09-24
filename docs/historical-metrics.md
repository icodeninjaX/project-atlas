# Phase 12 — Recorded historical metrics

- **Metric contract version:** 1
- **Implementation:** 2026-09-25
- **Hosted migration:** `20260924170800_add_historical_metrics.sql` applied to ProjectAtlas on 2026-09-25, before the application release. The Supabase connector assigned this online version; the repository filename matches it.

## Scope and definitions

`atlas_historical_metrics` recomputes from surviving source records at request time. It returns daily, ISO Monday weekly, or calendar monthly buckets for the last year, with a 90-day maximum for daily reads. The public RPC has no owner argument. It runs as the authenticated caller, uses `auth.uid()` on every source, and retains table RLS. The History page shows all six series; the Analyst tool requests one metric and at most twelve buckets. Values are never stored or sent as raw source rows to a model.

The same migration gives completed weekly reviews a dedicated Timeline trigger. The prior shared trigger accessed task fields before reaching its review branch and rejected review inserts; the dedicated trigger preserves the existing one-time completion event.

| Metric                   | Source and date                                                        | Value and exclusions                                                                              |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `income_centavos`        | Surviving income transactions; `transaction_date`                      | Sum of integer centavos; transfers excluded                                                       |
| `expense_centavos`       | Surviving expense transactions; `transaction_date`                     | Sum of integer centavos; transfers excluded                                                       |
| `debt_payments_centavos` | Surviving debt payments; `payment_date`                                | Sum of integer centavos; no historical balance claim                                              |
| `task_completions`       | Surviving tasks with status `completed`; `completed_at` in Asia/Manila | Count; reopened or deleted tasks cease to contribute; no past overdue count                       |
| `knowledge_reviews`      | Surviving review events; `reviewed_at` in Asia/Manila                  | Count; deleting a concept cascades to its reviews                                                 |
| `review_overall_score`   | Completed weekly reviews with a score; `week_start`                    | Arithmetic mean of recorded scores with `source_count` as denominator; missing scores remain null |

`period_start` and `period_end` describe the calendar bucket. The requested date bounds may clip the first or last bucket. `source_count` is the number of surviving records in the requested part of that bucket. `first_recorded_on` is the earliest surviving source date for that metric. `coverage` is `insufficient` before that date or for a missing review score, `partial` at a requested/calendar/current-day boundary or the first recorded bucket, and `recorded` otherwise. After the first source date, zero for event metrics means **zero recorded events**, not proof that no real activity occurred. Deletion can move the first source date forward and change prior coverage.

The UI displays each metric's source, calendar bucket, actual counted dates when clipped, source count, coverage and update time in a scrollable table. Source links lead to the existing module. Sensitive values follow the app's privacy mode. Analyst evidence uses the actual counted dates as its period and separately names the calendar bucket, version, source count, coverage, source link and bounded limitation. Unsupported buckets are omitted rather than turned into zeroes. A supported but partial current bucket can be explained with its partial label; a missing bucket keeps the tool result partial and the freeform explanation falls back to facts.

## Recalculation and limits

The RPC has no materialized cache. A backfilled source record, date or amount correction, reopened task, and deletion changes the next read deterministically. Source aggregation is limited to the requested dates; indexed owner-scoped lookups separately find each metric's earliest surviving record. It rejects unauthenticated callers, future periods, lookbacks beyond one year, unsupported grains and daily requests over 90 days. The Analyst tool additionally permits at most twelve calendar buckets per call. Client boundary validation rejects unsafe centavo integers and malformed aggregate responses.

Current account and debt balances, prior overdue counts, past goal progress, career stage conversion, Signal counts and cross-domain causal claims are outside this version. They require genuine event/snapshot coverage and separate definitions before any historical comparison. Hosted deployment and a hosted authenticated responsive browser flow remain separate release checks.

## Local acceptance — 2026-09-25

- Local database reset applied the migration; `npm run supabase:test` passed **159 assertions across 17 files**, including reconciliation of all six metrics, large exact centavo sums, score rounding, two-owner isolation, Manila timestamp boundaries, missing scores, period bounds, edit and delete recalculation, and completed review recording. The local security advisor reported no issues.
- `npm run test` passed **464 application tests** (13 skipped); `npm run lint`, `npm run typecheck`, `npm run format:check`, `git diff --check`, and the production build passed.
- All six opt-in live synthetic planner evaluations passed, including the new two-domain monthly history question. The planner uses two bounded `getHistoricalMetricSeries` calls without asking for a category ID. These synthetic evaluations contain no personal records.
- The History page passed authenticated Chromium desktop and mobile Playwright checks against a disposable account on the local stack. Both views showed the source/coverage tables, changed periods, and avoided page-level horizontal overflow. Daily selection exposed only the 30-day lookback.

The local browser checks used a production build pointed at the local Supabase stack. They do not establish hosted deployment state.

## Hosted database verification — 2026-09-25

The `add_historical_metrics` migration is applied to the ProjectAtlas Supabase project as version `20260924170800`. The repository migration file was renamed to the connector-assigned version, and a clean local database reset reapplied that exact file. Hosted catalog checks confirmed the invoker RPC, signed-in execute grant, anonymous denial, three indexes and dedicated review trigger. A transaction-only two-owner check reconciled income, expense and a completed review score while excluding the other owner's records. The transaction was rolled back, and all synthetic users and rows were confirmed absent. The hosted security advisor reported the same pre-existing notices recorded in the [Phase 11 rollout](hosted-phase11-rollout.md); it introduced no new Phase 12 finding.

The application deployment and authenticated hosted History page remain to be verified after the repository push. A real hosted freeform Analyst question consumes quota and sends user evidence to the model, so local synthetic evaluation and the hosted database checks are the current Analyst evidence without a disposable hosted account.
