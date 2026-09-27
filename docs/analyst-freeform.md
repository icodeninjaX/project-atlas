# Analyst 2.0 — Freeform Grounded Analysis (Phase 11)

Implemented locally and validated on 2026-09-25. The existing seven preset questions keep their
original endpoint and model selector. The new question box on `/analyst` uses
`POST /api/analyst/freeform` with the accepted Phase 10 planner and thirteen
Phase 9 read-only tools. It cannot execute actions or arbitrary queries.

## Request and evidence boundary

The route requires a signed-in user, a question of 8–500 characters and explicit
data-sharing acknowledgement. It reserves one request from the existing Analyst
allowance before any planner or answer model call. Migration
`20260924161640_analyst_freeform_quota.sql` adds `freeform` to the ledger's
analysis types and typed reservation RPC; the same hourly, daily and site-wide
limits apply. The reservation model is the pinned `gpt-4o-mini-2024-07-18` used
by both planner and answer generation. No prompt, question, evidence or answer is
stored in the ledger.

The planner authenticates again and invokes only approved tools. Every tool
derives the owner server-side, applies owner filters and retains RLS. The model
receives no credentials, SQL access, table names, arbitrary URLs or write tools.
The question and retrieved text are untrusted. The answer model receives at most
12 compact evidence items without source record IDs or links. ATLAS displays all
planner evidence, including periods, calculation basis, completeness, record
links and limitations. It never treats partial tool results as a complete answer.

## Named goal and debt resolution

When no goal or debt is selected, the route loads the owner's goal titles and
active debt creditor names (up to 100 and 50) and checks whether the question
names exactly one of them as a whole phrase (`src/lib/analyst/freeform/mentions.ts`).
A single match is passed to the planner as the literal selected ID, and then
goes through the same selected-goal or selected-debt rules. Goals are not
resolved for pattern or scenario questions. Debts are resolved only for monthly
scenario questions. Ambiguous names, or questions naming both a goal and a
debt, keep the existing clarification path. The answer includes
`matchedEntity` so the UI can show what was matched. Peso figures in claim text
are masked when privacy mode is on.

## Grounded answer contract

The answer model returns one to four structured observation, interpretation or
suggestion claims. Each claim must cite one to four supplied evidence IDs.
Server validation (`src/lib/analyst/freeform/verify.ts`) checks prose against
the cited evidence instead of banning figures outright:

- Every number must be reproducible from a cited item: its value (money as
  shown in the supplied `display` string or rounded to whole pesos), a
  difference between two cited values of the same unit, a percent change
  between them, a number in a cited metric label, or a year of a cited period.
  ISO dates must be cited period dates. Magnitude suffixes (`k`, `M`) and
  number words (`thousand`, `double`) are rejected.
- Directional words (higher, lower, increased, fell, unchanged…) require a
  structured `comparison` of two cited same-unit items whose values confirm
  the stated direction.
- Causal language, forecasts, certainty, significance/strength, superlatives,
  suggestions from incomplete evidence, and scenario recommendations remain
  rejected. Scenario answers must cite a Current and an Option item.

The UI still shows every figure from ATLAS evidence alongside the claims. An
invalid response falls back to the calculated evidence.

The answer call has a 14,000-character compact payload ceiling, 16,000-token
conservative input ceiling, 700 output-token ceiling, $0.003 estimated ceiling,
24,000-byte response ceiling and 12-second deadline. The planner retains its own
call, time, evidence and cost limits. One planner call and at most one answer call
occur per request. Typed failures cover clarification, unsupported questions,
insufficient evidence, context limits, provider/timeout errors and invalid
responses. The UI keeps retry available and places tap-friendly citations beside
claims; selecting one opens the evidence view.

Planner and answer budgets use `AI_MODEL_PRICING` in `src/lib/ai/models.ts`,
which holds the [published GPT-4o mini text rates](https://developers.openai.com/api/docs/models/gpt-4o-mini)
reviewed on 2026-09-25: $0.15 per million input tokens and $0.60 per million
output tokens. A model without an entry fails with `configuration_error` before
any provider call. To try another planner or answer model, add its published
rates, update `AI_MODELS`, and rerun the live planner and answer evaluations.
Both calls go through `src/lib/ai/openai.ts`. It sends `reasoning_effort`
instead of `temperature` to reasoning models, which reject a temperature
setting.

## Local acceptance and release boundary — 2026-09-25

Focused route, answer and component tests cover authentication, consent, quota,
planner clarification, incomplete tools, evidence fallback, provider limits,
invalid citations and unsafe prose. The opt-in synthetic live answer evaluation
passed three cases: financial context without causal invention, cross-domain
attention and stored-text injection. The accepted Phase 10 planner evaluation and
two-owner tool integration remain the planning and retrieval evidence.

The local quota migration applied successfully. All 132 pgTAP assertions passed,
including the new freeform reservation and shared allowance check; the local
security advisor reported no issues. Desktop and mobile authenticated browser
tests passed eight of eight checks against a local production build with a
disposable account and mocked Analyst responses. The account was deleted after
the run. The full application suite passed 455 tests with 12 opt-in tests
skipped across 94 files. Lint, typecheck, repository formatting and the
production build passed. The separate three-case synthetic live
evaluation passed.

The hosted quota migration, database permissions and shared allowance, production
commit, and authenticated freeform flow were verified on 2026-09-25. With explicit
user approval, one real goal-progress question from the main account returned
grounded claims, working citations, source links and limitations. The narrow
screen had no horizontal overflow. See the
[hosted rollout record](hosted-phase11-rollout.md). Local browser checks use
mocked API responses; they prove
consent, citation/source interaction and responsive layout, while the synthetic
live evaluation proves the answer provider path. Freeform remains limited to
approved current evidence and available history. The later Historical Metrics
phase must not infer past state from current snapshots. Citation validation proves
that cited IDs were supplied; it cannot prove every qualitative connection is
semantically correct. The conservative prose rules and evidence fallback bound
that remaining model risk.

To rerun the synthetic live evaluation with an intentionally configured key:

```powershell
$env:ATLAS_FREEFORM_LIVE_EVALS = '1'
npx vitest run src/lib/analyst/freeform/answer.live.eval.test.ts
Remove-Item Env:ATLAS_FREEFORM_LIVE_EVALS
```
