# Phase 13 — Cross-domain and Longitudinal Analyst

**Implementation and production release:** 2026-09-25. This phase reuses the Phase 8 Graph, Phase 11 freeform Analyst and Phase 12 historical metrics RPC; it adds no migration or dependency.

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

## Local verification — 2026-09-25

Focused tests cover complete and sparse month comparisons, bounded input, linked task and transaction facts, owner filters, foreign or missing goal parity, literal goal IDs in planner plans, selected-goal route behavior, model citation separation and the goal picker. The full application suite, lint, typecheck, formatting and production build passed. Seven synthetic live planner cases and five synthetic live answer cases passed with the pinned model after the planner prompt explicitly distinguished supported recorded history from unavailable historical snapshots.

With Docker available, all five real local two-owner tool integration checks passed, including cross-domain history and goal-linked activity. The local database suite passed 159 pgTAP assertions across 17 files. A disposable local account completed the authenticated Analyst browser suite at desktop and mobile sizes; the selected-goal check verified the request's goal ID, current path evidence, and narrow layout. The account and its seeded records were removed. The final application run passed 472 tests (17 skipped), lint, typecheck, format, and production build. No hosted phase state is inferred from local code or synthetic provider tests.

## Production acceptance — 2026-09-25

The Supabase connector confirmed that ProjectAtlas already has the Phase 8 Graph, Phase 11 freeform quota, and Phase 12 historical metrics migrations. No Phase 13 schema change was needed. The historical metrics RPC remains security-invoker, executable by signed-in users, and denied to anonymous users. The hosted security advisor reported the same pre-existing notices documented for Phase 11; Phase 13 added no schema finding.

Commit `ddd8ad60aac1027032f4b5af08f32c444a3dfd0a` reached production through Vercel deployment `dpl_Ht2HH4ppnywqc9i3WiYR4iEENW2m` with the `atlas.kdvwebsiteservices.com` alias. GitHub CI run `36084741286` passed its quality job; its E2E job was skipped because CI has no disposable credentials. The local authenticated browser run above covered the new Phase 13 flow. Production `/api/health` returned 200, and an anonymous freeform POST returned 401. The signed-in Analyst page loaded the goal picker. Vercel reported no runtime errors on `/analyst` and `/api/analyst/freeform` in the checked hour after the live requests.

With the account owner's explicit approval, two live questions were submitted from the signed-in account, consuming two freeform allowances. The cross-domain month comparison returned five source-linked facts with month, source count, and coverage; it withheld an AI trend explanation because the requested history included incomplete months. The selected `Build a stronger portfolio` goal returned two cited milestone completion facts, each with a current native Graph path and record link. Its grounded explanation did not claim past goal progress, and the limitations explicitly stated that current paths do not establish when links began. These requests verify the hosted tool, planner, evidence, consent, and answer paths for the available account records; they do not establish a complete-month change claim for this account.
