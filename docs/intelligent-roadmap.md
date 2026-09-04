# ATLAS Intelligent Roadmap

**Project:** ATLAS — Personal Operating System\
**Repository:** `icodeninjaX/project-atlas`\
**Last reviewed:** 2026-09-05\
**Purpose:** Give an AI coding agent a clear, sequential roadmap for evolving ATLAS from a structured personal tracker into a connected and increasingly intelligent personal operating system.

---

# 1. Product Direction

ATLAS should not become a collection of unrelated mini-apps.

The long-term direction is:

> **ATLAS observes what is happening, detects meaningful changes, prioritizes the next useful action, helps the user understand consequences, remembers history, connects knowledge, and eventually uses AI to explain and reason over structured facts.**

The core rule is:

> **ATLAS owns the facts. AI helps interpret them.**

Deterministic calculations, balances, deadlines, trends, scoring rules, permissions, and source-of-truth records should remain normal application logic wherever possible.

AI should be introduced only when natural-language understanding, summarization, interpretation, or cross-domain reasoning provides real value.

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

1. **Finish the current phase before starting the next.**
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

The planned sequence is:

1. **Signals**
2. **Capacity-Aware Dayline**
3. **Personal Runway & Financial Scenarios**
4. **Life Timeline**
5. **Knowledge & Spaced Repetition**
6. **Universal Capture**
7. **ATLAS Analyst**
8. **ATLAS Graph**

The ordering is intentional.

ATLAS should first become better at **detecting**, then **prioritizing**, then **simulating**, then **remembering**, then **teaching**, then **understanding natural language**, then **reasoning with AI**, and only after that become deeply **connected across domains**.

## Current Delivery Status

| Phase                                    | Status   | Current note                                                                                                                     |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1. Signals                               | Complete | Implemented and verified on 2026-08-26.                                                                                          |
| 2. Capacity-Aware Dayline                | Complete | Implemented on 2026-09-04; application validation passed, while local pgTAP execution remains pending until Docker is available. |
| 3. Personal Runway & Financial Scenarios | Complete | Implemented on 2026-09-05 with deterministic runway, saved assumptions, and non-destructive scenarios.                           |
| 4. Life Timeline                         | Next     | Build on the existing activity-history foundation.                                                                               |
| 5. Knowledge & Spaced Repetition         | Planned  | Deterministic learning and review before AI assistance.                                                                          |
| 6. Universal Capture                     | Planned  | First AI-assisted mutation proposal flow.                                                                                        |
| 7. ATLAS Analyst                         | Planned  | Evidence-backed explanations over bounded structured facts.                                                                      |
| 8. ATLAS Graph                           | Planned  | Cross-domain relationships after the underlying modules are mature.                                                              |

The active product target is **Phase 4 — Life Timeline**. Production validation,
authenticated mobile checks, and database integration testing for delivered
phases remain release-quality work that can proceed without changing the phase
order.

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

**Status:** Planned.

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

**Status:** Planned.

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

**Status:** Planned.

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

Proposed actions:

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

Potentially support multiple proposed actions from one input only if the UX remains clear.

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

**Status:** Planned.

## Goal

Create an evidence-based AI analysis layer over structured ATLAS data.

This phase answers:

> **What does my data mean?**

The Analyst should not be a generic chatbot.

It should reason over carefully selected ATLAS facts.

## Example Questions

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

## AI Agent Prompt

```text
Implement an evidence-based ATLAS Analyst.

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

# Phase 8 — ATLAS Graph

**Status:** Planned.

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

# 7. Development Workflow for the AI Agent

For every roadmap phase:

## Before Coding

1. Inspect the repository.
2. Inspect relevant schema/migrations.
3. Inspect existing domain utilities.
4. Inspect current UI patterns.
5. Inspect tests.
6. Check whether roadmap docs are stale relative to recent commits.
7. Produce a small implementation plan before editing.

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

Never run destructive database workflows against production.

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

The target ATLAS loop is:

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

A strong deterministic foundation will make every future AI capability safer, cheaper, more useful, and more trustworthy.
