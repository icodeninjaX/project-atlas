# Analyst Intelligence — Depth: planning, memory and self-review

Analyst V2 checked every figure it showed, but it thought shallowly. Keyword
rules chose one data area per question, the writer saw one turn at a time,
and a question read as a "lookup" showed only its one-line answer. This phase
keeps every check and changes how the Analyst reads a question, what it
investigates, and how it judges its own answer.

## 1. Analysis planner (`planner.ts`)

Before any record is read, a planner call (`AI_MODELS.planner`) reads the
question the way an analyst would and returns:

- **understanding**: what the person actually wants to know ("Am I okay with
  money?" asks whether income covers spending and debts);
- **subQuestions**: up to four, each mapped to capability IDs from a fixed
  catalog, across areas when the question is broad;
- **hypotheses**: checks a skeptical analyst makes before trusting a
  conclusion;
- **comparePreviousPeriod** and **period**: a baseline when judging the
  answer needs one, and a time window named in words the rules missed;
- **clarification**: a question back, only when no area could answer.

Safety properties:

- The planner sees the question, earlier turns (policy-filtered) and the
  catalog. It never sees a record and never writes a tool input.
- Only whole-domain capabilities are plannable (`PLANNABLE_CAPABILITIES`),
  so a planned sub-question never searches by name or guesses an entity.
  Capabilities that consent or the route exclude are dropped.
- The rules' requirements stay as they are. Planned ones are added as
  non-essential, so a plan can widen an answer but never fail a tested one.
  Only when the rules found no topic and fell back to money do the plan's
  sub-questions replace that default, with the first two made essential.
- Scenarios and follow-ups keep their deterministic intent and periods.
- A failed, invalid or unaffordable planner call leaves the rules' brief
  unchanged, and `checkBrief` validates the result as before.
- Money kind is explicit: a planned requirement's ID ends in `_income` or
  `_expense`, which the proposer reads before any wording.

The planner runs on its own allowance (`PLANNER_BUDGET`). The run ledger
starts at the planner's start time and absorbs its usage, so the whole
request stays inside one deadline (54 s, inside the route's 60 s limit).
Run budgets gained one provider call and room for the larger writer.

### 1a. Data inventory (`getDataInventory`)

Before planning, a V2 read counts what the owner keeps in each area
(transactions, active debts, debt payments, open and completed tasks, active
goals, job applications, weekly reviews, knowledge concepts) and the first
and latest dates those records span. Each area is two owner-scoped reads of
one date column with an exact count; no name, note or amount is read. The
items are aggregate evidence, so the policy filter drops any area the person
did not share. The planner plans around areas with records and never asks
for more months than the records span. Its queries count against the run.

## 2. Conversation memory

The sealed context now keeps the last four questions with the data areas
and field profiles their answers drew on (`history`, default `[]`, so older
tokens still open). `historyTurns` rebuilds each turn's answer from its
checked findings only. The planner and the writer receive them as
`previousTurns`; `filterProviderPayload` still drops any turn whose answer
the current consent and route would not allow.

An earlier question is the person's free text, and its answer's prose may
repeat that text (a record name, a private remark) whatever the answer's
evidence was. Both are sent only where the `sensitive_narrative` profile is
allowed. Elsewhere the turn is restated from the numeric values its findings
cited (`facts`: measure, period, value) and sent as `aggregateOnly`; a turn
with no such values is not sent. On today's shared route the models see
earlier figures, never earlier questions or answer prose.

## 3. A writer that reasons before it writes (`writer.ts`)

The writer's schema begins with `analysis`: key observations, connections
between areas, alternative explanations, gaps and confidence. It is never
shown and never trusted; `draftOf` removes it before any check. The prompt
now asks for an answer to the question actually asked (the plan's
understanding), a direct answer that says what the records mean, figures set
against their cited baselines, connections across areas, and sections such
as What stands out, What it may mean, What to do next and What ATLAS cannot
tell. Every existing figure, scope, period and wording rule still applies.

## 4. Self-review of depth (`review.ts`, `synthesis.ts`)

The reviewer also sees the plan's understanding and a meaning-only list of
evidence the answer did not cite. Besides per-claim verdicts it may flag
`misses_question` and `shallow`, and give one repair instruction targeted
at `answer` when the whole answer misses the question or ignores a baseline
or connection the evidence supports. That instruction earns the one repair,
whose claims are checked again from the start.

## 4a. Income against spending (`calculations.ts`, `claims.ts`)

The first production answers failed every claim: income and expenses are
separate whole-domain scopes, so a claim could not compare them, and
"Am I doing okay with money?" had no checkable answer. ATLAS now derives
`netFlow` (recorded income less recorded expenses for one period, scope
`whole_domain:money_flow`). A claim with that scope may cite the net fact
and both totals, state all three amounts, and compare the totals with a
comparison object; any other scope still fails. The facts-only fallback
leads with the net figure unless the question asked for a ranking. Repair
requests now explain each rejection in words (`REJECTION_HELP`), and the
writer is told the exact words the checks reject.

## 4b. Trends over months (`history.trend`)

"Am I improving?" and "Is this normal for me?" need a baseline longer than
last month. The existing monthly history tool (`getHistoricalMetricSeries`)
is now bridged into V2, and the planner may add a `history.trend`
sub-question naming one measure (income, expenses, debt payments, task
completions, knowledge reviews or review score) over six or twelve months.
It becomes its own requirement (`r_planN_trend_<metric>_<months>`), and the
proposer reads that measure month by month through today.

ATLAS derives the trend itself (`monthlyTrend`), over whole calendar months
only: a ranking of the months (ties kept), their average, the latest month
less the average of the months before it, and the run of consecutive rises
(positive) or falls (negative) ending with the latest month. A superlative
("highest month since May") needs the ranking; "rose three months in a row"
needs the run with that sign. The derived change between two periods now
uses the latest like-for-like pair (`comparablePeriods`), so the month in
progress is never set against a whole month.

## 4b-2. Pace and month-end projection

"Am I spending more than usual?" was answered by setting this month so far
against the same days last month, even when the records began partway
through those days. ATLAS now derives, for recorded income and expenses in
each period read:

- `per_day`: the total divided by the days the records cover, starting no
  earlier than the first transaction (from the data inventory);
- a pace change (`derived.pace_change.*`): the difference per day and its
  percent change between the latest two periods;
- `projection`: for a month in progress covered from its first day, after
  at least seven days, the month's total if the pace so far continues.

When either period of a pair starts before the first transaction, the change
in totals is not derived; the pace comparison replaces it. A claim citing a
projection must read as an estimate ("at this pace … would"), or it is
rejected (`projection_wording`). A pace claim may state how many days it
spans.

## 4c. Reading more after the first draft

With a plan, the first draft may list up to two records it lacked in
`needsEvidence`, using the planner's catalog (`moreEvidence` in its input).
If the run still has time for the slowest read plus a repair
(`FOLLOW_UP_MIN_REMAINING_MS`, the tool timeout plus the writer timeout), ATLAS turns the requests into requirements
with the planner's rules (`requestedRequirements`: catalog capabilities
only, consent-filtered, nothing the brief already reads, IDs `r_moreN`),
checks them with `checkBrief`, and investigates only those on its own small
allowance (`FOLLOW_UP_BUDGET`), whose usage joins the run ledger. The new
evidence is appended, derived facts are recomputed, and the one repair
revises with it; every claim is checked again from the start. The revision
replaces the first draft, whose claims were written without the new records
(it is kept only if the revision ships nothing), and the read's rounds,
calls and queries join the run's usage. The repair
is never offered the catalog and its own requests are ignored, so reading
cannot loop. Without time, or with nothing valid asked, the answer stands.

## 5. How much is shown

A lookup used to hide every finding behind its one-line direct answer. When
a plan exists, the planned response style decides; a style the person asked
for in words ("briefly", "in two sentences", "in detail") still wins
(`explicitStyle`). A planned "concise" style is shown as standard, so the
planner alone never hides findings. "Shortened as you asked" appears only
when the person asked in words; an automatic shortening says "Shortened to
the main answer".

## 5a. Speaking about the records, not the analysis

Answers must talk to the person about their records. A claim that talks
about the analysis itself ("the evidence I received", "newly read",
"derived facts", requirement IDs, the writer or reviewer) is rejected
(`process_wording`) and repaired. The writer also receives the data
inventory, so when a question cannot be answered it can say what the
records do not cover, e.g. that transactions start in August and there is
no earlier whole month to compare with yet.

## 6. Enabling

The planner runs wherever V2 runs (`ATLAS_ANALYST_V2=1`); conversation
memory also needs `ATLAS_ANALYST_CONTEXT_KEY`. The release gates in
`analyst-intelligence-release.md` §9 still apply. In particular, on the
shared provider route the models see aggregates only, never category or
record names, which caps how specific an answer can be.

## 6a. Private provider route

On the shared route the models see aggregates only. When an operator sets up
a separate OpenAI project that does not share data for model training and
records it with `ATLAS_ANALYST_NON_SHARING_ROUTE_VERIFIED=1` and that
project's key in `OPENAI_NON_SHARING_API_KEY`, every V2 request uses that
route (`preferredRoute`). Its calls are billed to that project and sent
without a complimentary-pool reservation; the run ledger's token and cost
limits and the per-user Analyst quota still bound them. A missing key is a
configuration error, never a fallback to the shared key.

On that route the consent screen also offers names (categories, goals,
tasks, debts) and private notes. Each is sent only if the person ticks it;
existing consent stays figures-only until they choose again ("Stop sharing",
then allow again). The policy filter still applies per domain and profile.

## 7. Not in this phase

- A general owner-scoped aggregate tool (measure × group × filter × period),
  category-level trends and run-rate projections.
- Persistent memory of priorities and preferences across sessions.
