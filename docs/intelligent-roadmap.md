# ATLAS Intelligent Roadmap

**Project:** ATLAS — Personal Operating System\
**Repository:** `icodeninjaX/project-atlas`\
**Last reviewed:** 2026-09-25\
**Purpose:** Give an AI coding agent a clear, sequential roadmap for evolving ATLAS from a structured personal tracker into a connected and increasingly intelligent personal operating system.

---

# 1. Product Direction

ATLAS should not become a collection of unrelated mini-apps.

The long-term direction is:

> **ATLAS is a personal intelligence system that understands the user's structured reality, detects meaningful patterns, connects life domains, explains change, supports decisions, and proposes useful next actions while leaving the user in control.**

The core rule is:

> **ATLAS owns the facts. AI helps interpret them.**

Deterministic calculations, balances, deadlines, trends, scoring rules, permissions, and source-of-truth records should remain normal application logic wherever possible.

AI should understand, classify, retrieve, connect, explain, compare, summarize, reason, and propose. Deterministic ATLAS services calculate, validate, mutate, enforce ownership and business rules, and execute confirmed actions. An LLM is never the source of truth for money, dates, budgets, goal progress, scenarios, task state, or other business facts.

---

# 2. Current Product Foundation

ATLAS already includes or substantially includes:

- Authentication and onboarding
- Today dashboard
- Capacity-aware Dayline priorities
- Money/accounts/transactions/budgets
- Debt tracking and payoff calculations
- Tasks
- Goals and milestones
- Career application tracking
- Weekly reviews
- Search
- Activity history
- Export
- PWA/offline capabilities
- Privacy controls
- MFA
- Push reminder infrastructure
- Responsive ATLAS design system

The existing stack includes:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL/Auth
- Zod
- React Hook Form
- Recharts
- Vitest
- Playwright
- Vercel

Before implementing each roadmap phase, inspect the actual repository and reuse existing architecture, patterns, utilities, styles, data access, validation, and tests.

Do not blindly trust roadmap documents if the codebase has already moved ahead of them.

---

# 3. Roadmap Principles

Every phase should follow these rules:

1. **Accept scoped work and clear required closeout blockers before the next delivery priority.** Delivery priority and hard prerequisites are defined separately below.
2. **Do not introduce AI unless the phase explicitly requires it.**
3. **Prefer deterministic, explainable logic.**
4. **Avoid hidden scores and unexplained recommendations.**
5. **Never duplicate source-of-truth calculations in the client.**
6. **Respect Supabase RLS and server-side identity.**
7. **Do not accept client-provided user IDs as authoritative.**
8. **Keep private data private.**
9. **Use Asia/Manila for user-facing date logic.**
10. **Use integer centavos for money.**
11. **Keep UI consistent with the current ATLAS design language.**
12. **Do not add large frameworks or dependencies without strong justification.**
13. **Add tests for every meaningful business rule.**
14. **Do not redesign unrelated modules while implementing a feature.**
15. **Stop scope creep.**
16. **Treat mobile as a first-class experience.** Every new or changed product
    surface must preserve clear hierarchy, touch-friendly controls, readable
    explanations, and usable loading, empty, and error states on narrow screens.

---

# 4. Phase Sequence

The original foundation sequence is retained (Phases 1–8). Do not rebuild delivered phases:

1. **Signals**
2. **Capacity-Aware Dayline**
3. **Personal Runway & Financial Scenarios**
4. **Life Timeline**
5. **Knowledge & Spaced Repetition**
6. **Universal Capture**
7. **ATLAS Analyst**
8. **ATLAS Graph**

The foundation ordering is intentional. Remaining work follows the delivery-priority table in Section 10. Original phase briefs, examples and prompts below are retained as historical design context, not instructions to rebuild delivered modules. Their examples do not override implemented scope or justify unsupported historical claims.

ATLAS should first become better at **detecting**, then **prioritizing**, then **simulating**, then **remembering**, then **teaching**, then **understanding natural language**, then **reasoning with AI**, and only after that become deeply **connected across domains**.

## Current Delivery Status

Implementation, local validation, deployment, and hosted verification are separate
states. “Recorded” means existing implementation reports, **not tests rerun in this
documentation task**. Earlier dated paragraphs preserve historical results; this
summary takes precedence for current next-action guidance.

| Phase                                       | Implementation                                                             | Local validation evidence                                                                                                                                                                                                       | Hosted deployment / verification                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Signals                                  | Implemented, 2026-08-26                                                    | Recorded verified on that date                                                                                                                                                                                                  | Hosted state not verified in this review                                                                                                                                          |
| 2. Capacity-Aware Dayline                   | Implemented, 2026-09-04                                                    | Application checks recorded; original DB/mobile follow-ups need reconciliation with later full-suite records                                                                                                                    | Hosted state not verified                                                                                                                                                         |
| 3. Personal Runway & Financial Scenarios    | Implemented, 2026-09-05                                                    | 242 tests and application checks recorded; later full-suite records exist                                                                                                                                                       | Migration verified 2026-09-05 per phase record; full hosted flow verification pending                                                                                             |
| 4. Life Timeline                            | Implemented, 2026-09-05                                                    | Application checks recorded; original DB/browser follow-ups need reconciliation with later records                                                                                                                              | Hosted state not verified                                                                                                                                                         |
| 5. Knowledge & Spaced Repetition            | Implemented, 2026-09-06                                                    | Application and ownership checks recorded; later clean local reset recorded in Analyst validation                                                                                                                               | Hosted migration verification recorded 2026-09-06; full hosted flow verification pending                                                                                          |
| 6. Universal Capture                        | Five single-action intents implemented locally; closeout open              | Live structured-output smoke and local pgTAP recorded 2026-09-24; release-flow verification pending                                                                                                                             | Hosted state not verified                                                                                                                                                         |
| 7. ATLAS Analyst                            | Seven bounded questions and typed reservation handling implemented locally | 20 focused route / 343 full tests and local DB checks recorded 2026-09-24                                                                                                                                                       | Two reservation migrations and synthetic live model smoke verified per Analyst record; deployed application revision and full hosted authenticated browser flow not verified here |
| 8. ATLAS Graph                              | Implemented locally, 2026-09-24                                            | Local acceptance recorded: 358 unit/component tests, 131 DB assertions, Graph mobile/desktop E2E and static/build checks                                                                                                        | Hosted state not verified; local migration is not hosted deployment proof                                                                                                         |
| 9. Analyst Retrieval / Tool Layer           | Implemented locally, 2026-09-24                                            | Fresh local application, contract and two-owner REST/RPC integration checks; see [acceptance record](analyst-tools.md#acceptance-and-validation--2026-09-24)                                                                    | No hosted adoption or deployment verified; no new route/UI                                                                                                                        |
| 10. Analyst Query Planner                   | Implemented locally, 2026-09-24                                            | Strict plan/provider/execution tests, synthetic live evaluation and two-owner tool execution; see [acceptance record](analyst-query-planner.md#acceptance-and-validation--2026-09-24)                                           | No hosted adoption or deployment verified; no new route/UI                                                                                                                        |
| 11. Analyst 2.0: Freeform Grounded Analysis | Implemented locally, 2026-09-25                                            | Grounding, quota, browser and synthetic live evaluation; see [Phase 11 contract](analyst-freeform.md#local-acceptance-and-release-boundary--2026-09-25)                                                                         | Current deployment and one signed-in insufficient-history fallback verified with Phase 12; complete Phase 11 hosted acceptance remains open                                       |
| 12. Historical / Longitudinal Metrics Layer | Implemented and deployed, 2026-09-25                                       | 464 application tests, 159 local DB assertions, authenticated desktop/mobile browser checks and build; see [Phase 12 contract](historical-metrics.md)                                                                           | Hosted migration, owner isolation, ready deployment, signed-in History views and one consented Analyst fallback verified 2026-09-25                                               |
| 13. Cross-domain and Longitudinal Analyst   | Implemented and deployed, 2026-09-25                                       | 472 application tests, 159 local DB assertions, two-owner tool checks, authenticated desktop/mobile browser checks and build; see [Phase 13 contract](cross-domain-analyst.md)                                                  | Hosted deployment, signed-in goal picker, two approved Analyst requests, source paths, safe incomplete-history fallback and clean route error scan verified 2026-09-25            |
| 14. Pattern and Association Discovery       | Implemented locally, 2026-09-25                                            | Deterministic method, full application and database checks, two-owner tool integration, synthetic live AI evaluations, authenticated desktop/mobile no-finding browser checks; see [Phase 14 contract](pattern-associations.md) | Hosted deployment and qualified-finding browser flow not verified                                                                                                                 |
| 15. Scenario Intelligence                   | Implemented locally, 2026-09-25                                            | Engine parity, two-owner tool checks, synthetic live AI evaluation and authenticated desktop/mobile comparison checks; see [Phase 15 contract](scenario-intelligence.md)                                                        | Hosted deployment and production comparison flow not verified                                                                                                                     |
| 16. Next Best Action                        | Implemented and deployed, 2026-09-25                                       | Dayline-ranked application follow-ups, owner/stale/duplicate database checks, application tests and signed-in local desktop/320px browser review; see [Phase 16 contract](next-best-action.md)                                  | Hosted migrations, two-owner database check, ready deployment, signed-in desktop/320px review, saved choices and task persistence verified 2026-09-25                             |
| 17. Universal Capture 2.0                   | Implemented and deployed, 2026-09-25                                       | Bounded batch, task resolution, live synthetic evaluation, local owner/RPC tests and signed-in desktop/320px review; see [Phase 17 contract](universal-capture-2.md)                                                            | Three hosted migrations, owner/RPC checks, scheduled cleanup, CI, ready deployment and signed-in production desktop/320px batch flows verified 2026-09-25                         |
| 18. Multimodal Universal Capture            | Implemented and deployed, 2026-09-26; signed-in acceptance open            | File validation, extraction, editable text, provenance, confirmation tests, synthetic live media checks, CI and production smoke; see [Phase 18 contract](multimodal-capture.md)                                                | File-scanning decision documented; broader media evaluation and signed-in desktop/320px review remain open                                                                        |
| 19. Decision → Outcome Intelligence         | Implemented locally, 2026-09-26                                            | 553 application tests, 225 database assertions, signed-in local desktop/320px flow, lint, typecheck and build; see [Phase 19 contract](decision-outcomes.md)                                                                    | Hosted migration, application deployment and signed-in production acceptance pending                                                                                              |

Repository health is independent: [formatting debt](repository-formatting-debt.md)
records 45 historical failures and their local cleanup to zero on 2026-09-24.
Older generic testing/database/security documents describe earlier snapshots, not
fresh failures. The Phase 9 implementation established a fresh passing local baseline and records
its integrated verification in [the Tool Layer contract](analyst-tools.md#acceptance-and-validation--2026-09-24). Establish a fresh baseline for each subsequent implementation.

## Current release closeout

This is bounded maintenance and verification, **not another intelligence phase**.
Record pass, fail, or verification pending with date, environment, revision/change
set and evidence. Reuse applicable recorded results; rerun when changes or
environment differences make them insufficient. Unchecked items need resolution
or evidence reconciliation, not an assumption of failure.

- [ ] **Universal Capture:** Verify preview/corrections, explicit confirmation,
      cancellation without writes, invalid/missing amount/date rejection, owner
      isolation, stale/duplicate submission, provider failure/manual fallback, and
      authenticated narrow-mobile/keyboard behavior. Reconcile existing action,
      proposal and component coverage with release browser evidence. Confirm the
      Capture quota migration and app compatibility in the required environment.
- [ ] **Current Analyst:** Reconcile the frontier-model reservation and misleading
      quota issue with the typed route and migrations
      `20260924093543_add_gpt6_analyst_models.sql` and
      `20260924094513_analyst_typed_reservation.sql`. The
      [Analyst contract](atlas-analyst.md#validation) records hosted SQL reservations
      and successful synthetic provider calls for Astra/Sol/Luna on 2026-09-24;
      this supports the fix, not the current hosted application release. Verify
      deployed route/schema compatibility and a full authenticated hosted browser
      flow with a disposable account, including actual quota versus setup,
      model-access/provider errors, and evidence-only fallback.
- [ ] **Graph:** Reconcile all six Phase 8 acceptance criteria with
      [the local acceptance matrix](atlas-graph.md#acceptance-and-validation--2026-09-24).
      Preserve native task/milestone links, owner integrity, deletion cleanup,
      one-hop bounds, Search/export and user-controlled links. Verify migration
      `20260924161626_atlas_graph_relationships.sql`, RLS, triggers, grants and count
      RPC in the required environment before dependent application rollout; record
      hosted deployment and authenticated responsive verification separately.
      Hosted state not verified. Do not rebuild Graph or infer deployment from SQL files.
- [x] **Repository baseline for local Phase 9:** Revision `c3c53e7` plus the approved
      roadmap edits; lint, typecheck, 358 application tests, production build,
      formatting and 131 database assertions passed before implementation.
      [Integrated Phase 9 validation](analyst-tools.md#acceptance-and-validation--2026-09-24)
      records the resulting changes. Hosted/browser gaps remain separate; establish
      a fresh baseline again for the next implementation.

Only unresolved safety, correctness, dependency, or required release-environment
issues block the next step. Specify the required environment for the scoped task:
hosted unknowns remain hosted release gates, but need not block independently
testable local tools whose dependencies are locally validated. Do not turn this
into endless cleanup or waive mandatory CI policy.

**Phase 12 Historical Metrics is implemented, deployed and verified in the hosted environment.** Its
[contract](historical-metrics.md) defines source/date/coverage semantics and
release boundaries. The live Analyst check showed the expected insufficient-history fallback for the current account. Phase 11's
[contract](analyst-freeform.md) records the quota migration, grounded claims,
fallback and validation. Phase 13 is implemented and deployed; its
[production acceptance](cross-domain-analyst.md#production-acceptance--2026-09-25)
is recorded. Other hosted release gates above remain open. Phase 17 is implemented
and deployed with [production acceptance](universal-capture-2.md#production-acceptance). Phase 18 is
deployed with [release evidence and remaining acceptance](multimodal-capture.md#validation-and-production-release). Phase 16's
production acceptance is recorded in [its contract](next-best-action.md). Phase 14's
local method and release boundary are recorded in [its contract](pattern-associations.md);
Phase 15's local comparison and release boundary are recorded in
[its contract](scenario-intelligence.md).

The delivered AI surfaces are intentionally narrow. Universal Capture now
previews up to five independent actions from five creation kinds (expense,
income, task, career application, knowledge concept) plus task rescheduling.
Other intent-backlog actions remain unsupported.
Analyst retains **seven predefined questions** and now also accepts bounded
freeform questions through the approved planner and tool layer. Both flows show
calculated evidence when an explanation fails. See the [preset Analyst
contract](atlas-analyst.md) and [freeform contract](analyst-freeform.md) for
their distinct boundaries.

---

# Phase 1 — Signals

**Status:** Implemented and verified on 2026-08-26.

## Goal

Make ATLAS detect meaningful changes, risks, opportunities, and trends from existing structured data.

Signals answers:

> **What changed or deserves my attention?**

This phase should be fully deterministic.

## Examples

- Expenses are 24% higher than the recent monthly average.
- Food spending is significantly above normal.
- 6 overdue tasks are waiting, up from 2 last week.
- 5 job applications need follow-up.
- Total debt decreased by ₱4,635 this month.
- A goal has not moved in 21 days.

## Core Requirements

Support signals for:

- Money
- Debt
- Tasks
- Career
- Goals

Signal severities:

- info
- positive
- warning
- critical

Signals should:

- avoid tiny samples
- avoid meaningless percentage comparisons
- deduplicate overlapping insights
- rank higher-severity signals first
- include positive progress, not only warnings
- be explainable from source data
- link back to the relevant module

Dashboard should show approximately 3–5 high-value signals.

A dedicated `/signals` page may be added if it fits the current navigation.

## Must Not Include

- AI
- OpenAI
- embeddings
- machine learning
- push notifications
- autonomous actions
- user-created rules engine
- opaque health/life scores

## Acceptance Criteria

- Signals are generated from real ATLAS data.
- Business rules are outside React presentation components.
- Signals include clear explanations.
- Noise-control logic exists.
- Unit tests cover thresholds and edge cases.
- Dashboard integration does not replace Dayline.

## AI Agent Prompt

```text
Implement a new deterministic Signals feature in Project ATLAS.

Before changing code, inspect the existing repository architecture, database schema, dashboard, design system, activity history, money, debt, tasks, goals, career, and review modules. Reuse existing patterns. Do not redesign unrelated areas.

Goal:
Signals should detect meaningful changes, risks, progress, and unusual patterns from existing structured ATLAS data.

The feature must not use AI, OpenAI, LLMs, embeddings, machine learning, or external analysis services.

Initial categories:
- Money
- Debt
- Tasks
- Career
- Goals

Severity:
- info
- positive
- warning
- critical

Initial rule ideas:
- current expense increase against previous completed-month baseline
- budget threshold warnings
- category spending spike
- monthly debt reduction
- upcoming/overdue debt payment
- overdue task increase
- strong weekly task completion
- workload pressure
- low career response conversion with minimum sample size
- career follow-up backlog
- positive career stage movement
- stalled job applications
- stale goals
- milestone progress
- approaching goal deadline

Requirements:
- no signal when historical data is insufficient
- no tiny-denominator percentage noise
- deduplicate overlapping signals
- rank useful/high-severity signals first
- include positive signals
- limit dashboard output to roughly 3–5 items
- link signals to relevant modules
- expose a concise “why am I seeing this?” explanation where useful
- keep calculations server-side/domain-level rather than in React components
- preserve RLS and existing authorization patterns
- use Asia/Manila date behavior
- use integer centavos for money

Integrate Signals into the Today dashboard without replacing Dayline.

If appropriate, add a dedicated /signals page with simple category/severity filters.

Add unit tests for:
- no history
- insufficient history
- zero baseline
- exact thresholds
- tiny samples
- positive trends
- duplicate signals
- severity ranking

Run:
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check

Final response must include:
1. summary
2. files changed
3. rules implemented
4. database changes if any
5. tests added
6. validation results
7. known limitations
8. recommended next improvement

Do not expand scope beyond the Signals MVP.
```

---

# Phase 2 — Capacity-Aware Dayline

**Status:** Implemented on 2026-09-04. Unit tests, lint, type checking, and the
production build pass. The local pgTAP migration check remains pending because
Docker Desktop was unavailable during verification.

## Delivered Scope

- Deterministic `NOW`, `NEXT`, and `LATER` recommendations from tasks, debt
  actions, career follow-ups, and active-goal milestones.
- Ranking explanations based on urgency, importance, duration/capacity fit,
  energy fit, task age, and active-goal linkage.
- User-configurable daily focus capacity and planning energy.
- Task energy metadata with backward-compatible defaults.
- Responsive task capture, task editing, task lists, Dayline presentation, and
  settings controls for desktop and mobile layouts.
- Unit coverage for ranking edge cases and task-energy persistence, plus a pgTAP
  migration test ready for the next local database run.

## Remaining Verification Follow-ups

- Run the new migration and pgTAP suite against a clean local Supabase database
  when Docker Desktop is available.
- Complete authenticated visual checks of the changed Dayline, task, and settings
  surfaces at representative mobile and desktop viewport sizes.

## Goal

Upgrade the existing Dayline from deadline-based prioritization into a realistic daily execution system.

Dayline answers:

> **What should I actually do next given my available time, urgency, importance, and effort?**

Signals observes.\
Dayline acts.

## Task Metadata

The implemented version uses:

- estimated duration
- energy requirement
- existing task priority as the importance signal

Preferred time/daypart and blocking/dependency metadata remain possible later
extensions. They are not required for the completed Phase 2 scope.

Suggested values:

### Estimated Duration

- 15 min
- 30 min
- 45 min
- 60 min
- 90 min
- 120+ min

### Energy

- low
- medium
- high

## Example

Instead of:

1. Finish portfolio
2. Apply to jobs
3. Pay debt

Dayline could show:

**NOW — 20 min**\
Follow up on two job applications\
Reason: overdue, short, career-impacting

**NEXT — 45 min**\
Finish portfolio project page\
Reason: supports active career goal

**LATER — 15 min**\
Record debt payment\
Reason: deadline approaching

## Prioritization Inputs

Use deterministic factors such as:

- overdue status
- deadline proximity
- importance
- estimated duration
- available user capacity
- related goal priority
- career/debt follow-up urgency
- task age

Do not create a mysterious AI score.

If a numeric ranking exists internally, expose the reasoning in human terms.

## Scope

Do not build a full calendar scheduler yet.

Do not add AI.

## Acceptance Criteria

- Tasks support enough metadata to estimate realistic workload.
- Dayline ranking is deterministic.
- Each Dayline item explains why it surfaced.
- The user can understand the ordering.
- Existing Dayline behavior does not regress.
- Tests cover ranking edge cases.

## AI Agent Prompt

```text
Upgrade the existing ATLAS Dayline into a Capacity-Aware Dayline.

Inspect the current Dayline/dashboard logic and task schema before changing anything.

Goal:
Dayline should answer “What should I actually do next?” using deterministic prioritization rather than only deadlines.

Add the minimum task metadata necessary to support realistic prioritization:
- estimated duration
- energy requirement
- importance
- optionally preferred daypart if it fits naturally

Do not add AI.

Use deterministic ranking inputs such as:
- overdue status
- deadline proximity
- importance
- estimated duration
- user capacity if available
- relation to active goals
- task age
- existing career/debt urgency when surfaced through Dayline

Requirements:
- keep Dayline explanations visible
- do not expose an unexplained black-box score
- preserve current ATLAS UI language and route-like Dayline concept
- keep ranking logic outside React presentation components
- make schema changes safely
- preserve RLS
- use Asia/Manila date behavior
- avoid building a full calendar scheduler

Add tests covering:
- overdue vs important
- short urgent task vs long non-urgent task
- equal priorities
- missing estimates
- high-energy tasks
- completed tasks excluded
- Dayline maximum item count
- stable deterministic ordering

Run the full validation suite.

Final response:
1. summary
2. schema changes
3. ranking logic
4. UI changes
5. tests
6. validation results
7. known limitations
8. next recommended phase

Do not implement Signals again and do not add AI.
```

---

# Phase 3 — Personal Runway & Financial Scenarios

**Status:** Implemented on 2026-09-05. The deterministic engine, unit and
component coverage, lint, type checking, and production build are verified.
Local Supabase and authenticated browser verification remain environment-dependent
release checks.

## Delivered Scope

- Mobile-first `/money/runway` workspace with a conservative headline that uses
  selected current funds only; expected income affects cash-flow comparison, not
  runway duration.
- Saved account/category/target assumptions, validated by an atomic owner-scoped
  Supabase RPC and compatible with the existing offline mutation queue.
- Three fully completed Asia/Manila months of recorded history, with a latest
  applicable essential-budget fallback when fewer than two usable months exist.
- Essential expense filtering, active-debt minimums added once, zero/negative
  fund handling, a profile-income fallback that is visibly labeled, and no
  infinite runway when monthly need is zero.
- In-memory combined scenarios for income, recurring essential-cost changes,
  one-time purchases, a single extra debt payment, and a runway-target override.
  Scenarios do not create or change real financial records.
- RLS-safe account-balance view extension, owner-scoped bounded monthly totals,
  type-based account defaults, essential-category defaults including Housing,
  and pgTAP coverage for ownership and atomicity boundaries.
- Runway links from Accounts, Budget, and the dashboard financial snapshot,
  plus 320px-friendly stacked sections, touch-sized controls, guided empty
  states, collapsible calculation details, and privacy masking for amounts.

## Verification and Limitations

- `npm run lint`, `npm run typecheck`, `npm run test` (242 tests), and
  `npm run build` passed during implementation. Engine, action, and scenario
  component tests cover calculation boundaries, fallback behavior, combined
  scenarios, reset behavior, and save failures.
- The hosted `add_personal_runway` migration was applied to ProjectAtlas and its
  columns, invoker-secured RPCs, and `security_invoker` view were verified on
  2026-09-05. Local `supabase:reset` and `supabase:test` remain unverified
  because Docker Desktop/local Postgres was unavailable. Authenticated Playwright
  is unverified because dedicated E2E credentials were not configured. The
  repository-wide format check still reports existing unrelated formatting drift.
- The feature intentionally does not store named scenarios, forecast returns or
  inflation, schedule future transactions, distribute extra payments across
  debts, or turn hypothetical values into real records.

## Goal

Move ATLAS finance from historical tracking toward deterministic decision support.

This phase answers:

> **How financially safe am I, and what happens if I change something?**

## Feature A — Personal Runway

Calculate how many months the user could maintain essential baseline spending using available liquid funds.

Example:

**Financial Runway: 2.7 months**

Possible supporting metrics:

- liquid balance
- essential monthly baseline
- recent average expenses
- debt obligations
- current income
- monthly free cash flow

The assumptions must be visible.

Do not present this as a guarantee.

## Feature B — Scenario Simulator

Support deterministic “what if” simulations.

Examples:

- What if I pay an extra ₱3,000 toward Debt A every month?
- What if my salary rises to ₱35,000?
- What if commuting adds ₱6,000/month?
- What if I reduce dining expenses by ₱2,000/month?
- Can I afford a ₱30,000 purchase without dropping below my preferred runway?

No AI is required.

## Acceptance Criteria

- Results use existing financial source-of-truth logic.
- Assumptions are visible.
- Simulations never mutate real data unless the user explicitly saves a change.
- Calculations are tested thoroughly.
- The feature avoids false precision.

## AI Agent Prompt

```text
Implement deterministic Personal Runway and Financial Scenario tools in ATLAS.

Inspect all existing account balance, transaction, budget, debt, payment, projection, and money utilities first.

Do not duplicate accounting logic.

Part 1: Personal Runway
Calculate an understandable estimate of how many months the user could cover an essential baseline using liquid resources.

The model must clearly expose assumptions:
- which accounts count as liquid
- which expense categories or baseline method count as essential
- historical period used
- whether debt obligations are included
- whether expected income is excluded or included

Avoid claiming certainty.

Part 2: Scenario Simulator
Support non-destructive hypothetical scenarios such as:
- extra monthly debt payment
- salary/income change
- expense reduction
- recurring cost increase
- one-time purchase
- target emergency runway

Scenario calculations must not alter source-of-truth records unless the user explicitly chooses to save a real change.

No AI, LLM, OpenAI, embeddings, or predictive machine learning.

Use integer centavos and existing debt/account calculation utilities.

Add extensive unit tests for:
- zero expenses
- zero liquid balance
- negative monthly cash flow
- large one-time purchase
- extra debt payments
- scenario comparison
- missing history
- partially completed months

Keep UI consistent with ATLAS.

Final response:
1. summary
2. formulas and assumptions
3. files changed
4. tests
5. validation results
6. limitations
7. recommended next phase
```

---

# Phase 4 — Life Timeline

**Status:** Implemented on 2026-09-05. Application linting, type checks, and
unit/component tests passed. Local Supabase reset and pgTAP remain unverified
on this machine because Docker Desktop was unavailable.

## Delivered Scope

- Added `/timeline`: a mobile-first, day-grouped workspace with owner-scoped
  search, module/date filters, and cursor-based loading for older events.
- Extended the existing `activity_log` with normalized timeline fields rather
  than creating another public event table. Current money records update a
  stable presentation snapshot; completed tasks, goals/milestones, career
  stage transitions, and review submissions retain immutable transition facts.
- Added private trigger writers for transactions, transfers, debt payments,
  tasks, milestones, applications/stage changes, goals, and reviews. A source
  deletion leaves its snapshot visible while removing its deep link.
- Added authenticated `life_timeline` RPC access, cursor/search indexes,
  owner-only filtering, and revoked direct authenticated writes to
  `activity_log`.
- Linked Timeline from primary navigation, mobile More, dashboard finance,
  Accounts, Budget, and the audit page. Timeline links open and highlight the
  relevant money, debt, task, goal/milestone, career, or review record.
- Added timeline fields to activity exports (JSON format version 2) and focused
  helper/pgTAP coverage for filter normalization, grouping, owner isolation,
  source deletion, and protected writes.

## Limitations and Follow-up

- Existing source records are backfilled; legacy deleted records that had no
  previous activity entry cannot be reconstructed.
- The local Docker-dependent migration and pgTAP checks still need to run in a
  Docker-enabled environment, followed by authenticated responsive E2E checks.
- The original next target was Phase 5, now implemented. Use current closeout and Section 10 for next-action guidance.

## Goal

Create one chronological history across ATLAS.

This phase answers:

> **What was happening in my life at that time?**

ATLAS already has activity history. This phase should build on that foundation instead of creating a second audit system.

## Timeline Events

Possible event sources:

- expenses/income/transfers
- debt payments
- task completions
- goal milestone completions
- career applications
- career stage changes
- weekly reviews
- major settings/actions where relevant
- future knowledge/decision events

## Example

```text
Aug 03  Expense       ₱1,200
Aug 04  Career        Applied — Company X
Aug 05  Goal          Milestone completed
Aug 06  Task          Portfolio deployed
Aug 08  Debt          Paid ₱4,635
Aug 09  Review        Weekly review completed
```

## Requirements

Support:

- date range
- category/module filter
- search
- clear links to source records
- grouping by day/week/month if useful

Avoid turning this into a social feed.

## Acceptance Criteria

- Timeline is derived from existing event/activity data where possible.
- No duplicated audit trail is introduced without necessity.
- Events are normalized into a common presentation shape.
- Search/filter performance is acceptable.
- Source ownership remains protected.

## AI Agent Prompt

```text
Implement an ATLAS Life Timeline.

Goal:
Provide one chronological view of meaningful user events across ATLAS.

Before coding, inspect the existing activity_history schema, search implementation, audit/event triggers, and module-level history.

Prefer extending or normalizing existing activity history rather than creating a duplicate event system.

Timeline should support meaningful events from:
- money
- debt
- tasks
- goals/milestones
- career applications/stage changes
- weekly reviews
- other existing high-value events

Create a normalized timeline presentation model with:
- event id
- timestamp/date
- module/category
- title
- concise description
- optional amount/metric
- href to source
- event type

Support:
- chronological sorting
- date range
- module filter
- search if practical
- day/week/month grouping if useful

Do not add AI.

Do not expose low-value internal audit noise.

Preserve RLS and private data boundaries.

Add tests for:
- chronological ordering
- mixed event types
- same-day events
- filters
- missing/deleted source items where applicable
- pagination

Run full validation.

Final response:
1. summary
2. event sources
3. files changed
4. database changes
5. tests
6. validation results
7. limitations
8. recommended next phase
```

---

# Phase 5 — Knowledge & Spaced Repetition

**Status:** Implemented and hosted migration verified on 2026-09-06. Application
validation and the Knowledge pgTAP ownership checks pass. A clean local database
reset remains pending until Docker Desktop is available.

## Delivered Scope

- Owner-scoped concepts with notes, category, tags, examples, personal
  explanations, confidence, archive/restore, and editing.
- Deterministic Again, Hard, Good, and Easy scheduling with atomic updates and
  immutable review history.
- Responsive library, due, recent, weak, and archived views with an active-recall
  flow that keeps notes and rating controls hidden until reveal.
- Global search, activity history, desktop navigation, and mobile navigation
  integration.
- Unit and component coverage for scheduling boundaries, due behavior, recall
  reveal, filtered empty states, review history, and archived concepts, plus
  owner-isolation and atomicity pgTAP coverage.

## Goal

Turn ATLAS into an active learning system, not merely a note store.

This phase answers:

> **What am I learning, how well do I know it, and when should I review it?**

## Core Knowledge Model

Possible fields:

- title/concept
- description/learning notes
- category
- tags
- examples
- personal explanation
- confidence
- created_at
- last_reviewed_at
- next_review_at
- archived state

Potential relations:

- concept → project
- concept → goal
- concept → career skill
- concept → other concept

Deep graph behavior can wait until Phase 8.

## Review System

Implement spaced repetition using deterministic scheduling.

Possible review outcomes:

- Again
- Hard
- Good
- Easy

Use a simple established algorithm or a documented ATLAS-specific interval model.

Avoid AI dependency.

## Useful Views

- Knowledge library
- Due for review
- Recently learned
- Weak concepts
- Categories
- Concept detail page

## Acceptance Criteria

- Concepts can be stored cleanly.
- Reviews generate deterministic next-review dates.
- Review history is preserved.
- The user can explain a concept before revealing notes.
- The system works without AI.

## AI Agent Prompt

```text
Implement the ATLAS Knowledge and Spaced Repetition module.

Goal:
ATLAS should help the user retain concepts rather than simply store notes.

Before coding, inspect existing navigation, goals, search, activity history, rich-text patterns, and database conventions.

Core knowledge item should support:
- title/concept
- description or learning notes
- category
- tags if consistent with the app
- examples
- optional personal explanation
- confidence
- created_at
- last_reviewed_at
- next_review_at
- archive state

Implement deterministic spaced repetition.

Provide review actions such as:
- Again
- Hard
- Good
- Easy

Use a documented, testable scheduling algorithm.

Views:
- Knowledge library
- Due for review
- Recently learned
- Weak concepts
- Category filtering
- Concept detail

During review:
1. show the concept/question
2. allow recall before revealing notes
3. reveal learning notes
4. let the user rate recall
5. schedule the next review

Do not use AI in this phase.

Do not build the full ATLAS Graph yet.

Integrate with:
- global search
- activity history
- responsive navigation
- privacy/RLS

Add tests for:
- initial schedule
- Again/Hard/Good/Easy intervals
- overdue reviews
- repeated review
- timezone behavior
- archive behavior

Run full validation.

Final response:
1. summary
2. schema
3. scheduling algorithm
4. views
5. tests
6. validation results
7. limitations
8. recommended next phase
```

---

# Phase 6 — Universal Capture

**Status:** In progress. The local implementation supports five single-action
intents with preview and confirmation. A live structured-output smoke passed on
2026-09-24. The migration and local pgTAP integration checks passed; release
checks remain.

## Goal

Create one fast capture interface that turns natural language into structured ATLAS records.

This is the first phase where AI becomes strongly useful.

Universal Capture answers:

> **Can I tell ATLAS what happened without manually navigating to the correct form?**

## Examples

Input:

> Paid 450 for gas earlier.

Proposed structured action:

- Type: Expense
- Amount: ₱450
- Category: Transport
- Description: Gas
- Date: Today

Input:

> Apply to Accenture tomorrow.

Future Phase 17 multi-action proposals, delivery priority 17 (not supported by current Capture):

- Create career application draft
- Create task for tomorrow

Input:

> Learn loss aversion.

Proposed action:

- Create knowledge item

## Safety Rule

AI should **propose structured mutations**, not directly make uncontrolled changes.

Flow:

```text
User text
   ↓
AI interpretation
   ↓
Strict structured schema
   ↓
ATLAS validation
   ↓
User confirmation
   ↓
Normal ATLAS mutation
```

## Requirements

- structured output validation with Zod
- user confirmation before meaningful writes
- confidence/ambiguity handling
- no invented money values/dates/entities
- no direct model access to unrestricted database tools
- server-side API key only
- cost/rate limits
- audit trail

## Acceptance Criteria

- Natural language can generate valid proposed actions.
- Invalid AI output cannot mutate data.
- User sees exactly what will be saved.
- Existing deterministic mutations remain the only write path.
- Failure gracefully falls back to manual forms.

## AI Agent Prompt

```text
Implement ATLAS Universal Capture as the first AI-assisted product feature.

Before coding, inspect all existing creation mutations for:
- transactions
- tasks
- career applications
- debts/payments where appropriate
- knowledge items
- goals if appropriate

Goal:
Allow users to enter natural language and receive proposed structured ATLAS actions.

Architecture:
User text
→ server-side AI interpretation
→ strict structured schema
→ ATLAS validation
→ preview
→ user confirmation
→ existing deterministic mutation

Critical rule:
The model must not directly mutate the database.

Use the existing OPENAI_API_KEY only on the server.

Implement a bounded set of supported capture intents first:
- expense
- income
- task
- career application
- knowledge item

Keep this delivered scope single-action; multi-action proposals belong to future Phase 17 (delivery priority 17).

Requirements:
- Zod validate every model output
- reject unknown action types
- enforce numeric/date/category constraints
- never trust AI-generated user IDs
- never expose service-role credentials
- user must confirm before write
- show parsed fields before saving
- handle ambiguity explicitly
- provide manual fallback
- add rate/cost safeguards
- log safe metadata for failures without leaking sensitive prompt content unnecessarily

Do not give the AI unrestricted database access.

Do not implement the full ATLAS Analyst yet.

Add tests for:
- valid expense parsing
- ambiguous amount
- missing date
- unsupported action
- malicious/prompt-injection-like input
- malformed model JSON
- model timeout/error
- confirmation path
- cancellation path

Run full validation.

Final response:
1. summary
2. supported intents
3. AI schema
4. safety boundaries
5. files changed
6. tests
7. validation results
8. cost/rate-limit notes
9. limitations
10. recommended next phase
```

---

# Phase 7 — ATLAS Analyst

**Status:** Implemented for seven bounded, read-only question types. Analyst has a separate nine-model allowlist, including hosted GPT-6 Astra, Sol, and Luna reservation support. Open-ended analysis remains unsupported.

## Goal

Create an evidence-based AI analysis layer over structured ATLAS data.

This phase answers:

> **What does my data mean?**

The Analyst should not be a generic chatbot.

It should reason over carefully selected ATLAS facts.

## Example Questions

These illustrate the original Analyst vision; they are not all supported by the
current seven-question implementation. The exact implemented wording and data
limits are listed in [the Analyst contract](atlas-analyst.md). Broader questions
belong to Phase 11.

- Why am I not making progress financially?
- What changed in my spending this month?
- What should I focus on this week?
- Which area of my career pipeline is weakest?
- What patterns do you see in my last 12 weekly reviews?
- Am I making progress toward becoming debt-free?
- What should I stop doing based on my current priorities?

## Architecture

```text
User question
   ↓
Intent / analysis request
   ↓
Bounded ATLAS data retrieval
   ↓
Deterministic calculations
   ↓
Evidence package
   ↓
LLM explanation
   ↓
Answer + visible supporting facts
```

The AI should not be allowed to invent missing facts.

## Core Principle

> **ATLAS calculates. AI explains.**

## Requirements

- bounded context
- module-specific retrieval
- structured evidence
- visible supporting numbers
- no autonomous financial actions
- no write access by default
- prompt-injection defenses
- token/cost controls
- refusal when data is insufficient

## Acceptance Criteria

- Answers cite or expose the underlying ATLAS evidence.
- The AI does not calculate balances from raw text.
- High-risk recommendations are framed cautiously.
- Questions outside available data are clearly identified as unsupported.
- Model failure does not affect core ATLAS functionality.

## Implementation Procedure

This phase uses retrieval at request time, not model fine-tuning. The selected
model has no automatic access to Supabase. ATLAS must explicitly fetch the
signed-in user's relevant records and send a small evidence package with each
question. Start with structured queries and existing calculations; add semantic
search only if later questions about long-form notes need it.

1. **Define the first supported questions.** Start with one finance question:
   "What changed in my spending this month?" Specify the date windows,
   included transaction types, category grouping, minimum history, and expected
   answer shape. Compare equivalent elapsed days when the current month is
   incomplete. Treat a change in recorded spending as an observation, not proof
   of its cause. Expand to debts and tasks after this path is verified, then to
   career, goals, weekly reviews, and signals.
2. **Create a data contract for each question type.** List the exact Supabase
   tables and columns required, maximum rows and date range, aggregation rules,
   evidence fields, and behavior for missing or partial data. Reuse ATLAS's
   integer-centavo accounting and Asia/Manila date semantics. Do not build an
   unrestricted "ask the database" or model-generated SQL path.
3. **Add a server-only Analyst request path.** Validate question length and a
   separate Analyst model allowlist, authenticate with the existing Supabase
   server client, then classify the question into a supported analysis type.
   Reject unsupported or ambiguous requests before retrieving private data.
   Keep `OPENAI_API_KEY` on the server; never pass Supabase credentials or a
   service-role key to the model.
4. **Retrieve bounded, owner-scoped data.** Use fixed queries or existing
   domain services for the chosen analysis type. Rely on RLS as the final owner
   boundary and explicitly constrain queries to the authenticated user. Select
   only required columns and periods; summarize large histories server-side.
   Check empty, partial, and stale datasets before generating an explanation.
5. **Calculate facts in ATLAS.** Reuse deterministic finance, debt, task, and
   Signals logic where applicable. Calculate totals, differences, percentages,
   and comparison periods in server code or SQL, with tests for rounding and
   date boundaries. Never ask the model to derive authoritative balances from
   raw transaction text.
6. **Build a typed evidence package.** Each fact should carry an ID, metric,
   value and unit, date range, comparison basis, source record IDs or an
   aggregate source description, and completeness notes. Include only facts
   needed for the question. For example, a spending answer might receive two
   monthly totals and the category changes that explain the difference, rather
   than every transaction or unrelated personal record.
7. **Generate and verify the explanation.** Send the question and evidence as
   data to the selected OpenAI model with instructions to use only supplied
   facts, identify uncertainty, and return a structured answer with evidence
   IDs. Treat titles, notes, and other stored text as untrusted data. Validate
   the response shape and cited IDs on the server. Render authoritative figures
   from server evidence, not model text; fall back to evidence-only output if
   the response is invalid or contradicts those figures. No tools for writes
   or autonomous actions are available to the model.
8. **Show the evidence in the UI.** Present the explanation, period, numbers,
   and links to underlying ATLAS records where available. Show when history is
   insufficient or a question is outside the supported set. Explain before
   first use that relevant personal facts will be sent to OpenAI under the
   OpenAI organization's current data-sharing settings. Do not imply the model
   has learned the user's whole database or remembers later changes.
9. **Set operating limits.** Reuse the server-side model configuration pattern
   from Universal Capture, but give Analyst its own verified model options and
   default. Cap question length, evidence size, output tokens, request time,
   and per-user rate or daily usage. Record minimal audit metadata such as
   analysis type, model, time, token usage, and outcome; do not log full private
   evidence or answers. Give Analyst a separate owner-scoped quota, using the
   Capture quota implementation as a pattern rather than sharing its allowance.
10. **Verify and release in stages.** Test owner isolation with two users,
    exact financial calculations, missing and partial history, unsupported
    questions, prompt injection in stored notes, evidence-ID validation,
    context truncation, rate limits, and OpenAI timeout or failure. Check the
    UI on mobile and desktop. Release the finance question first and compare
    answers with manually checked ATLAS figures before enabling more domains.

## AI Agent Prompt

```text
Implement an evidence-based ATLAS Analyst.

Follow the Implementation Procedure above. Deliver and verify the first finance
question before extending the supported domains.

This is not a generic chat feature.

Goal:
Allow users to ask questions about their ATLAS data and receive explanations grounded in deterministic ATLAS facts.

Architecture:
user question
→ classify requested analysis
→ retrieve only necessary owner-scoped data
→ run deterministic ATLAS calculations
→ construct a structured evidence package
→ send evidence plus question to the LLM
→ return explanation plus visible supporting facts

Critical principle:
ATLAS calculates. AI explains.

The model must not:
- calculate authoritative balances from raw transactions
- invent unavailable history
- directly mutate financial/task/career/goal records
- receive service-role credentials
- receive unnecessary private context
- run unrestricted SQL
- claim certainty beyond the available data

Initial supported analysis domains:
- finances
- debts
- tasks/execution
- career applications
- goals
- weekly reviews
- signals

Every answer should show the evidence it relied on, for example:
- totals
- date ranges
- comparison periods
- conversion rates
- trend values
- relevant signal titles

If data is insufficient, say so.

Implement:
- bounded retrieval
- prompt-injection defenses
- strict server-side model access
- token/cost limits
- rate limiting
- failure handling
- audit-friendly analysis metadata

Do not add autonomous actions.

Add tests for:
- grounded finance question
- unsupported question
- insufficient data
- malicious user content stored in records
- prompt injection
- large history/context truncation
- model failure
- evidence rendering

Run full validation.

Final response:
1. summary
2. supported question types
3. retrieval architecture
4. evidence format
5. safety boundaries
6. files changed
7. tests
8. validation
9. limitations
10. recommended next phase
```

---

# Phase acceptance and validation baselines

A phase is accepted when its scoped requirements pass, it introduces no new
validation regressions, and relevant safety, correctness, and deployment
requirements are satisfied. Proven unrelated legacy failures are tracked
separately.

Record implementation, validation (date/environment), deployment and repository
health independently. Implemented locally is not locally validated, deployed,
or verified hosted. Missing evidence is **Verification pending** or **Hosted
state not verified**. Previous passing reports establish only those runs.

New lint or formatting failures, type errors, test or build failures, security
regressions, and failed phase-specific E2E checks still fail phase acceptance.
This rule cannot be used to excuse a regression introduced by the current phase.

Before starting each roadmap phase:

1. Establish the validation baseline and record the Git revision/change set.
2. Record existing failures, exact affected files, and their scope separately.
3. Implement the phase while preserving existing work.
4. Rerun repository and phase-specific validation.
5. Compare failures using consistent tooling/configuration and identify every new regression. A file outside the changed-file set does not prove a failure is unrelated. Unknown failures remain unclassified until investigated.
6. Decide acceptance from the phase requirements and new regressions; link any
   unrelated historical debt to its own record.

For example, the same 37 unrelated format failures before and after a phase
means zero new formatting regressions, provided every phase-modified file
passes its applicable formatting check. It does not mean the repository format
check passes. Formatting debt remains visible; subsequent phases must not inherit
unexplained failures. Existing security, data-integrity or runtime failures affecting
the feature or dependencies can block release. Never disable checks or silently
waive mandatory requirements. Required repository-wide CI must pass or be handled
through an explicitly approved project policy.

---

# Phase 8 — ATLAS Graph

**Status:** Implemented locally as of 2026-09-24; local acceptance is recorded in [ATLAS Graph architecture and acceptance evidence](atlas-graph.md). Hosted state not verified.

The local implementation includes the owner-scoped explicit relationship table,
database endpoint validation and cleanup, native task/goal and milestone/goal
adapters, deterministic Signal source references, Goal related counts and detail
UI, manual add/remove, native task link/unlink, batched Search goal context,
activity history, export, and one-hop Analyst-ready reads. The existing 2026-09-24 report records that local database tests
(131), unit/component tests (358), lint, typecheck, and production build pass.
Authenticated local Graph E2E passed on mobile and desktop, including explicit
knowledge and native task add/remove and no horizontal overflow. The
repository-wide format check now passes after a separate mechanical cleanup.
Graph introduced zero formatting regressions; the original 45 unrelated
failures and cleanup are recorded in [repository formatting debt](repository-formatting-debt.md). These are historical results, not reruns during this documentation task; code presence alone does not establish release completion.

## Goal

Create a cross-domain relationship layer that connects the different parts of ATLAS.

This phase answers:

> **How are these parts of my life connected?**

This is what prevents ATLAS from becoming seven separate apps under one sidebar.

## Example Relationships

- Task → Goal
- Knowledge → Goal
- Knowledge → Project
- Expense → Goal
- Debt → Financial Goal
- Job Application → Career Goal
- Weekly Review → Goal
- Milestone → Knowledge
- Signal → Source Records
- Decision → Outcome
- Project → Tasks
- Project → Expenses
- Project → Knowledge

## Important Scope Rule

The Graph is initially a **relationship model**, not necessarily a visual node graph.

Do not start with a flashy visualization.

Start with useful relationships in normal UI.

Example:

Goal: Become Debt-Free

Related:

- Debts: 3
- Tasks: 4
- Knowledge: 2
- Signals: 3
- Relevant expenses: optional/manual
- Weekly reviews mentioning goal: 5

## Architecture

Prefer a generic but controlled relationship model only if it remains type-safe and queryable.

Avoid a completely unbounded “anything links to anything” table if it creates data-integrity problems.

Graph edges should expose typed, owner-scoped relationship paths to Search and
future Analyst tools. A developer-job goal, for example, can connect its
applications, tasks, knowledge, reviews, Signals, and timeline events so Analyst
can inspect blockers, overdue work, weak skills, and recent change around the
goal. Some edges can be derived from existing foreign keys or source references;
proposed permanent AI-created edges require user confirmation. Projects and
decisions are future entity types, not claims about the current schema. Graph is
AI context infrastructure first; its useful detail-page and retrieval behavior
precedes any visual node graph.

## Acceptance Criteria

- Core entities can be linked safely.
- Links respect ownership.
- Related items can be shown on detail pages.
- Search and Analyst can use relationships.
- Graph remains understandable and user-controlled.
- No autonomous AI-created permanent relationships without confirmation.

## AI Agent Prompt

```text
Implement the first ATLAS Graph relationship layer.

Goal:
Allow meaningful ATLAS entities to connect across modules so the product behaves like one personal operating system rather than isolated trackers.

Before coding, inspect all current entity IDs, ownership constraints, composite foreign keys, activity history, search, goals, tasks, career, money, debts, knowledge, signals, and Analyst architecture.

Initial relationship examples:
- task → goal
- knowledge → goal
- knowledge → project if projects exist
- job application → career goal
- debt → financial goal
- signal → relevant source records
- weekly review → goal
- milestone → knowledge
- future decision → outcome

Do not start with a graph visualization.

Start with:
- relationship data model
- safe create/delete links
- related-items sections on detail pages
- filters/search hooks
- APIs/domain helpers usable by the Analyst

Requirements:
- owner-scoped relationships
- no cross-user linking
- integrity checks on both endpoints
- typed relationship kinds
- avoid unrestricted polymorphic chaos
- user confirmation before AI-suggested permanent links
- pagination where necessary
- no duplicated source-of-truth data

If using a generic relationship table, document how type integrity is enforced.

Add tests for:
- valid same-user links
- blocked cross-user links
- duplicate relationship
- deleted source/target behavior
- related-item retrieval
- filtering by relationship type

Run full validation.

Final response:
1. summary
2. relationship model
3. supported entity types
4. integrity/security strategy
5. UI integrations
6. files changed
7. tests
8. validation
9. limitations
10. recommended future extensions
```

---

# 5. What Not to Build Yet

Until the above sequence is substantially complete, avoid distracting the project with:

- microservices
- Redis
- GraphQL
- autonomous background AI agents
- fully autonomous financial actions
- social features
- public profiles
- gamification for its own sake
- complicated health scoring
- crypto tracking unless personally required
- excessive third-party integrations
- graph visualization before graph relationships are useful
- generalized plugin architecture
- generic “AI chat” disconnected from structured ATLAS evidence

---

# 6. Suggested Release Milestones

These original product milestones describe foundation capabilities, not instructions to rebuild them or blanket hosted release claims.

## ATLAS 1.0 — Reliable

Focus:

- finish existing MVP depth
- validate database migrations
- strengthen tests
- complete editing flows
- resolve known gaps
- ship Signals

Primary outcome:

> ATLAS reliably records reality and notices meaningful changes.

---

## ATLAS 1.5 — Actionable

Focus:

- Capacity-Aware Dayline
- Personal Runway
- Financial Scenarios

Primary outcome:

> ATLAS helps the user choose what to do and understand consequences.

---

## ATLAS 2.0 — Reflective

Focus:

- Life Timeline
- Knowledge
- Spaced Repetition

Primary outcome:

> ATLAS remembers the user's history and helps improve retained knowledge.

---

## ATLAS 2.5 — Conversational

Focus:

- Universal Capture

Primary outcome:

> The user can naturally tell ATLAS what happened without navigating multiple forms.

---

## ATLAS 3.0 — Intelligent

Focus:

- ATLAS Analyst

Primary outcome:

> ATLAS can explain patterns across structured personal data while remaining evidence-based.

---

## ATLAS 3.5 — Connected

Focus:

- ATLAS Graph

Primary outcome:

> Goals, tasks, career, money, knowledge, reviews, signals, and future modules behave as parts of one connected system.

---

## Next-generation release checkpoints

Use Section 10 delivery priorities rather than numerical phase IDs:

- **Evidence foundation (9–11):** Tested Tool Layer, evaluated Query Planner,
  then freeform grounded Analyst; no freeform release before planner/evidence gates.
- **History and connections (12–14):** Reproducible metrics, connected
  longitudinal answers, then separately evaluated association discovery.
- **Decision support (15–16):** Existing-engine scenario explanations, then
  inspectable recommendations with confirmed actions.
- **Capture expansion (17–18):** Multi-action proposals and mature confirmation,
  then multimodal inputs through the same pipeline.
- **Outcome review (19):** Deliberate decisions linked to actions and observations;
  basic decision recording can be scoped earlier.

Each checkpoint contains separate tasks and acceptance decisions, not a bundled
implementation of all phases.

# 7. Development Workflow for the AI Agent

Implement one scoped phase at a time in Section 10 delivery order after required
closeout. Phase 1–8 prompts and the Phase 7 procedure are retained historical
briefs, not instructions to repeat completed work. Reuse their source-of-truth services.

## Before Coding

1. Inspect the repository.
2. Inspect relevant schema/migrations.
3. Inspect existing domain utilities.
4. Inspect current UI patterns.
5. Inspect tests.
6. Check whether roadmap docs are stale relative to recent commits.
7. Establish the baseline and required release environment under the acceptance rule; select only the next scoped delivery item and produce a small implementation plan.

## During Coding

1. Keep business logic outside React where practical.
2. Reuse existing helpers/components.
3. Preserve RLS.
4. Avoid duplicating calculations.
5. Use migrations for schema changes.
6. Add tests alongside new business rules.
7. Keep implementation bounded to the phase.

## Before Completion

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
```

Where available and appropriate:

```bash
npm run test:e2e
npm run supabase:test
```

Never run destructive database workflows against production. The current CI
quality job in `.github/workflows/ci.yml` requires lint, typecheck, test and build;
E2E is separately dispatched. Recheck policy at implementation time.
For documentation-only changes, run the installed project formatter only on edited
documents: `npx --no-install prettier --check <edited-document-paths>`.
The package `format` and `format:check` scripts target the whole repository;
do not use them for documentation-only cleanup. Do not claim fresh application,
database or browser results when only documentation was checked.

## Completion Report

For every phase, return:

1. Summary
2. Files created/modified
3. Schema/migration changes
4. Business logic added
5. UI added/changed
6. Tests added
7. Validation results
8. Known limitations
9. Technical debt created
10. Recommended next phase

---

# 8. Final Product Loop

The target ATLAS runtime loop is cyclical, not implementation order. Section 10 defines delivery priority:

```text
CAPTURE
   ↓
STRUCTURED DATA
   ↓
OBSERVE
   ↓
SIGNALS
   ↓
PRIORITIZE
   ↓
DAYLINE
   ↓
ACT
   ↓
MEASURE
   ↓
TIMELINE / REVIEWS
   ↓
LEARN
   ↓
KNOWLEDGE
   ↓
INTERPRET
   ↓
ANALYST
   ↓
CONNECT
   ↓
ATLAS GRAPH
```

This loop is more important than adding a large number of isolated features.

The product should increasingly answer:

1. **What happened?**
2. **What changed?**
3. **What deserves attention?**
4. **What should I do next?**
5. **What happens if I choose differently?**
6. **What have I learned?**
7. **What patterns exist across time?**
8. **How are the different parts of my life connected?**

That is the long-term direction for ATLAS.

---

# 9. North Star

The goal is not:

> Finance app + task app + goal app + career tracker + notes + AI chatbot.

The goal is:

> **ATLAS understands the user's structured reality, helps surface what matters, and provides a clear next move without taking control away from the user.**

Build toward that gradually.

Do not rush the AI layer.

A strong deterministic foundation will make every future AI capability safer, cheaper, more useful, and more trustworthy. Build evaluated planning on the accepted retrieval tools, then freeform evidence handling; richer history and Capture follow delivery priority.

---

# 10. Next-Generation ATLAS Intelligence

**Status:** Phases 9–17 are implemented locally; Phases 12–13 and 16–17 are
deployed and verified. Other required release-environment gates remain open.
Phase 18 is deployed with signed-in acceptance open; Phase 19 is locally accepted with release checks open.

## Dependency map and sequencing decision

<a id="stable-identifiers-and-delivery-priority"></a>

### Phase numbering and delivery order

Phases 1–8 retain their original numbering. Phases 9–19 are numbered in delivery
order. The Tool Layer, Query Planner, Freeform Analyst and Cross-domain Analyst are
implemented locally. References, dependencies
and handoffs use this numbering. Phase
numbers express delivery order; hard prerequisites remain separately defined below.
Legacy section anchors are retained for existing links.

| Delivery priority | Phase | Capability                              | Delivery status                          |
| ----------------- | ----- | --------------------------------------- | ---------------------------------------- |
| 9                 | 9     | Analyst Retrieval / Tool Layer          | Implemented and accepted locally         |
| 10                | 10    | Analyst Query Planner                   | Implemented and accepted locally         |
| 11                | 11    | Analyst 2.0: Freeform Grounded Analysis | Implemented and accepted locally         |
| 12                | 12    | Historical / Longitudinal Metrics Layer | Implemented locally                      |
| 13                | 13    | Cross-domain and Longitudinal Analyst   | Implemented and deployed                 |
| 14                | 14    | Pattern and Association Discovery       | Implemented locally                      |
| 15                | 15    | Scenario Intelligence                   | Implemented locally                      |
| 16                | 16    | Next Best Action                        | Implemented and deployed                 |
| 17                | 17    | Universal Capture 2.0                   | Implemented and deployed                 |
| 18                | 18    | Multimodal Capture                      | Core local flow; release acceptance open |
| 19                | 19    | Decision → Outcome Intelligence         | Implemented locally; hosted release open |

This numbering gives delivery order, not a claim that each phase technically requires all
previous phases. Build and accept one scoped phase at a time. Initial freeform
Analyst uses supported current evidence and available historical queries; the
later Historical Metrics Layer makes broader comparisons reproducible. Never
silently infer history to bridge that sequencing choice.

### Hard prerequisites, enhancements and release blockers

All rows inherit the cross-cutting safety, evidence, evaluation and acceptance
rules below. A prerequisite applies to the capability actually being shipped.

| Phase                    | Delivery priority | Hard prerequisites                                                                                                                                 | Optional enhancements                                          | Release blockers                                                                                          | What can be deferred                                             |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 9 Tool Layer             | 9                 | Required closeout; authenticated owner reads; existing deterministic services and evidence contract                                                | Graph/Timeline adapters where supported; richer history later  | Owner leaks, unbounded/incorrect results, missing source/coverage contracts, incompatible required schema | Planner, freeform UI, unsupported historical metrics             |
| 10 Query Planner         | 10                | Accepted approved Tool Layer (9), validated plans and server execution                                                                             | More tools and optional context                                | Invalid/disallowed calls, budget escapes, unsafe partial failures, failed planner evaluations             | Production freeform interface and mutations                      |
| 11 Freeform Analyst      | 11                | Tested planning (10), Tool Layer (9), evidence/answer validation                                                                                   | Editable preferences and richer history                        | Unsupported figures/citations, owner leaks, missing failure/retry/evidence fallback                       | Questions needing unavailable history; universal domain coverage |
| 12 Historical Metrics    | 12                | Adequate source events or disclosed forward collection, metric/date/coverage definitions                                                           | Graph provenance; stored aggregates if justified               | Snapshot-as-history inference, unreconciled calculations, missingness treated as zero                     | New infrastructure and metrics lacking sufficient history        |
| 13 Cross-domain Analyst  | 13                | Graph (8), adequate historical metrics (12), approved tools/planning/freeform evidence path                                                        | More relationship types and domains                            | Invented connections, invalid historical comparisons, undisclosed link coverage                           | Unlinked/unsupported domain questions                            |
| 14 Association Discovery | 14                | Reliable historical metrics (12), defined method and minimum data requirements; Analyst path for explanations                                      | Graph context and cross-domain presentation (13)               | Small/incomplete or misaligned samples, unaccounted repeated searches, causal overclaims                  | Weak findings and additional methods                             |
| 15 Scenario Intelligence | 15                | Existing Phase 3 engine and Analyst tool/planner/answer path (9, 10, 11)                                                                           | Association findings and historical baselines when appropriate | Engine mismatch, invented payoff rules, hidden assumptions or real-record writes                          | Association discovery; unsupported scenario types                |
| 16 Next Best Action      | 16                | Grounded evidence, Dayline ranking where applicable, user priorities; validated actions for execution                                              | Graph links, history and scenarios for applicable proposals    | Unconfirmed or duplicate execution, unsupported urgency/ranking                                           | Scenario-based advice and broader action coverage                |
| 17 Capture 2.0           | 17                | Current Capture, safe domain actions, owner resolution, review/confirmation contract                                                               | Graph context and Analyst explanation                          | Wrong-record writes, ambiguous confirmation, undefined partial success or duplicate submission            | Next Best Action; unsupported intents                            |
| 18 Multimodal Capture    | 18                | Mature proposal/confirmation handling (17), validated media access and retention/deletion policy                                                   | More media formats and Graph context                           | Silent amount/date save, unsafe files/access, unclear provider sharing                                    | Additional formats and retained source media                     |
| 19 Decision → Outcome    | 19                | Recording: owner-scoped storage and controls; advanced review: linked actions/goals, Timeline, sufficient historical measures and Analyst evidence | Recommendations, associations and multimodal entry             | Invented decisions/outcomes, causal attribution from sequence, missing privacy controls                   | Advanced analysis while deliberate decision recording begins     |

Scenario Intelligence does not depend on Association Discovery. Capture 2.0 may
be explicitly reprioritized earlier if capture friction dominates; it does not
technically depend on Next Best Action. Multimodal Capture needs a mature
proposal/confirmation path. Recording decisions may begin before advanced
outcome analysis. Preserve the default priority above unless a product decision
explicitly changes it and updates all affected next-action guidance.

### Inspected foundations and historical limits

The current local sources establish reuse candidates, not final tool names:

| Existing source                                          | Reuse / limitation                                                                                                                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/analyst/server.ts` and `evidence.ts`            | `retrieveEvidence` supplies seven fixed questions with units, periods, record IDs and completeness. Generalize contracts without promising unsupported history.                                                   |
| `src/lib/graph/server.ts`, `derived.ts`, registry/model  | `getRelatedEntities` authenticates and bounds one-hop native/manual retrieval; derived Signal provenance is separate. Preserve endpoint ownership, `hasMore` and native foreign keys.                             |
| `src/lib/runway/server.ts` and `engine.ts`               | `loadRunwayWorkspace`, `calculateRunway`, `calculateScenario` exist. Wrap calculations with bounded input/output adapters; do not assume every existing loader already meets the new tool budgets.                |
| `src/lib/timeline/server.ts` and Life Timeline migration | `loadTimelinePage` uses the owner-scoped `life_timeline` RPC. Activity contains both presentation snapshots and transition facts; not every row is an immutable historical measurement.                           |
| Career actions and initial/Life Timeline migrations      | Application stage events and Timeline transition facts exist. Verify dates, coverage and duplicate representations before deriving stage history or conversion metrics; present stage counts are not conversions. |
| Money/debt, task, knowledge and review records           | Recorded transactions/payments, supported task completion events, knowledge reviews and weekly scores can support scoped metrics. Inspect edits, deletion, backfill and coverage before promising reconstruction. |

Life Timeline backfills surviving sources and cannot recover deleted legacy
records with no event. Money snapshots can be updated; current goal progress,
task overdue state and balances do not automatically supply prior snapshots.
The existing [Analyst contract](atlas-analyst.md) explicitly limits current debt,
goal and career snapshot claims. No new project, habit, sleep or decision module
is a prerequisite for initial tools; those entities remain future concepts.

**Shared phase contract:** Every future phase below includes goal, user problem,
scope (under proposed architecture), data, deterministic/AI responsibilities,
privacy, failures, acceptance and tests/evaluations. Before implementation, pin
validated input/output schemas, source/owner rules, row/date/evidence budgets,
completeness behavior and mobile design. Reuse the modular monolith; no embeddings,
vector database, queues, Redis, GraphQL or microservices without measured need.

<a id="phase-18--analyst-retrieval--tool-layer"></a>

## Phase 9 — Analyst Retrieval / Tool Layer

**Status:** Implemented and accepted locally, 2026-09-24; delivery priority 9.

See [the implemented Tool Layer contract](analyst-tools.md) for the thirteen
approved tools, exact schemas, budgets, evidence, tests and deployment boundaries.
The candidate capabilities below retain design context; they are not all promised
by the initial registry. No planner, production freeform UI or mutations shipped.

- **Goal:** Build approved, deterministic, read-only tools that future Analyst reasoning can invoke independently.
- **User problem:** Fixed question retrieval cannot safely be reused by a planner until inputs, limits and evidence have consistent contracts.
- **Proposed architecture:** A server-only allowlisted registry wraps existing domain reads/calculations. Candidate capabilities include spending/income summaries, debt balances and recorded payments, task summaries, goal progress, career pipeline and available stage history, weekly review metrics, Signals, Timeline events, Graph-related entities, current runway and existing deterministic scenarios. Knowledge progress and period comparisons are optional supported adapters. Inspect services before final tool names; `getSpendingSummary`, `getIncomeSummary`, `getDebtProgress`, `getDebtPayments`, `getTaskCompletionTrend`, `getOverdueTaskSummary`, `getGoalProgress`, `getCareerPipeline`, `getCareerStageHistory`, `getWeeklyReviewMetrics`, `getSignals`, `getTimelineEvents`, `getKnowledgeProgress`, `getRunway`, `comparePeriods` and `runFinancialScenario` are design examples, not existing API claims. `getRelatedEntities` is an existing Graph helper to adapt; historical trend tools are only eligible when their source coverage supports them.
- **Tool contract:** Validated input schema; server-derived owner identity; allowed filters/date ranges; deterministic calculation rules; bounded output; evidence IDs and source references; units and inspected periods; freshness and completeness; typed failure states. Bound internal retrieval as well as returned rows. A cap cannot silently turn partial sums into complete totals.
- **Data required:** Current source-of-truth records and genuinely available history, inspected above. Unavailable history returns an explicit limitation; no requirement to build the Historical Metrics Layer first.
- **Deterministic / AI responsibilities:** ATLAS authenticates, validates, filters, calculates and packages evidence. No model chooses tools or generates plans in this phase; synthetic evidence fixtures need no provider call.
- **Dependencies:** Required closeout, owner-scoped services, current evidence types and relevant schema. Graph is reused for related-entity tools; scenario tools reuse Phase 3 math. Each adapter must meet the new contract independently.
- **Privacy and security:** Server-derived identity, explicit owner filters and RLS on every invocation, server-only credentials, bounded/minimized retrieval, and no private prompts/evidence logged by default. Treat stored and returned text as untrusted.
- **Failure behavior:** Typed invalid-input, unauthenticated, unavailable-source/setup, timeout, partial, insufficient-history and stale-data results; cross-owner IDs reveal no private existence. Reuse cross-cutting model/quota/provider error distinctions where applicable, without adding provider calls to tools.
- **UX / mobile:** No new freeform UI. Evidence fields must support readable, accessible source/period/completeness display; verify any affected existing surface on mobile.
- **Acceptance criteria:** Tools can be invoked and tested independently, enforce ownership, reuse deterministic calculations, obey budgets and return consistent inspectable evidence with honest data limitations.
- **Testing / evaluation:** Synthetic evidence fixtures, schema/filter/date bounds, exact calculations, centavo/timezone edges, row caps, freshness/missingness, two-owner isolation, injection-like stored text, unavailable history, invalid IDs and typed failures. Verify relevant schema compatibility and independent invocation without AI.
- **Out of scope:** AI query planner, production freeform Analyst UI, unrestricted SQL, mutation tools, new calculation engines and invented history.
- **Following delivery:** Analyst Query Planner (Phase 10, priority 10).

<a id="phase-11--analyst-query-planner-and-approved-read-only-tools"></a>

<a id="phase-11--analyst-query-planner"></a>

## Phase 10 — Analyst Query Planner

**Status:** Implemented and accepted locally, 2026-09-24; delivery priority 10.

See [the implemented Query Planner contract](analyst-query-planner.md) for the
strict plan schema, authentication and execution boundary, budgets, typed
failures, synthetic evaluation and release limits. No production freeform UI or
answer generation shipped.

- **Goal:** Let the model choose _what information it needs_ while ATLAS controls
  _how that information is safely retrieved and calculated_.
- **User problem:** The seven exact current questions are grounded but block
  broader questions, and simply adding more exact strings will not scale.
- **Example interaction:** “What is blocking my developer-job goal?” can request
  goal progress, related tasks, career pipeline, and knowledge review evidence.
- **Proposed architecture:** Question → validated plan → approved tool execution → evidence. Use only accepted Phase 9 tools; answer presentation ships in Phase 11 after planner evaluation. The tool catalog is defined by inspected services, not model-generated names.
- **Data required:** Accepted tool schemas and evidence contracts; Graph edges or historical metrics only for tools that actually use them. No new history collection is required for the planner itself.
- **Deterministic / AI responsibilities:** The planner selects and sequences
  approved information needs. ATLAS authenticates, authorizes, retrieves,
  calculates, validates arguments, and packages evidence. The model receives
  neither arbitrary SQL nor unrestricted table access.
- **Privacy and security:** Read-only allowlist, RLS, server-derived identity,
  per-tool owner checks, minimum necessary fields, prompt-injection isolation,
  and no mutation tool exposed in Analyst.
- **Failure behavior:** Reject unsupported tool requests or invalid arguments;
  return typed partial/insufficient evidence on source gaps. A tool failure
  cannot become a fabricated answer.
- **UX / mobile:** Show the inspected period, evidence and source links; hide
  raw tool mechanics by default while offering an understandable “How this was
  answered” view on mobile.
- **Acceptance criteria:** Synthetic questions produce valid allowlisted plans and owner-scoped evidence within explicit call, context, token, cost and execution-time limits. Strict argument validation and server permissions apply on every invocation; ambiguous entity references require clarification. Partial tool failures remain explicit.
- **Testing:** Tool schema/limit tests, two-user isolation, prompt injection,
  tool rejection, stale Graph edges, row caps, and deterministic recalculation.
- **AI evaluation:** Synthetic planner cases score tool choice, missing-tool
  recognition, unnecessary retrieval, and correct handling of denied tools.
- **Known limitations:** A planner may choose insufficient tools; the system
  needs a bounded retry or a clear missing-evidence answer.
- **Dependencies:** Accepted Phase 9 Tool Layer, current Analyst evidence and operating limits. Historical metrics and Graph are required only for tools whose scope uses them, not all planning.
- **Out of scope:** Model-generated SQL, arbitrary URLs, direct table access, unrestricted execution, mutation tools and production freeform UI before evaluations pass. User text, stored records and tool-returned text are all untrusted; operational metadata must not log private prompts.
- **Following delivery:** Freeform Analyst 2.0 (Phase 11, delivery priority 11).

<a id="phase-12--analyst-20-freeform-grounded-analysis"></a>

## Phase 11 — Analyst 2.0: freeform grounded analysis

**Status:** Implemented and accepted locally, 2026-09-25; delivery priority 11.

See [the Phase 11 contract](analyst-freeform.md) for the implemented bounded
flow, evidence validation, local acceptance and hosted release limits.

- **Goal:** Answer broader, multi-step questions using only approved evidence.
- **User problem:** “Why does it feel like I am not making financial progress?”,
  “What changed in my life last month?”, and “Where am I losing momentum?”
  require several sources and cannot fit one exact template. Initial examples are bounded: recorded spending changes, attention around a goal, overdue career follow-ups and how linked records connect. Broader questions remain limited by available evidence.
- **Example interaction:** For “Why am I struggling financially despite paying
  debt?”, a bounded plan retrieves income, expenses, payments, current balances,
  runway, spending changes, and comparable periods, then synthesizes a cited
  explanation. It distinguishes observed changes from possible explanations.
- **Proposed architecture:** The Phase 10 planner may orchestrate multiple Phase 9 tools,
  collect typed evidence IDs, and generate structured claims with citations.
  Enforce maximum tool calls, evidence bytes, lookback, execution time,
  output tokens, estimated cost, and per-user quotas. Server-side validation
  checks citations, figures, and allowed claim types; evidence-only fallback
  remains available.
- **Data required:** Approved tool results only, including completeness and
  comparison metadata; no automatic whole-database context.
- **Deterministic / AI responsibilities:** ATLAS computes numbers and checks
  support. AI plans, connects, compares, and explains with explicit uncertainty.
- **Privacy and security:** Existing consent and minimal disclosure remain;
  owner-scoped RLS retrieval, untrusted record text, no provider credentials or
  write capability in the model context.
- **Failure behavior:** Unsupported question, missing data, tool budget,
  provider timeout, invalid citation, or contradictory claim each has a typed
  result; show verified facts where possible, clear retry controls, and deterministic evidence when the AI explanation fails.
- **UX / mobile:** Answer has concise summary, evidence chips, source records,
  period and calculation basis, missing data, uncertainty, and expandable
  reasoning trail. On mobile, citations remain tap-friendly and close to claims.
- **Acceptance criteria:** Broader questions can be answered without exact
  wording, every material claim cites supplied evidence, and ungrounded or
  over-budget paths stop safely. The complete question → tools → evidence → answer flow distinguishes facts, interpretations and recommendations, shows inspected period/completeness and missing information, and uses only ATLAS-calculated authoritative figures.
- **Testing:** Multi-step plans, limits, missing data, contradictory evidence,
  invalid IDs, provider failure, cross-user isolation, mobile citation flows.
- **AI evaluation:** Separate synthetic cases for grounding, fabricated facts,
  causal overclaims, planner choice, cross-domain synthesis, uncertainty, and
  injection in stored content.
- **Known limitations:** Freeform does not mean unlimited topics; only domains
  covered by approved tools and sufficient data can be answered.
- **Dependencies:** Phase 10 and its evidence validation, operational controls.
- **Out of scope:** Autonomous actions, general web research, unrestricted SQL.
- **Following delivery:** Historical Metrics (Phase 12, delivery priority 12). Keep existing supported questions as presets where useful.

<a id="phase-10--deterministic-historical-metrics"></a>

## Phase 12 — Deterministic historical metrics

**Status:** Implemented, deployed and verified in the hosted environment on 2026-09-25; delivery priority 12. See [metric contract](historical-metrics.md).

- **Goal:** Provide inspectable daily, weekly, and monthly history for Analyst,
  Signals, Graph paths, and decision reviews.
- **User problem:** Current Analyst can show snapshots and short comparisons but
  cannot reliably answer “Which months were strongest?” or “Which goals keep
  stalling?” from long histories.
- **Example interaction:** “How did my finances and task completion change over
  six months?” returns period-aligned totals with missing-data labels.
- **Proposed architecture:** Define versioned metric contracts and deterministic
  aggregation from source records. Begin with request-time queries or simple
  materialization; pre-aggregate only where measured row counts or latency
  warrant it. Support backfills, corrections, invalidation, and source links.
  Do not send thousands of raw rows to a model.
- **Data required:** Transactions, accounts, debt payments/balances, tasks,
  applications and stage history, goals/milestones, knowledge reviews, weekly
  reviews, and Signals; use timeline events where they represent durable source
  changes. Conceptual weekly fields include week start, income, expenses, cash
  flow delta, debt payments/current debt, task completions/overdue count,
  applications/interviews, goal progress changes, knowledge reviews, energy,
  stress, overall review score, and signal counts. These are candidate metrics, not promises of available history. Define source, date semantics, exclusions, coverage and completeness for each.
- **Deterministic / AI responsibilities:** ATLAS defines periods, units,
  centavo arithmetic, denominators, missingness, and metric versions. AI selects
  relevant metrics and explains supported changes; it cannot invent trends.
- **Privacy and security:** Owner-scoped aggregation with RLS and explicit
  ownership filters; bound lookbacks and result sizes. Retain only justified
  historical derivatives and honor data deletion.
- **Failure behavior:** Missing source history yields “insufficient” or
  “partial,” never a zero that masquerades as complete data. Stale materialized
  metrics are marked or recomputed.
- **UX / mobile:** Period, comparison basis, source count, coverage, and update
  time are visible. Small-screen charts have a readable table alternative.
- **Acceptance criteria:** Metrics reconcile to source records, reproduce after
  backfill, reflect edits/deletions, and refuse misleading comparisons.
- **Testing:** Calendar and Asia/Manila boundary tests, centavo overflow and
  rounding, sparse history, edits, deleted records, and two-user isolation.
- **AI evaluation:** Synthetic questions test whether interpretations respect
  coverage and avoid fabricated trends.
- **Known limitations:** Historical events and current-state snapshots differ. Never infer past overdue counts from today's task state, past goal progress from today's progress field, or historical balances without adequate transactions/snapshots. Start collecting unavailable history going forward and disclose its start date. Recompute deterministically after late edits, corrections and deletions with versioned definitions where needed. Missing data stays distinct from zero.
- **Dependencies:** Sufficient source events or explicitly scoped forward collection and existing deterministic domain services. Reuse Timeline where suitable; Graph is optional provenance enrichment. No Analyst planner or Capture 2.0 is required to build metrics.
- **Out of scope:** Hidden life scores or model-generated metric definitions.
- **Following delivery:** Cross-domain and Longitudinal Analyst (Phase 13, delivery priority 13).

<a id="phase-13--cross-domain-longitudinal-and-association-discovery"></a>

## Phase 13 — Cross-domain and Longitudinal Analyst

**Status:** Implemented and verified in production. See [Phase 13 contract](cross-domain-analyst.md).

- **Goal:** Combine Graph, reliable historical metrics, Timeline, Signals and approved tools for traceable cross-domain comparisons. Association discovery is separately scoped in Phase 14.
- **User problem:** A person cannot easily see what changed around a goal across several linked activities over time.
- **Example interaction:** “What changed around this goal over three months?”, “Which linked activities progressed while this goal stalled?”, or “How did my recorded spending and task completion change together?”
- **Proposed architecture:** Align versioned Phase 12 metrics by comparable periods; use explicit/native Graph paths to identify connected entities. Distinguish derived Signal provenance from permanent links. Absent links or missing records are not proof of no activity. Never infer unrelated records support the same goal.
- **Data required:** Historical metrics, source coverage, Graph relationships,
  and optional weekly review scores. Sleep or habit data appears only if future
  modules actually collect it.
- **Deterministic / AI responsibilities:** ATLAS calculates comparisons and resolves relationship paths; AI explains supported observations with limitations. No causal inference from chronological sequence.
- **Privacy and security:** Owner-scoped bounded analysis; suppress small or
  incomplete samples and minimize sensitive review text sent to models.
- **Failure behavior:** Sparse, incomparable, or confounded periods produce no
  pattern claim and explain why. No zero-filling missing data.
- **UX / mobile:** Show periods, coverage, relationship paths, missingness and source records in readable cards/charts.
- **Acceptance criteria:** Cross-domain answers have traceable relationship paths, valid historical comparisons and clear limitations; no fabricated goal links or historical progress.
- **Testing:** Synthetic linked/unlinked records, sparse and shifted periods, unavailable progress history, deleted sources, owner isolation and mobile evidence flows.
- **AI evaluation:** Measure invented connection and causal-claim rates, weak-evidence refusal and cross-domain explanation quality.
- **Known limitations:** Observational data and Graph coverage are incomplete. A current relationship does not prove it existed throughout the comparison period.
- **Dependencies:** Phases 8, 12, and 11.
- **Out of scope:** Association discovery (Phase 14), medical inference, hidden behavioral scoring and causal claims.
- **Following delivery:** Pattern and Association Discovery (Phase 14, delivery priority 14).

<a id="phase-19--pattern-and-association-discovery"></a>

## Phase 14 — Pattern and Association Discovery

**Status:** Implemented locally, 2026-09-25; hosted verification pending. See [Phase 14 contract](pattern-associations.md). Separated from Phase 13 comparison work.

- **Goal:** Identify evidence-backed associations across sufficiently complete history.
- **User problem:** Users struggle to notice repeated combinations, such as recorded stress and task completion moving together, without mistaking chance for a reliable pattern.
- **Example interaction:** “Did my recorded job-search activity and career momentum move together?” or “Which periods did dining spending coincide with budget overruns?” Only supported sources and definitions qualify.
- **Proposed architecture:** Align versioned historical metrics by comparable observation periods. Deterministic methods enforce minimum data, sample-size and missingness requirements before reporting findings; account for repeated searches, chance findings, outliers and confounding. Show method, sample size, inspected period and limitations. Withhold findings that fail thresholds; never fabricate confidence scores.
- **Data required:** Reliable historical metrics, coverage and source references; optional Graph relationships and weekly review scores. Sleep/habit data is unavailable unless separately collected by a future module.
- **Deterministic / AI responsibilities:** ATLAS calculates independently testable association statistics; AI explains qualified observations using association language, not unsupported causal claims.
- **Dependencies:** Reliable Phase 12 history and validated statistical contracts; accepted Analyst path for AI explanations. Phase 13/Graph can enrich context but are not universal statistical prerequisites.
- **Privacy and security:** Owner-scoped bounded calculations and minimal provider disclosure. No private review prose in default logs or evaluation corpora; respect deletion and retention.
- **Failure behavior:** Sparse, shifted, incomplete or incomparable samples produce no finding or an explicitly qualified exploratory observation. Missingness is not zero; uncertainty cannot be hidden behind a model score.
- **UX / mobile:** Readable evidence cards/charts with table alternatives, source links, methods, sample counts and clear association labels.
- **Acceptance criteria:** Pattern calculations are independently reproducible and testable; uncertain findings are withheld or clearly qualified, and explanations do not claim causation.
- **Testing / evaluation:** Synthetic correlated/uncorrelated series, small samples, missing/shifted periods, outliers, repeated-search false positives, edits/deletions and owner isolation. Measure false-pattern and causal-claim rates, weak-evidence refusal and faithful reporting of method/limitations.
- **Out of scope:** Causal inference from mere co-movement, medical inference, hidden behavioral scores, fabricated confidence and new uncollected domains.
- **Following delivery:** Scenario Intelligence (Phase 15, priority 15), which does not technically depend on this phase.

<a id="phase-14--scenario-intelligence"></a>

## Phase 15 — Scenario intelligence

**Status:** Implemented locally; delivery priority 15. See [Phase 15 contract](scenario-intelligence.md) for supported calculations and release boundaries.

- **Goal:** Let Analyst explain options calculated by existing deterministic
  scenario engines.
- **User problem:** Users can run a financial scenario but need help comparing
  it with alternatives and understanding assumptions.
- **Example interaction:** “Compare paying an extra ₱10,000 toward debt next
  month with keeping it as emergency cash” or “What happens to runway if income
  falls by 20%?”
- **Proposed architecture:** Question → planner → validated scenario inputs →
  `calculateScenario`/runway or another approved deterministic engine → typed
  baseline and alternatives → cited explanation. Add a scenario tool only for
  calculations the domain engine actually supports; expand payoff modeling
  separately before promising payoff timelines.
- **Data required:** Owner-scoped current financial state, user-editable
  assumptions, calculation version, baseline, and scenario results.
- **Deterministic / AI responsibilities:** ATLAS validates amounts and dates,
  calculates outcomes, and labels assumptions. AI explains tradeoffs and
  uncertainties, never independently computes authoritative figures.
- **Privacy and security:** Read-only simulations, bounded input ranges and
  owner data, explicit user confirmation for any later real-world mutation.
- **Failure behavior:** Unsupported scenario, missing baseline, or invalid
  assumptions return a clear limitation and a path to edit inputs.
- **UX / mobile:** Baseline and alternatives appear side by side or stacked with
  the same units, assumptions, uncertainty, and a financial-decision caution.
- **Acceptance criteria:** Rendered outcomes exactly match the engine; no
  simulation changes source records or implies a guaranteed result.
- **Testing:** Engine parity, edge inputs, scenario order, stale data, partial
  baseline, ownership, and mobile comparison layout.
- **AI evaluation:** Detect invented calculations, omitted assumptions, biased
  framing, and bad interpretation of deterministic results.
- **Known limitations:** Today's runway engine is a projection with specified
  assumptions, not a general financial planner or complete debt payoff engine.
- **Dependencies:** Current runway/scenario engine and accepted Analyst tool/planner/answer path (Phases 9, 10, 11). Association discovery is not a prerequisite.
- **Out of scope:** Rebuilding the financial engine, mutating real financial records, invented payoff dates, unsupported financial rules, financial transactions or automatic plan execution.
- **Following delivery:** Next Best Action (Phase 16, delivery priority 16).

<a id="phase-15--next-best-action"></a>

## Phase 16 — Next Best Action

**Status:** Implemented and deployed, 2026-09-25. See [Phase 16 contract](next-best-action.md).

- **Goal:** Offer a small number of grounded, inspectable actions for the user
  to choose from.
- **User problem:** Signals and analysis can reveal problems without making a
  concrete next step easy to assess.
- **Example interaction:** “Follow up on these three overdue applications”
  explains that all passed their follow-up dates and no interviews are currently
  scheduled, then offers View applications and Create follow-up tasks.
- **Proposed architecture:** Deterministic eligibility and priority candidates
  from Signals, Dayline, goals, Graph, and metrics; Analyst may compare and
  phrase them. A recommendation record or response includes proposed action,
  reason, evidence IDs, urgency basis, related goal/records, uncertainty, and
  possible user action. Only an explicit confirmation invokes an existing
  domain mutation.
- **Data required:** Current task/application state, relevant goal and Graph
  links, Signals, dates, and source-backed metrics.
- **Deterministic / AI responsibilities:** ATLAS determines eligibility,
  urgency rules, action validity, and execution. AI can explain and rank within
  allowed evidence; it cannot invent an overdue state or execute the action.
- **Privacy and security:** Owner-scoped candidates; no autonomous external
  communication, deletion, or financial action; revalidate before execution.
- **Failure behavior:** Stale recommendations disappear or ask to refresh;
  uncertain evidence yields a lower-confidence suggestion or no suggestion.
- **UX / mobile:** One clear action at a time, compact “why” and uncertainty,
  visible source links, dismiss control, and large touch targets. Avoid alert
  fatigue and unexplained scores.
- **Acceptance criteria:** Every recommendation has evidence and an explicit
  user choice; execution uses existing deterministic services, explicit confirmation and duplicate-execution protection. Show proposed action, related goal (or no known link), evidence, ranking reason, urgency and uncertainty. Preference-based advice is not objectively optimal.
- **Testing:** Eligibility/ranking, stale state, dismissal, confirmation,
  ownership, no-action cases, and mobile review.
- **AI evaluation:** Synthetic cases for irrelevant or unsafe suggestions,
  evidence mismatch, urgency overstatement, and useful explanation.
- **Known limitations:** Ranking reflects incomplete recorded reality; it
  should never imply a universal “best” choice.
- **Dependencies:** Evidence/answer path and validated domain actions for executable proposals. Reuse existing Dayline ranking and user priorities instead of creating a competing opaque prioritizer. Graph is required for linked-goal claims; history and Phase 15 scenarios are enhancements only when the recommendation uses them.
- **Out of scope:** Background agents, automatic task creation, external contact.
- **Following delivery:** Universal Capture 2.0 (Phase 17, delivery priority 17).

<a id="phase-9--universal-capture-20-and-entity-resolution"></a>

## Phase 17 — Universal Capture 2.0 and entity resolution

**Status:** Implemented and deployed; production acceptance recorded. See
[the Phase 17 contract](universal-capture-2.md#production-acceptance).

- **Goal:** Make Capture the general natural-language ingestion layer for
  existing ATLAS actions, with several independent, reviewable proposals.
- **User problem:** A single sentence can describe several events and refer to
  existing records by name, while today's one-action parser rejects it.
- **Example interaction:** “Paid ₱2,500 to Billease, spent ₱380 on groceries
  using GCash, applied to Acme as a PHP developer, and remind me to follow up
  Friday” yields debt-payment, expense, application, and task proposals.
  “Move interview prep to tomorrow” resolves an existing task; “Paid 2k today”
  asks whether this was a debt payment, expense, transfer, or something else.
- **Proposed architecture:** Parse into a bounded batch of typed proposals with
  source spans; retrieve small, owner-scoped candidate sets for names; rank
  candidates without treating a model guess as an ID; validate each proposal;
  then preview. Support Review All, confirm one, confirm all, reject one, and
  correct fields. Confirm-all must show every effect and use an explicit user
  action; define transaction and partial-failure semantics before shipping.
  One targeted, bounded clarification can fill a required field and returns to
  preview. No silent execution.
- **Data required:** Candidate accounts, debts, open tasks, active goals,
  applications, concepts, and the existing mutation contracts; retrieve only
  the relevant types and a capped number of candidates. Never dump a database
  into a prompt.
- **Deterministic / AI responsibilities:** AI segments text, classifies,
  extracts, and suggests candidate references. ATLAS checks exact ownership,
  confidence thresholds, amount/date/category rules, record state, conflicts,
  and executes confirmed existing domain actions. Missing financial fields are
  never invented.
- **Privacy and security:** Authenticate server-side, use RLS as the final
  boundary, ignore browser-supplied owner IDs, treat user text and stored titles
  as untrusted, bind preview IDs to the owner and current records, and revalidate
  at confirmation. No direct model writes or service-role credentials.
- **Failure behavior:** Ambiguous matches produce named choices; unsupported
  actions and missing required fields remain unsaved with a manual path. A
  failed proposal must not be reported as saved. Provider failure must leave
  manual forms available.
- **UX / mobile:** Review cards show type, source phrase, resolved record,
  amount/date, warnings, and correction controls. Sticky or reachable actions,
  large touch targets, and a compact batch summary work at narrow widths.
- **Acceptance criteria:** Each independent proposal can be corrected,
  confirmed, or rejected; ambiguous references cannot update a record; every
  saved action uses the existing deterministic service and has an auditable
  confirmation path.
- **Testing:** Unit and integration tests for segmentation, resolution, owner
  isolation, stale/deleted targets, correction, duplicate confirmation,
  all/individual confirmation, and partial failures; mobile and keyboard flow.
- **AI evaluation:** Synthetic mixed-intent cases measure extraction recall,
  wrong-record rate, hallucinated amounts/dates, clarification quality,
  unsupported intents, and adversarial text separately from unit tests.
- **Known limitations:** Some domain actions may need safe preview support;
  bulk atomicity and conflict rules must be designed per action. Coverage grows
  only when an existing deterministic action is ready.
- **Dependencies:** Current Capture, validated domain actions, owner-scoped entity resolution and confirmation. Reuse Graph candidate retrieval where useful. Next Best Action is not required; Capture 2.0 can move earlier if capture friction becomes the dominant user problem.
- **Out of scope:** Autonomous writes, arbitrary edits, and direct SQL from the
  model. Multimodal inputs wait for Phase 18. Recording a debt payment is a database-record action, not authorization to move money through an external provider. Preserve native relationships rather than duplicate them as manual Graph edges.
- **Following delivery:** Multimodal Capture (Phase 18, delivery priority 18).

Candidate intent backlog: expense, income, account transfer, debt payment,
debt creation, task creation/update/completion, goal, milestone and goal-progress
changes, career application/stage/follow-up, knowledge concept/update, weekly
review input, budget changes, and later supported entities. Each needs its own
validation and preview contract; this list does not claim current support.

<a id="phase-17--multimodal-universal-capture"></a>

## Phase 18 — Multimodal Universal Capture

**Status:** Implemented and deployed 2026-09-26; signed-in browser acceptance open. See [Phase 18 contract](multimodal-capture.md).

- **Goal:** Accept text, voice transcription, receipts/photos, screenshots,
  copied email, and uploaded documents through the same Capture proposal flow.
- **User problem:** Important events arrive in formats other than typed text;
  manual re-entry loses context and provenance.
- **Example interaction:** A receipt image proposes an expense; a job-offer
  screenshot proposes a career update; “Spent ₱800 on gas and remind me to pay
  Meralco tomorrow” as a voice note proposes an expense and a task.
- **Proposed architecture:** Ingest with file/type/size validation → extract
  text or fields → normalize to Phase 17 proposal schema with source location,
  extraction method and confidence → resolve entities → preview/correct →
  explicit confirmation → existing deterministic mutation. Keep source files
  only under a defined storage, deletion, and retention policy.
- **Data required:** User-provided media, extraction provenance, limited
  owner-scoped candidate context, existing Capture actions.
- **Deterministic / AI responsibilities:** OCR/transcription/models extract and
  classify. ATLAS validates fields, ownership, dates, centavos, duplicate risk,
  and performs confirmed mutations. OCR never authorizes a financial amount.
- **Privacy and security:** File scanning and content/size controls, private
  storage and short-lived access, prompt-injection handling inside documents,
  minimum necessary model disclosure, explicit deletion/retention controls.
- **Failure behavior:** Unreadable media or conflicting fields become an
  editable draft or manual form; no automatic save or guessed amount.
- **UX / mobile:** Camera and share-friendly entry, accessible transcript/text
  correction, source snippet beside each extracted field, clear upload status,
  and small-screen proposal review. Show extracted fields and provenance, flag confidence/ambiguity, and explicitly confirm consequential amounts and dates; never silently save them.
- **Acceptance criteria:** All formats converge on the same validated proposal
  and confirmation boundary; provenance is visible and corrections persist.
- **Testing:** File validation, OCR/transcription errors, duplicate receipts,
  ambiguous amounts/dates, owner isolation, deletion, and mobile capture flow.
- **AI evaluation:** Synthetic documents/audio text for extraction accuracy,
  amount/date hallucination, injection, and multi-action splitting; never use
  private user media as an evaluation corpus by default.
- **Known limitations:** Format quality and provider support vary; copied text
  can ship before image or audio without creating a separate subsystem.
- **Dependencies:** Mature Phase 17 proposal/clarification/confirmation handling, secure media access and defined retention/deletion/provider-sharing boundaries. Reuse owner-scoped resolution; Graph is optional context.
- **Out of scope:** Autonomous inbox monitoring or unseen background imports.
- **Following delivery:** Decision → Outcome Intelligence (Phase 19, delivery priority 19).

<a id="phase-16--decision-journal-and-decision--outcome-intelligence"></a>

## Phase 19 — Decision journal and decision → outcome intelligence

**Status:** Implemented and locally accepted; hosted release open. See [Phase 19 contract](decision-outcomes.md). Delivery priority 19.

- **Goal:** Record meaningful user decisions, connect them to intended goals,
  and later inspect what happened.
- **User problem:** Users forget which strategies they tried and confuse later
  change with proof that a decision worked.
- **Example interaction:** Record “Apply to ten jobs weekly,” then inspect
  application and interview rates after several weeks. Other examples include
  reducing food delivery or focusing on Next.js learning.
- **Proposed architecture:** User-visible decision, date, intent, expected
  outcome, review date, and optional related entities; Graph edges link the
  decision to goals, actions, and observed outcomes; Timeline places both in
  sequence; historical metrics compare defined before/after windows. Analyst
  explains observations with alternative explanations and missing data.
- **Data required:** Explicit decision date, user-stated rationale and assumptions, outcome measures and observation windows, user-entered decision context, source events, Graph links,
  historical metrics, and review notes; record only what the user chose to keep.
- **Deterministic / AI responsibilities:** ATLAS stores the decision and computes
  comparisons. AI summarizes what followed and suggests interpretations; it
  cannot infer that the decision caused an outcome.
- **Privacy and security:** Strict owner scope, editable/deletable journal,
  explicit retention/export behavior, confirmation for inferred permanent links.
- **Failure behavior:** Insufficient follow-up time or baseline yields a pending
  or inconclusive review, not a success claim.
- **UX / mobile:** Simple decision entry, reminder for review only if opted in,
  clear timeline and before/after evidence on narrow screens.
- **Acceptance criteria:** A decision and its later observations can be traced
  to source records, revised, and deleted; wording distinguishes sequence,
  association, and supported causation.
- **Testing:** Ownership, linking, deletion, comparison windows, delayed data,
  changed plans, and mobile journal flow.
- **AI evaluation:** Synthetic examples test hindsight bias, causal overclaim,
  missing-baseline refusal, and faithful summaries.
- **Known limitations:** Personal before/after data rarely isolates causal
  effects. Decisions with no measurable outcome remain valid journal entries.
- **Dependencies:** Basic recording needs only validated owner-scoped decision storage and user controls and can begin earlier. Advanced outcome review needs Timeline, Graph, reliable historical measures and the Analyst path. Phase 16 feedback is optional; Multimodal Capture is not required.
- **Out of scope:** Inventing past decisions, causal claims based only on sequence, automated judgment of personal choices or covert tracking.
- **Following delivery:** Reassess product evidence before defining another phase.

## Cross-cutting architecture and release gates

These capabilities are not separate reasons to create infrastructure up front.
Phase 9 establishes the read-tool boundary; extend these gates with each following phase.
Do not defer these gates until freeform AI has shipped. Require typed errors for
setup, model availability, application quotas, provider failures, timeouts and
invalid output; safe metadata including requested/resolved model when available,
tool-call counts/latency, token/cost budgets; synthetic evaluations, evidence
validation, owner-isolation and prompt-injection tests; mobile/accessibility checks
for affected surfaces; and deployment/schema compatibility checks.

### Explainable evidence and claim types

Every meaningful conclusion must answer “Why is ATLAS telling me this?” Use the
current Analyst evidence contract as the starting point: stable evidence IDs,
metric/value/unit, period, comparison basis, bounded source IDs and links, and
completeness. Extend it to include calculation/version, Graph relationship path,
missing data, uncertainty, and approved tool provenance when needed. Keep
authoritative numbers in server-rendered evidence; the model provides prose.

Label claims as **FACT**, **TREND**, **ASSOCIATION**, **INTERPRETATION**,
**SCENARIO**, or **RECOMMENDATION**. A fact is a deterministic observation; a
trend is a deterministic comparison; an association is an observed co-movement;
an interpretation is an AI explanation; a scenario is a calculation under
assumptions; a recommendation is a proposed action. Each label has its own
evidence and uncertainty requirements. Evidence chips and source links should
work with touch and keyboard, stay near claims, and expose inspected periods and
data gaps without requiring a technical user to read internal tool traces.

### Personal context inside ATLAS

Prefer structured, user-visible and editable preferences over opaque model
memory: preferred work schedule, financial priorities, active major goals,
user-set risk tolerance, preferred categories, response style, and explicit
personal rules. Read only relevant preferences for a request. Show what context
was used, let the user correct or remove it, and honor export/deletion controls.
Do not silently accumulate arbitrary prose from conversations as permanent
memory. Existing `user_preferences` is a possible starting point, not proof
that these proposed fields exist today. Attach preferences to freeform Analyst and Next Best Action as optional enhancements, not a new blocking phase.

<a id="implementation-agent-handoffs-for-the-first-new-foundations"></a>

### Implementation-agent handoffs

Select one delivery item per task. Historical Phase 1–8 briefs above are retained
for reference, not rebuilding.

**Completed local implementation reference: Phase 9 Tool Layer (delivery priority 9).**

The following original handoff is retained for traceability; do not rebuild the
accepted [Tool Layer](analyst-tools.md).

```text
After required release closeout checks pass, implement only the Analyst Retrieval /
Tool Layer. Inspect current local changes, Analyst retrieveEvidence/evidence types,
Graph getRelatedEntities, Timeline loadTimelinePage, Signals, loadRunwayWorkspace,
calculateRunway and calculateScenario plus their tests and migrations. Establish
baseline and target-environment requirements. Define a bounded read-only tool
registry with validated inputs, server-derived identity, permitted filters/date
ranges, deterministic calculations, output caps, evidence IDs/source references,
units/periods, freshness/completeness and typed failures. Final tool names follow
inspected services. Wrap/reuse calculations; do not rebuild existing modules.
Use current records and genuinely available history; report unsupported history.
Add independent invocation tests, synthetic evidence fixtures, owner-isolation and
injection tests, safe metadata and budgets. Report scoped acceptance, baseline
comparison, deployment needs and remaining unknowns separately.
No AI planner, freeform UI, mutations or unrestricted SQL in this task.
```

**Implemented handoff: Phase 10 Query Planner (delivery priority 10).**

```text
Use only accepted Phase 9 tools. Build question → validated bounded plan →
server-authorized execution → evidence. Enforce allowlist, schemas, calls, context,
tokens, cost and time limits. Clarify ambiguous references; reject unsupported
questions; preserve partial failures. Treat all text as untrusted. Use synthetic
plan/ownership/injection/budget evaluations and safe operational metadata.
Do not ship freeform production UI or any mutation capability in this phase.
```

**Later foundations, selected separately:** For Phase 12 metrics, define versioned
sources, date semantics, exclusions and coverage; reconcile backfills/corrections
without inventing snapshots. For Phase 17 Capture 2.0, inspect current preview and
domain actions; build bounded batches, owner resolution, targeted clarification,
independent review and explicit partial-success/duplicate-confirmation behavior.
Neither is a prerequisite for the initial read-only Tool Layer.

### Cost-aware routing, quotas, and observability

ATLAS currently has separate server-side model lists and defaults for Capture
and Analyst, plus request quotas. Future automatic routing can choose a small
model for straightforward extraction, a small/medium model for resolution, a
capable reasoning model for normal analysis, and a frontier model for genuinely
complex multi-domain work. Route on complexity, cost, latency, capability,
structured-output support, and reasoning needs; allow a user override where
safe. Prefer deterministic logic whenever it suffices. Resolve and validate
the actual model server-side, including deployment allowlist compatibility. Preserve explicit user choices unless a documented fallback is authorized. Never silently switch models and label output as the originally selected model. Routing can grow with planner/freeform usage; richer aggregate diagnostics grow with operations, neither needs an extra blocking phase.

For each request, retain safe operational metadata: feature, requested and
resolved model, timestamp, latency, provider status, input/output tokens,
estimated cost, reasoning mode, approved tool names/counts, outcome, and
fallback. Avoid storing prompts, answers, private evidence, or credentials for
observability by default. A developer-facing diagnostics view may show aggregate
failure rates, quota/model mismatch, cost and latency without exposing private
content. Define retention and access controls before persisting metadata.

Use typed failure codes across Capture and Analyst: invalid model, database
allowlist mismatch, hourly/daily/site quota, provider rate limit, model access,
timeout, malformed structured output, setup error, and retrieval error are
different conditions. Preserve precise safe reasons in diagnostics while the UI
uses helpful language. Current Analyst already distinguishes several of these
through its typed reservation RPC and evidence-only fallback; Capture's quota
path is less specific and can be improved when that flow is stabilized. Do not
regress the existing distinction by calling every failure “limit reached.”

### Evaluation, privacy, and action boundary

Normal unit and integration tests verify deterministic contracts. A separate
AI evaluation suite uses synthetic fixtures and versioned expected behavior:
Capture extraction, multi-action parsing, wrong-entity matches, hallucinated
amounts/dates, ambiguity and injection; Analyst retrieval/tool choice, correct
evidence IDs, grounding, false causal claims, scenario interpretation, missing
uncertainty, and cross-domain reasoning. Record model/configuration versions,
failure categories, and quality thresholds. Review regressions before widening
an intent, tool, model, or context budget. Do not use private user data as the
default evaluation corpus.

RLS stays the final owner boundary, with server-derived identity and explicit
owner filters. Models receive neither database nor service-role credentials and
cannot query arbitrary tables. Retrieval is bounded and minimizes sensitive
fields. Stored notes, imported files, and user text are untrusted data. Money
remains integer centavos; Asia/Manila dates and business rules stay in ATLAS.
All AI-generated mutations go through a user-visible proposal and an existing
validated domain action. Permanent inferred relationships need confirmation
unless provably derived. No autonomous financial transactions, important-data
deletion, or external communication. Consequential choices remain with the
user, including when an answer sounds confident.

## Non-blocking concept backlog

The [complementary future backlog](future-roadmap.md#complementary-post-mvp-improvements)
retains workflow/reporting depth, calendar/recurrence, CRM, attachments, reflection
journals, habits and opportunity scoring. Personal preferences, cost-aware routing
and richer diagnostics attach to the phases above without new blocking phases.
Projects, additional Graph entity types, visualization and named scenarios remain
optional extensions; none is a prerequisite for the Tool Layer. Deliberate decision
recording may be separately scoped earlier than advanced outcome interpretation.

## Target intelligence loop

```text
CAPTURE → structured data → entity resolution → ATLAS Graph
  → timeline + deterministic metrics + Signals
  → Analyst planner → approved ATLAS tools → typed evidence
  → AI interpretation / comparison / scenario explanation
  → inspectable next best action → user decision
  → confirmed deterministic execution → outcome
  → timeline / reviews / metrics → learn
```

This is a cyclical runtime loop, not delivery or technical dependency order. It extends the existing product loop in Section 8. ATLAS should be able to
answer what happened; what changed; why it might matter; what patterns appear
over time; how domains connect; what deserves attention; what realistic options
exist; what deterministic scenarios show; what to consider next; what followed
a decision; what was learned; and what information is missing before an answer
can be trusted.

## Documentation review — 2026-09-24

This documentation-only review inspected current local roadmap, architecture,
validation and release records, package/CI commands, and relevant Graph, Capture,
Analyst, runway, Timeline and career code/migrations. It preserved existing local
work and historical validation records. No features, migrations, dependencies or
configuration were changed; no application tests, hosted checks, migrations,
deployments, commits or pushes were performed.

Documentation validation: project Prettier on the two edited roadmap files;
structural checks for 19 unique phase definitions, the retained Phases 1–8 order,
remaining delivery priorities and required phase fields; local Markdown link/anchor
checks; and SHA-256 comparison confirming all 478 other pre-existing files were
unchanged. Repository-wide health remains a separately dated baseline, not a claim
from these documentation checks.

**Recommendation at this documentation review:** **Phase 11 — Analyst 2.0:
Freeform Grounded Analysis**, using the accepted Phase 9 registry and Phase 10
planner. The current status table above supersedes this historical recommendation.
Keep mutations out of the Analyst.

## Phase numbering update — 2026-09-24

Renumbered planned Phases 9–19 to match delivery order and updated phase references,
dependency tables and implementation handoffs. Phases 1–8, planned scope and release
gates were unchanged. At renumbering, the next implementation was Phase 9: Analyst
Retrieval / Tool Layer, followed by Phase 10: Analyst Query Planner and Phase 11:
Freeform Analyst. Phase 9 has since been implemented locally.
This documentation change does not establish new application validation or hosted
deployment evidence.

## Phase 9 implementation closeout — 2026-09-24

Implemented thirteen independent read-only tools with strict inputs, server-derived
ownership, bounded retrieval, typed evidence and safe failures. Existing Analyst,
Graph, Timeline, Signals and runway/scenario services are reused. Fresh local
application and database checks plus real two-owner integration establish the
local acceptance recorded in [analyst-tools.md](analyst-tools.md). No database
migration, provider call, new UI, deployment, commit or push was required.

Capture browser/release verification, hosted Analyst compatibility and Graph
hosted rollout remain separate open gates. They were not silently waived or
marked complete by local tool tests. Next: Phase 10 Query Planner only.

## Phase 10 implementation closeout — 2026-09-24

Implemented an authenticated, server-only question planner using only the thirteen
accepted Phase 9 tools. Strict structured model output is revalidated with the
tool schemas, unresolved entity references require clarification, unsupported
questions remain explicit, and partial tool failures cannot become an answer.
Call, argument, provider context/response, token, cost, authentication, execution
time and aggregate evidence limits fail closed. Safe metadata excludes prompts,
questions, owners, evidence values and credentials.

Synthetic unit and live planner evaluations, prompt-injection/denied-tool cases,
and a real local two-owner plan execution establish the acceptance recorded in
[analyst-query-planner.md](analyst-query-planner.md). The final local checks passed
444 normal tests, 448 tests with the local Tool Layer integration enabled, all
five live synthetic planner evaluations, 131 database assertions, lint,
typecheck, the 37-page production build, formatting and `git diff --check`. No
route, UI, migration, dependency, deployment, commit or push was added. Next:
Phase 11 Freeform Grounded Analysis only.

## Phase 11 implementation closeout — 2026-09-25

Added a separate freeform Analyst path using the approved planner and owner-scoped
tools. The route requires consent and the existing Analyst quota before either
model call. Structured claims cite approved evidence, while ATLAS renders the
authoritative figures, periods, completeness and source links. Invalid or
incomplete explanations fall back to the retrieved facts; the seven preset
questions retain their original path. Migration
`20260924161640_analyst_freeform_quota.sql` extends the existing typed
reservation contract without adding an unbounded model or tool capability.

Local acceptance is recorded in [analyst-freeform.md](analyst-freeform.md):
grounding and route tests, three synthetic live answer evaluations, the accepted
planner's two-owner tool checks, 132 local database assertions, the local security
advisor, authenticated desktop/mobile browser checks and production build.
Hosted migration and deployed authenticated flow remain separate release gates.
Phase 12's request-time historical metrics, History page and bounded Analyst tool
are described in [historical-metrics.md](historical-metrics.md). Phase 13's
implementation and production acceptance are recorded in
[cross-domain-analyst.md](cross-domain-analyst.md). Next planned intelligence phase:
Pattern and Association Discovery (Phase 14), subsequently implemented locally.

## Phase 14 implementation closeout — 2026-09-25

Added request-time association testing over the six approved historical metrics,
a source-linked Patterns page, and one approved Analyst tool. The deterministic
method requires eleven complete calendar months, adequate contributing records,
stable month-to-month co-movement, and a permutation result adjusted for all
fifteen metric pairs. Incomplete, sparse, unstable, or statistically weak pairs
produce no finding. Model prose cannot supply the figures or a causal claim.
The method and limits are specified in [pattern-associations.md](pattern-associations.md).

Fresh local acceptance passed 486 application tests (20 skipped), 159 database
assertions across 17 files, five real local two-owner tool integration tests,
eight synthetic live planner and seven synthetic live answer evaluations,
lint, typecheck, formatting, production build, and authenticated Chromium
desktop/mobile browser checks of the no-finding page. A disposable local account
was removed after the browser run. A qualified-finding card was checked at the
component level; hosted deployment and a data-rich authenticated browser flow
remain open. Next planned intelligence phase: Scenario Intelligence (Phase 15),
subsequently implemented locally.

## Phase 15 implementation closeout — 2026-09-25

Added a bounded, read-only Analyst comparison of the current runway baseline
with up to two changed options. The tool reads one owner-scoped source snapshot,
converts stated peso inputs to centavos in ATLAS, runs the existing scenario
engine, and shows matching figures and assumptions in responsive cards. An
active-debt picker supports explicitly monthly extra payments with an owner
check. One-time debt payments, stale baselines, ungrounded assumptions and
foreign debts cannot become calculated outcomes. The answer model is limited to
a neutral citation while ATLAS renders the figures. The method and acceptance
record are in [scenario-intelligence.md](scenario-intelligence.md). Hosted
deployment remains open. Local acceptance passed 500 application tests (24
skipped), five real two-owner tool integration tests, 19 synthetic live AI
evaluations, authenticated Chromium checks at 320px and 1280px, lint,
typecheck, formatting and production build. Phase 16 Next Best Action is
implemented and deployed for Dayline-ranked application follow-ups. Its owner,
stale-state, dismissal, duplicate-write, hosted migration and signed-in production
browser checks are recorded in [next-best-action.md](next-best-action.md).
Current intelligence phase: Multimodal Capture (Phase 18), released with
remaining browser acceptance recorded in [its contract](multimodal-capture.md).
Phase 19 has Graph/Timeline integration and local acceptance; hosted release acceptance remains. Phase 17 Universal
Capture 2.0 is implemented and deployed; its [contract](universal-capture-2.md)
records supported actions and production acceptance.
