# Analyst Query Planner — Phase 10

Implemented locally on 2026-09-24. The Query Planner is a server-only bridge from
a natural-language question to a validated, bounded plan and owner-scoped Phase 9
evidence. It does not generate an answer, change the existing seven-question
Analyst interface, expose a new route, or mutate records. Answer generation and
the production freeform experience remain Phase 11.

## Invocation and trust boundary

`src/lib/analyst/planner/server.ts` exports `runAnalystQueryPlanner(question)`.
This high-level entry point authenticates before a provider call, asks the fixed
planner model for a structured plan, revalidates the plan, and invokes only the
accepted Phase 9 registry. Each tool invocation authenticates again, derives its
owner on the server, applies explicit owner filters, and retains RLS as the final
boundary. No owner ID, database credential, SQL, table name, arbitrary URL or
mutation facility is available to the model.

The lower-level `requestAnalystPlan` provider boundary exists for synthetic
evaluation. Product integrations must use the authenticated high-level entry
point and must preserve the existing Analyst data-sharing disclosure and quota
reservation before exposing this capability in Phase 11.

The question, model output, stored records and returned tool text are untrusted
data. The model sees only the question, the Asia/Manila current date and the
static thirteen-tool catalog with input schemas. It never sees evidence in this
phase because it produces a retrieval plan, not an answer.

## Plan contract

The provider uses strict structured output with three dispositions:

- `plan`: one to four allowlisted calls, each with a unique ID, approved tool
  name and JSON-encoded arguments;
- `clarification`: a short question and zero calls; or
- `unsupported`: a short limitation, optional missing capabilities and zero
  calls.

ATLAS parses the argument JSON and validates it with the exact Phase 9 Zod schema.
Extra fields, owner IDs, invalid dates, invented tool names, unsafe money values,
duplicate calls and malformed arguments fail before retrieval. Entity, debt and
category IDs must appear literally in the question. A blocker or relationship
question about a named record without its ID requires clarification instead of a
guessed match or broad substitute retrieval.

Plans are validated a second time at the execution boundary. Approved calls run
independently through `invokeAnalystTool`; their order, result status, evidence and
limitations remain inspectable. One failure produces an explicit partial result
and cannot become a fabricated answer. Duplicate citation IDs or aggregate budget
overflow cause the affected result to fail closed.

## Operating limits

| Boundary                  |                                                                                         Limit |
| ------------------------- | --------------------------------------------------------------------------------------------: |
| Question                  |                                                                                500 characters |
| Authentication            |                                                                                     5 seconds |
| Model calls               |                                                                                             1 |
| Provider input            | 18,000 catalog/question characters and at most 16,000 conservatively estimated request tokens |
| Provider output           |                                                          500 tokens and 24,000 response bytes |
| Estimated provider cost   |                                                               3,000 micro-US-dollars ($0.003) |
| Model request             |                                                                                    12 seconds |
| Approved tool calls       |                                                                                             4 |
| Per-call arguments        |                                                               2,000 characters before parsing |
| Validated plan            |                                                                                  10,000 bytes |
| Whole-plan tool execution |                                                                                    11 seconds |
| Aggregate evidence        |                                                                     80 items and 96,000 bytes |
| Missing-capability labels |                                                                                             6 |

The planner is pinned to `gpt-4o-mini-2024-07-18` at temperature zero. The cost
ceiling uses the [model's standard text rates](https://developers.openai.com/api/docs/models/gpt-4o-mini)
reviewed on 2026-09-24: $0.15 per million input tokens and $0.60 per million
output tokens. The provider's reported
token counts are checked again before any tool executes. A pricing or model change
must update the fixed rates, model snapshot, evaluation record and budget together.

Operational metadata contains only the requested/resolved model, timestamps,
latency, provider status, token counts, estimated cost, approved tool names/counts,
evidence counts/bytes and typed outcomes. It contains no owner, question, prompt,
answer, evidence values or credentials and is not persisted or logged by default.

## Failures and evaluation

Typed planning failures distinguish invalid question, unauthenticated,
configuration, context/cost limits, authentication/model/provider errors, rate
limit, timeout, malformed response and invalid plan. Tool failures retain the
Phase 9 types, including invalid input, unavailable source, setup, timeout,
partial, insufficient history, stale data, invalid output and exceeded budget.

The versioned synthetic evaluation scorer checks disposition, required tools,
denied tools and retrieval economy separately. The live opt-in corpus covers
spending change, current goal/career snapshots, ambiguous Graph references,
missing sleep data and an SQL/deletion prompt injection. It uses synthetic text
only and never private user data.

Run the live evaluation in PowerShell only when an API key is intentionally
available:

```powershell
$env:ATLAS_PLANNER_LIVE_EVALS = '1'
npx vitest run src/lib/analyst/planner/planner.live.eval.test.ts
Remove-Item Env:ATLAS_PLANNER_LIVE_EVALS
```

## Acceptance and validation — 2026-09-24

Required environment: local application, local Supabase for the opt-in ownership
integration, and the configured OpenAI project for the synthetic live planner
evaluation. The pre-change baseline passed lint, typecheck, 417 application tests
with three opt-in checks skipped, the 37-page production build and formatting.

Focused contract, provider, execution and evaluation tests cover strict schemas,
denied tools, owner/argument injection, clarification, unsupported questions,
prompt isolation, provider failures, token/cost/response/context/call budgets,
authentication and execution deadlines, partial failures, citation deduplication
and deterministic evaluation scoring. The Phase 9 local integration suite adds a
two-owner plan execution through money and Graph tools.

The synthetic live evaluation passed all five cases after its blocker-reference
policy was tightened from observed evaluation evidence. Final integrated results:

- normal application suite: 444 passed, with nine opt-in tests skipped across 90
  files;
- local Tool Layer integration enabled: 448 passed, with the five live planner
  evaluations skipped across 90 files, including the new two-owner plan path;
- live synthetic planner evaluation: five of five passed with the pinned model;
- local database: 131 assertions across 16 pgTAP files passed; and
- lint, typecheck, the 37-page production build, repository formatting and
  `git diff --check`: passed.

## Release boundary and next work

There is no new route, UI, migration, dependency or persisted planner record, so
this phase adds no browser surface or deployment migration. Hosted adoption is
not verified. Phase 11 may integrate the planner into a freeform Analyst flow only
after preserving authentication, consent, quota reservation, answer/citation
validation, evidence fallback and the limits above. Mutations remain out of scope.
