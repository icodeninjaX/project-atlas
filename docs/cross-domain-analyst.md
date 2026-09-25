# Phase 13 — Cross-domain and Longitudinal Analyst

**Implementation:** Local code, 2026-09-25. **Release state:** Hosted rollout and authenticated browser acceptance pending. This phase reuses the Phase 8 Graph, Phase 11 freeform Analyst and Phase 12 historical metrics RPC; it adds no migration or dependency.

## Supported analysis

`getCrossDomainHistory` reads two different whole-domain metrics across two to six calendar months from the version 1 `atlas_historical_metrics` RPC. It returns each recorded bucket with its source count, coverage, period, source link and definition. It calculates a first-to-last difference only when every bucket is complete and each endpoint month has at least two contributing records for both metrics. A clipped month, missing history or sparse endpoint returns facts with a partial status and no change claim. The freeform route then shows the deterministic facts without asking a model to explain an incomplete comparison. This is parallel observation, not an association or causal finding.

`getGoalLinkedActivity` accepts a literal selected goal ID and an explicit period within the past year. It resolves current one-hop native and manual Graph paths, then reads surviving linked task and milestone completions and income or expense transactions with explicit owner filters. Each dated fact carries its current relationship path and a source link. A link without dated activity is shown as current context; absent links and deleted or unrecorded sources never become claims of inactivity. More than twelve links yields partial evidence. A current link does not establish when the relationship began. The tool never reconstructs historical goal progress or a goal stall.

The Analyst page offers an optional goal picker. The server verifies that the selected goal belongs to the signed-in user before consuming Analyst quota, then adds its ID to the planner question. A goal-specific answer requires the goal activity tool; the answer model receives only goal activity evidence when a goal is selected. Whole-domain metrics remain visible as separately labeled facts, but cannot be cited together with goal activity in one claim. Existing consent, quota, tool limits, source validation and evidence-only fallback still apply. The seven preset questions are unchanged.

## Boundaries and limitations

- Historical metrics recompute from surviving records at request time. The Phase 12 source, calendar, Manila date and coverage definitions remain authoritative.
- Whole-domain changes are never attributed to a goal. Goal-linked facts describe today's links and records dated in the requested period, not historical relationship state.
- Past goal progress, historical balances, past overdue counts, inferred associations, causal claims and advice based on incomplete evidence remain unsupported.
- The evidence cards show periods, coverage, calculation basis, source links and current relationship path types on narrow and wide layouts.
- No private titles, descriptions or raw source IDs are sent to the answer model. The planner sees only the question, selected goal ID when provided, and approved tool schemas.

## Local verification and release boundary — 2026-09-25

Focused tests cover complete and sparse month comparisons, bounded input, linked task and transaction facts, owner filters, foreign or missing goal parity, literal goal IDs in planner plans, selected-goal route behavior, model citation separation and the goal picker. The full application suite, lint, typecheck, formatting and production build passed. Seven synthetic live planner cases and five synthetic live answer cases passed with the pinned model after the planner prompt explicitly distinguished supported recorded history from unavailable historical snapshots.

With Docker available, all five real local two-owner tool integration checks passed, including cross-domain history and goal-linked activity. The local database suite passed 159 pgTAP assertions across 17 files. A disposable local account completed the authenticated Analyst browser suite at desktop and mobile sizes; the selected-goal check verified the request's goal ID, current path evidence, and narrow layout. The account and its seeded records were removed. Hosted deployment and signed-in verification remain release acceptance work. No hosted phase state is inferred from local code or synthetic provider tests.
