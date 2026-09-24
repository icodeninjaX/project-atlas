# Analyst Retrieval / Tool Layer — Phase 9

Implemented locally on 2026-09-24. This is an independent, server-only read layer.
It does not change the seven-question Analyst interface, run a model, plan queries,
write domain records, or expose a new route. Phase 10 is the Query Planner.

## Invocation and approved scope

`src/lib/analyst/tools/server.ts` exports `listAnalystTools()` and
`invokeAnalystTool(name, input)`. Invoke it in an authenticated server request.
The registry supplies JSON input schemas, descriptions and limits; the server
always runs the stricter Zod schemas, including period refinements. No caller
supplies an owner, database client, SQL, table name, execution budget or clock.

| Tool                     | Accepted input                                                   | Source and scope                                                                      |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `getSpendingChange`      | `{}`                                                             | Existing Analyst month comparison, including its unequal-month/missing-baseline rules |
| `getDebtProgress`        | `{}`                                                             | Current debts and reduction from original principal; no past balance reconstruction   |
| `getTaskFocus`           | `{}`                                                             | Existing priority/date focus ranking and open-task counts                             |
| `getGoalProgress`        | `{}`                                                             | Current active goals and milestone-derived progress                                   |
| `getCareerPipeline`      | `{}`                                                             | Current stages and overdue next actions, not conversions                              |
| `getWeeklyReviewMetrics` | `{}`                                                             | Latest twelve completed numeric reviews; written reflections excluded                 |
| `getSignals`             | `{}`                                                             | Existing deterministic Signals engine; type/severity evidence                         |
| `getMoneySummary`        | `from`, `through`, `kind: expense/income`, optional `categoryId` | Surviving recorded transactions; transfers excluded                                   |
| `getDebtPayments`        | `from`, `through`, optional `debtId`                             | Recorded payment amounts, not historical balances                                     |
| `getRelatedEntities`     | `entityType`, `entityId`, optional `limit` (1–20)                | Existing one-hop Graph helper; native/manual provenance preserved                     |
| `getTimelineEvents`      | `from`, `through`, optional `module`                             | One existing Timeline page, at most thirty events; no cursor recursion                |
| `getRunway`              | `{}`                                                             | Existing workspace loader and runway engine                                           |
| `runFinancialScenario`   | Explicit scenario fields below                                   | Existing scenario engine, with current owner-scoped runway sources                    |

Scenario input requires `monthlyIncomeCentavos` (integer or null to retain the
baseline), `monthlyExpenseChangeCentavos` (signed integer),
`oneTimePurchaseCentavos`, `extraDebtPayment` (null or `{debtId, amountCentavos}`),
and `targetMonths` (1–24). Input money magnitude is limited to 1 trillion centavos;
negative purchase, income and debt payment values are rejected. An unavailable
debt ID returns the same error whether missing, deleted or owned by someone else.
Scenarios return liquid funds, monthly needs/income/free cash flow, runway and
reserve targets. Debt payoff projections are not included in this initial output.

Dates are real ISO calendar dates in Asia/Manila, inclusive, ordered, no later
than today, and span at most 366 days. Snapshot tools accept no historical date
filter. Unsupported history tools are not registered. Historical task trends,
career conversion histories, general period comparisons and Knowledge metrics
remain candidate extensions, not claims of implemented history.

## Ownership, limits and failures

Every invocation creates a cookie-authenticated Supabase client, verifies identity
with `getUser`, and derives the owner on the server. Ordinary authentication token
refresh remains permitted. The dedicated tool transport permits only approved
table reads with explicit owner predicates and two existing invoker-secured RPCs:
`life_timeline` and `runway_monthly_totals`. RLS remains the final boundary.
There is no service-role client, arbitrary SQL, domain write or model request.

Existing Graph, Timeline and runway loaders accept an optional server-only client
so tools can share the bounded transport. Their ordinary UI callers retain their
existing behavior. Existing engines and Analyst retrieval rules are reused.

| Per-invocation budget                  | Limit                                                |
| -------------------------------------- | ---------------------------------------------------- |
| Database requests                      | 24                                                   |
| Accepted rows in a general source read | 500; a 501st sentinel fails closed                   |
| Total retrieved rows                   | 4,000                                                |
| Total source response bytes            | 1,000,000, checked while streaming                   |
| Elapsed execution                      | 10 seconds; abort network work and reject late reads |
| Returned evidence items                | 40                                                   |
| Returned evidence payload              | 48,000 bytes                                         |
| Source IDs per item                    | 20, explicitly a sample                              |
| Model calls / tokens / provider cost   | Zero                                                 |

Legacy larger query limits are clamped inside the dedicated transport. Exact
counts detect server-side truncation, including a server cap below a requested
Graph/Timeline lookahead. Explicit latest-twelve review scope and Graph/Timeline
lookahead retain their domain semantics. General capped sums are withheld rather
than reported as complete totals. Query/result budgets bound transport work;
they are not a claim that PostgreSQL scans only 500 physical rows for an aggregate.

Typed failures distinguish invalid input, expired authentication, unavailable
source, missing schema/grants/setup, timeout, partial retrieval, insufficient
history, stale fallback, invalid output and exceeded budgets. Raw provider/SQL
errors never appear in results. Old fallback budgets are rejected as stale by
runway tools; missing runway prerequisites do not become invented estimates.
No result is cached or persisted by the tool layer.

## Evidence contract

Each item retains the existing Analyst metric, value, unit, period, comparison
basis, source link/IDs and completeness, and adds:

- A deterministic citation ID derived from the tool, calculation version's
  current implementation, fact, period, source sample and assumptions. Changed
  facts cannot accidentally reuse the same citation within this version.
- Tool name, calculation version `1`, retrieval timestamp and
  `textTrust: untrusted_data` provenance.
- A `FACT`, `TREND`, `SCENARIO` or existing task-focus `RECOMMENDATION` label.
- Native/manual Graph relationship endpoints when applicable.

Money and counts must remain safe integers; all numeric values must be finite.
Evidence IDs must be unique, source references are validated UUIDs, and links
are restricted to local ATLAS modules. Private category names, Graph titles,
Timeline prose and scenario creditor/account names are excluded. Stored or
returned text is data, never an instruction. A future planner must preserve that
boundary and validate citations before sending prose to the user.

Completeness describes the specified recorded-data scope, not the completeness
of real life. Empty transaction periods mean zero recorded activity. Deleted
records, absent links, missing review scores, differing comparison periods and
missing historical snapshots retain their limitations. Retrieval time is not a
claim that a user updated a record recently. Timeline source deletion and page
coverage remain visible. Runway evidence identifies baseline/income fallback and
included months; scenarios include all explicit assumptions.

Metadata contains only version, start time, duration, request/row/evidence counts
and zero model/token/cost fields. It contains no owner ID, prompt, answer, private
evidence or credentials. Nothing is logged or persisted by default. Planner-wide
call/context/cost budgets and observability persistence policy belong to Phase 10
or later explicitly scoped work.

## Acceptance and validation — 2026-09-24

Required environment for this task: local application and local Supabase. Baseline
revision: `c3c53e7`, with the two approved roadmap renumbering edits already present.
Before implementation, lint, typecheck, 358 tests, production build, repository
formatting and all 131 local database assertions passed. No baseline debt was
waived. Existing Capture action/proposal/component checks and Analyst/Graph tests
were included. The required underlying schema is already in the repository;
this phase adds no migration or dependency.

| Acceptance                        | Evidence                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Independent invocation without AI | Registry tests and real local invocation of every tool                                                                   |
| Owner isolation                   | Real authenticated two-user money, Graph, Timeline and scenario-target checks; owner-filter and missing/foreign-ID tests |
| Deterministic calculations        | Existing engine suites plus explicit centavo/scenario expectations and no-source-mutation checks                         |
| Bounded retrieval                 | Query, row, streaming-byte, deadline, lookahead, server-cap and RPC-wire regression tests                                |
| Honest evidence                   | Missing history, stale budget, partial/no-total, citation/period, source deletion and unsupported-tool cases             |
| Injection/privacy                 | Stored hostile category/Timeline text, extra input fields, raw-SQL attempts, safe errors and metadata checks             |
| Compatibility                     | Real local REST/RPC reads, full application suite, local pgTAP, typecheck and build                                      |

The local integration suite is opt-in because it creates two disposable accounts
and synthetic records. It discovers credentials only in process memory, rejects
non-loopback targets, and removes only its own fixtures. Run in PowerShell:

```powershell
$env:ATLAS_TOOL_LOCAL_TESTS = '1'
npm run test
Remove-Item Env:ATLAS_TOOL_LOCAL_TESTS
```

Final integrated validation on 2026-09-24:

- `ATLAS_TOOL_LOCAL_TESTS=1 npm run test`: **420 tests passed in 85 files**,
  including 62 new Tool Layer checks (three real local integration tests).
  The normal suite skips those three opt-in local tests; they were explicitly
  enabled for this acceptance run.
- `npm run lint`, `npm run typecheck`, `npm run build` and
  `npm run format:check`: passed. The build retained the existing 37 pages.
- `npm run supabase:test`: **131 assertions across 16 files passed** on the
  local stack, including existing ownership, Graph, Timeline, runway, Capture
  and Analyst schema checks.
- Independent read-only code review identified session-refresh and smaller
  server-cap cases; both were corrected and covered by tests. Real local RPC
  testing identified a request-wrapper method/body loss; the corrected transport
  preserves and tests the exact method, parameters and authentication headers.
- Documentation numbering, local anchors and `git diff --check`: checked.

The change set consists of the Tool Layer contract/transport/adapters/entry point,
their tests, optional bounded-client injection in existing loaders, the Supabase
client's optional fetch hook, a Vitest server-only alias and these documentation
updates. All pre-existing roadmap renumbering edits were preserved. No new
baseline regression remains in the checks above.

## Release boundaries and next work

No new surface requires mobile/browser acceptance in this phase; existing UI
behavior is unchanged. This task does not close the earlier hosted Capture flow,
Analyst route/schema/browser or Graph rollout gates. Local success is not hosted
deployment proof. Before hosted adoption, verify relevant schema, RPC/grants and
the authenticated application revision there. No deployment, migration, commit
or push was performed.

Phase 10's [Analyst Query Planner](analyst-query-planner.md) now uses only this
accepted registry. Next implementation: **Phase 11 — Freeform Grounded Analysis**.
Keep mutations behind their separately authorized proposal/confirmation flow.
