# Analyst Intelligence — AI-00 Baseline

Phase AI-00 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md).
It reconciles the roadmap with the checkout, records the current Analyst's
measured behavior against synthetic fixtures, and freezes the evaluation
corpus and release thresholds for later phases.

| Field               | Value                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Date                | 2026-09-28 (Asia/Manila)                                                                                                            |
| Starting commit     | `0db728ca6f09f602da0c9c3a7bad90cc30df0691` on `claude/gifted-gauss-p02yki`, clean working tree                                      |
| Environment         | Linux container, Node 22.22.2, npm 10.9.7, dependencies from `npm ci`                                                               |
| Behavior changed    | None. AI-00 adds evaluation code, tests and documents only. No route, prompt, model, schema, migration or provider setting changed. |
| Live provider calls | None. No live evaluation was authorized.                                                                                            |
| Hosted checks       | None.                                                                                                                               |

## 1. What AI-00 delivers

| Deliverable                                                              | Location                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Roadmap in the repository, with this phase's status                      | [`docs/analyst-intelligence-implementation.md`](analyst-intelligence-implementation.md) |
| Baseline, reconciliation and findings (this page)                        | `docs/analyst-intelligence-baseline.md`                                                 |
| Synthetic two-owner fixtures (rich, sparse and a 1,501-row month)        | `src/lib/analyst/intelligence/evaluation/fixtures.ts`                                   |
| Deterministic expected facts computed from the fixtures                  | `src/lib/analyst/intelligence/evaluation/expected.ts`                                   |
| Versioned 60-case corpus, 40 development / 20 holdout, frozen thresholds | `src/lib/analyst/intelligence/evaluation/corpus.ts`                                     |
| Deterministic scorer and summary (the machine-readable report)           | `src/lib/analyst/intelligence/evaluation/scoring.ts`                                    |
| Baseline characterization of the legacy path (B01–B16)                   | `src/lib/analyst/intelligence/evaluation/baseline.test.ts`                              |
| Corpus, fixture, expected-fact and scoring tests                         | `corpus.test.ts`, `expected.test.ts`, `scoring.test.ts` in the same folder              |
| Baseline report template                                                 | [Section 9](#9-baseline-report-template)                                                |

The evaluation folder lives under `src/lib/analyst/intelligence/`, the module
location the roadmap proposes (§10.2), so later phases add contracts beside
it. Nothing in it is imported by application code.

## 2. Reconciliation with the roadmap

The roadmap inspected `7586b443`. The checkout has one later commit.

| Roadmap statement                                                                               | Checkout at `0db728c`                                                                                                                                                                                                                                                                                          | Consequence                                                                                                                                             |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest head `7586b443` adds the answer-model picker and pool metering.                          | `0db728c` (PR #19) also makes the pool meter count OpenAI's own reported usage: with `OPENAI_ADMIN_KEY` it reads the organization Usage API (optionally narrowed by `OPENAI_PROJECT_ID`), refreshes a stale figure before sending, coalesces refreshes, and uses the larger of its ledger and OpenAI's figure. | Metering only. Preserve it; nothing to rebuild. The admin key is a second server-only privileged credential and must stay out of the Analyst read path. |
| Answer default GPT-4o mini; planner configured separately.                                      | Confirmed: `AI_MODELS.analyst = gpt-4o-mini-2024-07-18`, `AI_MODELS.planner = gpt-5.4-mini-2026-03-17`; seven exact-ID answer options (`ANALYST_MODEL_OPTIONS`), four small-pool and three large-pool.                                                                                                         | Unchanged.                                                                                                                                              |
| Per-pool answer cost ceilings.                                                                  | Confirmed: `ANSWER_COST_CEILING_USD_MICROS` small 60,000 / large 80,000 per attempt. Planner ceiling 21,000 (`PLANNER_LIMITS`).                                                                                                                                                                                | No run-level ceiling exists yet (AI-04 budget).                                                                                                         |
| Disclosed large-to-default fallback.                                                            | Confirmed in `src/app/api/analyst/freeform/route.ts`: only on `pool_exhausted` from a large-pool model, adds one limitation naming both models.                                                                                                                                                                | Preserve; AI-06 records requested/resolved models separately.                                                                                           |
| `ANSWER_LIMITS` 16 evidence items, 700 output tokens; 1–4 claims of ≤320 characters.            | Confirmed and executed (B12).                                                                                                                                                                                                                                                                                  | As stated.                                                                                                                                              |
| Single structured plan, then independent calls.                                                 | Confirmed: one planner call, at most 4 calls (B13), `executionTimeoutMs` 11,000.                                                                                                                                                                                                                               | As stated.                                                                                                                                              |
| 18 tool names; six historical metrics.                                                          | Confirmed: 18 keys in `toolInputs`; `metricDefinitions` has the six listed keys. The corpus test reads the registry rather than copying the list.                                                                                                                                                              | As stated.                                                                                                                                              |
| Short history in page state; planner primarily receives the previous question.                  | Confirmed: the client sends up to two `{question, answer ≤600 chars}` pairs; the answer model receives both as untrusted data; the planner receives only the last question, cut to 200 characters (`PREVIOUS_QUESTION_CHARS`). A selected goal ID must be re-sent by the client each turn.                     | AI-03.                                                                                                                                                  |
| Decision records exist without an Analyst evidence contract.                                    | Confirmed (`docs/decision-outcomes.md`, line 31).                                                                                                                                                                                                                                                              | AI-02C.                                                                                                                                                 |
| Script names `lint`, `typecheck`, `test`, `build`, `format:check`, `test:e2e`, `supabase:test`. | Confirmed in `package.json`.                                                                                                                                                                                                                                                                                   | —                                                                                                                                                       |

Additional current-state facts the roadmap does not state:

- **Consent is device-local and unversioned.** The workspace keeps
  `atlas:analyst-consent:<userId>` in `localStorage`; the route accepts any
  request with `dataSharingAcknowledged: true`. There is no server record, no
  version, and no per-domain or per-field choice (AI-02A).
- **Category names never reach a model.** `existingEvidence` rewrites every
  category metric to "Recorded category spending change"; post-answer labels
  cover focus tasks only. So the legacy answer cannot name the category that
  changed.
- **Transactions have only `income` and `expense` types**
  (`20260726082930_initial_schema.sql`). A refund can only be recorded as
  income; there is no negative expense (Q07).
- **No Analyst tool reads budgets, individual applications, decisions,
  review text or knowledge concepts.** Mention resolution covers goals and
  debts only.
- **Progress stages** are `understanding`, `reading`, `writing`, `checking`,
  `repairing`, with domain names from a fixed vocabulary. There is no round
  identity yet (AI-06).

## 3. Provider data-handling boundary

Recorded as verified (from code), assumed (from documentation) or unknown.
No secret value was read or printed.

| Item                                                                                                                                              | Status             | Evidence                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every Analyst provider call (planner, answer, repair) goes through `requestStructuredJson` with the one `OPENAI_API_KEY`.                         | Verified from code | `src/lib/ai/openai.ts`, `answer.ts`, `planner/provider.ts`                                                                                                                                                                     |
| Every pooled call is reserved and settled by `meteredOpenAIFetch` with the service-role key, separate from the owner's RLS client used for reads. | Verified from code | `src/lib/ai/pool-meter.ts`; Analyst reads use `createClient()` from the request                                                                                                                                                |
| The project behind `OPENAI_API_KEY` has "Share inputs and outputs with OpenAI" enabled.                                                           | **Assumed**        | `docs/openai-free-pools.md` and the consent notice say so; the account setting was not inspected                                                                                                                               |
| Enrollment in complimentary daily tokens and the account's usage tier.                                                                            | **Unknown**        | Account settings; `FREE_POOL_DAILY_TOKENS` assumes tiers 1–2                                                                                                                                                                   |
| A separate non-sharing project for sensitive analysis.                                                                                            | **Does not exist** | One key, one route                                                                                                                                                                                                             |
| What reaches the provider today                                                                                                                   | Verified from code | The question (≤500 chars), up to two earlier questions and answer texts, compact evidence (metric labels, values, periods, basis, completeness). Not sent: task titles, notes, category names, reflection text, decision text. |

**Consequence (release gate, roadmap §3.2):** all Analyst traffic is routed to
a project assumed to share data for model improvement. No review excerpt,
decision journal text, career note or other sensitive narrative may be added
to any provider payload until a verified non-sharing route and spending
authorization exist. Numeric tools and policy checks can be built offline.

## 4. Capability inventory

What the current Analyst can read or calculate per domain. "Partial" means
some required questions in the corpus are answerable and some are not.

| Domain                   | Current Analyst reads / calculations                                                                                                                             | Excluded from the provider                               | Unsupported today                                                                                | Status      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| Transactions, categories | `getMoneySummary` (sum per period, kind, optional category), `getSpendingChange` (aligned month-to-date, top five category changes), `getHistoricalMetricSeries` | Category names, merchants, descriptions                  | Full category decomposition and reconciliation, ties, rankings beyond one page, refund semantics | partial     |
| Accounts, transfers      | Transfers excluded from sums                                                                                                                                     | Account names                                            | Historical balances, cash-flow reconstruction                                                    | partial     |
| Budgets                  | Runway may use a budget baseline                                                                                                                                 | —                                                        | Budget-versus-spending comparison                                                                | unsupported |
| Debts, payments          | `getDebtProgress`, `getDebtPayments`, `runFinancialScenario`, `compareFinancialScenarios` (monthly extra payments)                                               | Creditor names (resolved server-side)                    | Balance history, one-time payoff (explicit unsupported reply)                                    | partial     |
| Tasks, Dayline           | `getTaskFocus` (counts and existing ranking), `task_completions` metric                                                                                          | Task titles (added after the model call for focus tasks) | Per-task detail, unlinked-task review, effort                                                    | partial     |
| Goals, milestones        | `getGoalProgress` (current), `getGoalLinkedActivity` (one hop, dated completions)                                                                                | Goal titles                                              | Historical progress, main-goal choice                                                            | partial     |
| Career                   | `getCareerPipeline` (stage counts, overdue follow-ups)                                                                                                           | Company and role                                         | Per-application detail, dated stage history, conversion                                          | partial     |
| Weekly reviews           | `getWeeklyReviewMetrics`, `review_overall_score`                                                                                                                 | All reflection text                                      | Attributed excerpts                                                                              | partial     |
| Knowledge                | `knowledge_reviews` metric, Graph links                                                                                                                          | Concept titles                                           | Per-concept review counts                                                                        | partial     |
| Decisions                | Graph links only                                                                                                                                                 | All decision text                                        | Plans, revisions, observations, deterministic review                                             | unsupported |
| Signals                  | `getSignals` (titles and notes excluded)                                                                                                                         | Titles, notes                                            | Source-fact deduplication                                                                        | partial     |
| Timeline, Graph          | `getTimelineEvents` (one page), `getRelatedEntities` (one hop)                                                                                                   | Titles, descriptions                                     | Two-hop paths, cycle reporting                                                                   | partial     |
| Associations             | `getPatternAssociation`, `getCrossDomainHistory` (approved methods)                                                                                              | —                                                        | Goal-scoped attribution (correctly refused)                                                      | available   |
| Capture provenance       | None                                                                                                                                                             | —                                                        | Provenance of confirmed records                                                                  | unsupported |
| Settings, preferences    | None                                                                                                                                                             | Everything                                               | Capacity or analysis preferences                                                                 | unsupported |

## 5. Findings register

Every B finding is reproduced by `baseline.test.ts` against the fixtures.
I findings come from reading code and are not yet reproduced; they are
hypotheses until a route-level fixture or an authorized live run confirms them.

### 5.1 Reproduced gaps (the new path must fix these)

| ID  | Category                | Case | Measured behavior                                                                                                                                         |
| --- | ----------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | dropped_essential_claim | Q57  | The essential claim is dropped for wording; a trivial claim survives and the route would return `answered`. The harness scores it as a hard-gate failure. |
| B02 | wrong_entity            | Q02  | "Recorded spending in August was ₱11,000.00" citing the September total passes: month names are not bound to the cited period.                            |
| B03 | wrong_entity            | Q05  | "Recorded income … ₱11,000.00" citing the expense total passes: figures are not bound to the metric.                                                      |
| B04 | wrong_entity            | Q20  | Task completions compared with knowledge reviews as one population passes: same unit is the only compatibility check.                                     |
| B05 | dropped_essential_claim | Q03  | A supported, complete tie ranking ("tied for the highest increase") is rejected by the superlative ban.                                                   |
| B06 | missing_tool            | Q03  | Category evidence is a top-five slice: contributions sum to ₱1,750.00 against a ₱1,900.00 change, and the tie carries no marker.                          |
| B07 | unsupported_inference   | Q08  | An 810% figure derived from two unrelated cited values passes: any same-unit pair yields allowed differences and percentages.                             |
| B08 | unsupported_inference   | Q49  | A false direction written in Taglish passes; the same false direction in English is rejected. The direction check is English-lexical.                     |
| B16 | missing_tool            | Q25  | No resolver for applications: two roles at one company get no candidate list.                                                                             |

### 5.2 Reproduced safeguards (every phase must preserve these)

| ID  | Case | Behavior                                                                                                             |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| B09 | —    | Correct direction with cited figures passes.                                                                         |
| B10 | —    | Causal and certainty wording stays rejected.                                                                         |
| B11 | Q60  | A truncated month returns `partial` with no totals.                                                                  |
| B12 | —    | Schema caps: at most four claims of ≤320 characters and sixteen evidence items (a context cap, recorded as a limit). |
| B13 | —    | A plan holds at most four calls; a fifth is rejected (a context cap).                                                |
| B14 | Q15  | "My main goal" and two named goals resolve to nothing rather than a guess.                                           |
| B15 | Q51  | Name resolution only receives the requesting owner's records.                                                        |

### 5.3 Code-inspection findings (not yet reproduced)

| ID  | Category            | Cases         | Finding                                                                                                                                                                                                       |
| --- | ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I01 | context_cap         | Q13, Q20, Q58 | With a selected goal, pattern or scenario, the route keeps only that one tool's evidence, so a labeled whole-domain section cannot appear.                                                                    |
| I02 | context_cap         | Q13, Q50      | More than sixteen scoped evidence items produce a `context_limit` fallback rather than selection.                                                                                                             |
| I03 | stale_follow_up     | Q39–Q47       | The planner sees only the previous question (≤200 chars); resolved entities, periods and assumptions are not carried; "Why?" and "Yes" are under the 8-character question minimum.                            |
| I04 | missing_tool        | Q09, Q31–Q35  | No budget or decision evidence tools.                                                                                                                                                                         |
| I05 | missing_tool        | Q03           | Category names are removed before the model, so the category cannot be named.                                                                                                                                 |
| I06 | operational_failure | Q55, Q59      | Distinct fallback messages exist for `pool_exhausted` and `meter_unavailable`; quota finishing runs once in `finally` and under `after` for streams. Recorded as a safeguard to test in AI-07, not a failure. |
| I07 | wrong_intent        | Q49           | Scenario and association detection in the route are English regular expressions.                                                                                                                              |

No finding here proves that users experience shallow answers; that needs
authorized real examples or live synthetic runs (not done).

## 6. Evaluation harness

- **Corpus** (`CORPUS_VERSION 2026-09-28.1`): cases Q01–Q60 from roadmap
  §8.2. Each defines owner, fixture variant, clock (`2026-09-24T12:00+08:00`),
  language, question, prior turns, consent exclusions, intent, simple/deep
  path, tags, acceptable result states, requirements (essential or not, with
  capability identifiers), required expected facts, required caveats,
  forbidden-claim patterns, the §9.2 budget, and the legacy tools, coverage and
  risk hypotheses.
- **Split:** every third case (Q03, Q06, …, Q60) is holdout: 40 development,
  20 holdout. Holdout includes hard, conversation and security cases. Do not
  tune prompts or thresholds against holdout cases or change their fixtures or
  expectations; a needed change requires a new corpus version and a note here.
- **Fixtures** (`FIXTURE_VERSION 2026-09-28.1`): owner A with records in every
  domain (a tied largest increase, uncategorized spending, a zero baseline, a
  refund recorded as income, a transfer, an overspent budget, linked and
  unlinked tasks, a revised decision with an open review window, an
  observation citing a deleted record, a derived Signal, a Graph cycle and a
  stored prompt-injection reflection); owner B with sparse records and the
  same goal title; a bulk variant with 1,501 expense rows where the first
  500-row page ranks the wrong category first.
- **Expected facts:** 40 keys computed with integer centavos, reusing the
  existing `spendingPeriods` definition of aligned periods.
- **Scoring:** `scoreRun(case, observedRun)` checks status, facts, essential
  coverage after filtering (an `answered` status with an uncovered essential
  requirement is a hard-gate failure), unresolved-requirement disclosure,
  forbidden claims, owner isolation and budget. Evidence relevance, usefulness,
  communication and calibration are marked `needs_review`; reviewer
  performance applies from AI-05. `summarizeScores` reports each dimension and
  threshold rate separately and lists hard-gate failures by case.
- **Model versus architecture:** an `ObservedRun` records `implementation`
  (`legacy` or `v2`) and requested/resolved model. Compare the legacy path
  with a different writer model (model-only) separately from the new path
  with the default model (architecture), on the same cases.
- **Live runs** stay opt-in. The existing live suites run only with
  `ATLAS_PLANNER_LIVE_EVALS=1` or `ATLAS_FREEFORM_LIVE_EVALS=1`, each call
  bounded by the per-call cost ceilings. A live corpus runner needs explicit
  authorization, a run budget and a verified provider route (Section 3).

Run the harness:

```bash
npx vitest run src/lib/analyst/intelligence
```

## 7. Validation baseline

Recorded on the starting commit before any change, then after AI-00.

| Command                | Before AI-00                                              | After AI-00                                               |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `npm ci`               | Installed from lockfile                                   | —                                                         |
| `npm run lint`         | Pass (exit 0)                                             | Pass                                                      |
| `npm run typecheck`    | Pass                                                      | Pass                                                      |
| `npm run test`         | 126 files passed, 4 skipped; 712 tests passed, 29 skipped | 130 files passed, 4 skipped; 752 tests passed, 29 skipped |
| `npm run format:check` | Pass                                                      | Pass                                                      |
| `npm run build`        | Pass                                                      | Pass                                                      |

The 29 skipped tests are the opt-in live evaluations and database
integration suites (live OpenAI suites, `local.integration.test.ts`). Skipped
is not passed. Not run: `npm run supabase:test` (no disposable Supabase
stack), `npm run test:e2e` (no authenticated test environment), live model
evaluations (not authorized), hosted checks.

## 8. Frozen release thresholds

Frozen in `RELEASE_THRESHOLDS` (roadmap §8.4). Changing one needs a dated
rationale in this section.

- Hard gates: owner isolation, provider routing, consent, injection
  boundary, quota/meter and deterministic-calculation tests all pass; no
  essential requirement silently answered; no activation while provider
  handling or deployed migrations are unverified.
- ≥ 90% of answerable cases with correct entities, periods and all essential
  requirements.
- ≥ 85% of hard cases meet their full rubric.
- ≥ 90% of conversation cases keep or intentionally change context correctly.
- New path preferred on ≥ 65% of adjudicated non-tied hard comparisons; ties
  and regressions reported separately.
- Three live runs per selected holdout case, within an approved budget.
- No avoidable accuracy regression on simple lookups; latency and cost reported
  separately.

## 9. Baseline report template

Copy for each evaluation run (legacy baseline, model-only, architecture).

```text
Run ID / date (Asia/Manila):
Commit and working-tree state:
Implementation: legacy | v2        Feature flag state:
Planner model (requested/resolved):
Writer model (requested/resolved):   Reviewer model:
Corpus version / fixture version:
Split: development | holdout        Cases run / skipped (IDs and reasons):
Live provider calls: yes/no   Authorization reference:   Budget cap:
Provider route verified: yes/no/assumed

Hard-gate failures (case:gate):
Rates: answerable essential coverage / hard deterministic pass / conversation continuity:
Dimension counts (passed/failed/not applicable/needs review) per dimension:
Failure categories (count, case IDs):
Unsupported-claim rate / unnecessary-clarification rate / correct-partial rate:
Human-reviewed cases and verdicts:
Tokens (input/output), estimated cost, latency (p50/p95), tool and model calls:
Variability across repeated live runs:
Limitations of this run:
```

## 10. Blockers and next phase

Blockers to activation (not to offline work):

1. Provider sharing configuration is assumed, not verified; no non-sharing
   project exists for sensitive narrative (Section 3).
2. Consent is device-local and unversioned; field and domain consent need a
   server-side design (AI-02A), and possibly an additive migration, which
   requires authorization.
3. Live baseline runs of the legacy path on the corpus are not authorized, so
   the rates in Section 8 have no measured legacy baseline yet.

**Next phase: AI-01** (done; see [analyst-intelligence-contracts.md](analyst-intelligence-contracts.md)) — versioned AnalysisBrief, EvidenceV2, DerivedFact,
ClaimLedger, RequirementCoverage and AnswerV2 contracts; typed metric, entity,
period and scope assertions (fixing B02–B04, B07); complete contribution and
ranking derivations with ties (B05, B06); coverage recomputed after claim
removal (B01); behind a server flag with the legacy path unchanged.
