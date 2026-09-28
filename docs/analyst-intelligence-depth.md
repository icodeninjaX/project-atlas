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

## 2. Conversation memory

The sealed context now keeps the last four questions with the data areas
and field profiles their answers drew on (`history`, default `[]`, so older
tokens still open). `historyTurns` rebuilds each turn's answer from its
checked findings only. The planner and the writer receive them as
`previousTurns`; `filterProviderPayload` still drops any turn whose answer
the current consent and route would not allow.

An earlier question is the person's free text and may name records or hold
private narrative whatever its answer drew on, so it is sent only where the
`sensitive_narrative` profile is allowed. Otherwise the question is withheld
and only its checked answer is sent. On today's shared route that means the
models see earlier answers, not earlier questions.

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

## 5. How much is shown

A lookup used to hide every finding behind its one-line direct answer. When
a plan exists, the planned response style decides; a style the person asked
for in words ("briefly", "in two sentences", "in detail") still wins
(`explicitStyle`). Without a plan the old behavior is unchanged.

## 6. Enabling

The planner runs wherever V2 runs (`ATLAS_ANALYST_V2=1`); conversation
memory also needs `ATLAS_ANALYST_CONTEXT_KEY`. The release gates in
`analyst-intelligence-release.md` §9 still apply. In particular, on the
shared provider route the models see aggregates only, never category or
record names, which caps how specific an answer can be.

## 7. Not in this phase

- A general owner-scoped aggregate tool (measure × group × filter × period)
  and more derived facts (multi-period trends, run-rate, anomalies).
- A per-user data inventory for the planner.
- Re-investigation after the draft: the planner front-loads the checks, and
  the reviewer's repair deepens the writing, but no new reads follow a draft.
- Persistent memory of priorities and preferences across sessions.
