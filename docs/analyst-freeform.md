# Analyst 2.0 — Freeform Grounded Analysis (Phase 11)

Implemented locally and validated on 2026-09-25. The existing seven preset questions keep their
original endpoint and model selector. The new question box on `/analyst` uses
`POST /api/analyst/freeform` with the accepted Phase 10 planner and thirteen
Phase 9 read-only tools. It cannot execute actions or arbitrary queries.

## Request and evidence boundary

The route requires a signed-in user, a question of 8–500 characters and explicit
data-sharing acknowledgement. It reserves one request from the existing Analyst
allowance before any planner or answer model call. Migration
`20260924154545_analyst_freeform_quota.sql` adds `freeform` to the ledger's
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

## Grounded answer contract

The answer model returns one to four structured interpretation or suggestion
claims. Each claim must cite one to four supplied evidence IDs. Server validation
rejects missing or duplicate IDs, figures and currencies in prose, direct causal
and directional claims, categorical forecasts, unsupported certainty, and
suggestions based on incomplete evidence. The figures shown in the UI come from
ATLAS evidence, never model prose. These checks are deliberately conservative;
an invalid response falls back to the calculated evidence.

The answer call has a 14,000-character compact payload ceiling, 16,000-token
conservative input ceiling, 450 output-token ceiling, $0.003 estimated ceiling,
24,000-byte response ceiling and 12-second deadline. The planner retains its own
call, time, evidence and cost limits. One planner call and at most one answer call
occur per request. Typed failures cover clarification, unsupported questions,
insufficient evidence, context limits, provider/timeout errors and invalid
responses. The UI keeps retry available and places tap-friendly citations beside
claims; selecting one opens the evidence view.

The fixed cost calculation uses the [published GPT-4o mini text rates](https://developers.openai.com/api/docs/models/gpt-4o-mini)
reviewed on 2026-09-25: $0.15 per million input tokens and $0.60 per million
output tokens. A model or price change requires updating both planner and answer
budgets and their evaluations.

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
