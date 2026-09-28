# Analyst Intelligence — AI-07 Evaluation, Hardening and Release Evidence

Phase AI-07 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-06 communication and interface](analyst-intelligence-communication.md).

> **Release decision: not released.** V2 stays behind `ATLAS_ANALYST_V2`, which
> is off by default. Two hard gates are not satisfied (§3), the quality
> targets are unmeasured because no live evaluation was authorized (§4).
> The capability gap found here has since been closed: all 49 answerable
> corpus cases now reach evidence (§2.5, §2.6). Nothing in this phase enables
> V2 anywhere.

| Field               | Value                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Date                | 2026-09-28 (Asia/Manila)                                                                                              |
| Starting commit     | `f7b8f81` (AI-06, merged in icodeninjaX/project-atlas#20)                                                             |
| Environment         | Cloud container, Node 22.22.2, no Supabase or OpenAI credentials, no Docker daemon                                    |
| Live provider calls | None. Every provider interaction was scripted or blocked.                                                             |
| Production changes  | None: no migrations, no provider or project settings, no flag changes, no deployment                                  |
| Legacy path         | Unchanged. The shared transport and gateway (`src/lib/analyst/tools`, `src/lib/ai`) are untouched; their suites pass. |

## 1. What this phase added

| Area                    | Files                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| Corpus freeze           | `evaluation/freeze.test.ts`                                           |
| Full-corpus V2 run      | `evaluation/corpus-run.test.ts`                                       |
| Fault injection         | `run.test.ts` ("under injected faults")                               |
| Quota settlement        | `api/analyst/v2/route.ts`, `route.test.ts`, `budgets.ts`, `stages.ts` |
| No-model fallback       | `fallback.ts`, `synthesis.ts`, `run.ts`                               |
| Source-failure honesty  | `orchestrator.ts`                                                     |
| Live comparison harness | `evaluation/comparison.live.eval.test.ts` (opt-in, never run live)    |
| Rollback check          | `app/(app)/analyst/page.test.tsx`                                     |

### 1.1 Corpus freeze

The 60-case corpus (40 development, 20 holdout), the expected facts, the
fixtures and the release thresholds are pinned by SHA-256 fingerprint, and
the holdout IDs are listed explicitly. `corpus.ts`, `expected.ts` and
`fixtures.ts` have not changed since AI-00 (`a3471d3`), so the freeze pins the
original expectations. A change now fails the test on purpose. The reason must
be recorded here and the version bumped; a holdout expectation must never be
rewritten to make an answer pass.

### 1.2 Defects found and fixed

Running V2 over the whole corpus and injecting faults exposed four defects.
All four are fixed with regression tests.

1. **An empty "checked facts" answer.** When the writer failed, V2 returned
   `fallback_facts` with no facts and the text "only the checked ATLAS facts
   are shown". Now `deterministicDraft` states the selected figures one per
   claim. Each passes the same claim checks as a written claim, and only
   sums, counts and latest values are used, never interpretations. When no
   figure can be shown, the status is `error` and the text says this does
   not mean the records are empty (§9.5 steps 4–5).
2. **A failed source read as "not enough records".** The shared transport
   maps a database outage to `unavailable_source`, the same code as "not
   found or not yours". The V2 orchestrator treated that code as missing
   data. Any errored read now yields `operational_failure` ("ATLAS could not
   finish this part. Try again."), which says nothing about whether a record
   exists. The shared transport was not changed, because the legacy path
   uses it.
3. **A paid writer call with nothing to cite.** With zero selected evidence,
   V2 still called the writer. It now answers from the unresolved reasons
   without a provider call.
4. **Token settlement.** Unknown provider usage added zero input and output
   tokens to the run's audit totals, and a run that threw reported `null`
   tokens even after provider calls. Unknown usage is now charged at the
   reserved upper bound (prompt bytes in, maximum output tokens out),
   matching how cost was already charged. The route also settles the tokens
   a thrown run was charged.

## 2. Deterministic evidence

### 2.1 Fault injection (`run.test.ts`, `route.test.ts`)

| Fault                               | Observed behaviour                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Writer timeout                      | Checked figures shown, `fallback_facts`, outcome `timeout`, call charged                               |
| Invalid provider output             | Same, outcome `provider_error`                                                                         |
| Provider HTTP 500                   | Same, outcome `provider_error`                                                                         |
| Missing usage                       | Answer kept; tokens charged at the reserved bound (above 800 input, at least 1,200 output), never zero |
| Pool used up (no fallback model)    | Nothing sent, `fallback_facts`, outcome `pool_exhausted`, no charge                                    |
| Pool meter down                     | Nothing sent, `fallback_facts`, outcome `provider_error`, no charge                                    |
| Database outage on every read       | `error`, reason `operational_failure`, no "no records" or ₱0.00 wording, no writer call                |
| Consent narrowed between turns      | Context discarded with the notice "Your data-sharing choices changed"                                  |
| Cancelled before start              | `error`, no provider call, no charge                                                                   |
| Run throws after a provider call    | 503, and the quota row gets `provider_error` with the charged tokens                                   |
| Run throws before any provider call | 503, and the quota row gets `provider_error` with `null` tokens                                        |
| Audit write fails                   | The answer is still returned                                                                           |
| Client disconnects mid-stream       | The run receives the abort signal, and the quota row is finished exactly once                          |

### 2.2 Whole-corpus run without a model (`corpus-run.test.ts`)

Every case runs through the full V2 path, including prior turns, against the
owner-scoped emulator. No model is available, so this measures the
architecture, not a model's writing.

| Measure                                               | Result                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cases run                                             | 60 (40 development, 20 holdout)                                                          |
| Crashes                                               | 0                                                                                        |
| Another owner's records or identity in visible output | 0                                                                                        |
| Unsafe progress events                                | 0                                                                                        |
| Statuses                                              | 54 `fallback_facts`, 4 `error`, 1 `clarification_required`, 1 `unsupported_capability`   |
| `fallback_facts` answers with no checked figure       | 0 (was 58 before fix 1)                                                                  |
| Maximum tool calls in one run                         | 5, within the deep envelope of 8                                                         |
| Cases over their frozen per-case tool budget          | 2: Q28, Q38 (4 calls against 3; V2 takes the deep path for these relationship questions) |
| Answerable cases reaching any evidence                | **49 of 49** (was 35 of 49 at the AI-07 release decision; see §2.5 and §2.6)             |

No answerable case reaches zero evidence. The test pins that list (now
empty): any addition fails.

The four `error` results have evidence that the no-model fallback does not
state as plain figures: weekly review scores from fewer than 12 reviews
(marked partial), and Q10's scenario outputs (estimates under stated
assumptions, not recorded totals). Those runs report that no checked figure
could be shown. A writer can still cite them with their limitations.

Q15 ("How is my main goal going?") now gets an overview of all active goals.
The corpus expects V2 to ask which goal; "main goal" is not yet treated as
ambiguous.

### 2.3 Shared-client regressions

`src/lib/ai` and `src/lib/analyst/tools` are unchanged since AI-00. Their
suites pass (295 tests across AI, capture, analyst routes, freeform, planner
and tools). So do the weekly insights, Capture, the preset `/api/analyst` and
the freeform route suites (148 tests).

### 2.4 Rollback

`page.test.tsx` shows the server flag alone chooses the workspace, on each
request. With the flag off, or for a signed-out visitor, users get the legacy
workspace. With it off, `/api/analyst/v2` returns 404.

### 2.5 Capability gap closed (follow-up to the release decision)

The AI-07 run showed 14 answerable cases reaching no evidence. The causes:

- **Aggregate questions went through a name lookup.** Job applications,
  weekly reviews, signals, task priority and debts were sent to
  `resolveAnalystEntities` with the whole sentence, which never matches a
  record name.
- **Named records were searched by the whole sentence.** "My decision to
  study part-time" never matched "Study part-time instead of full-time".
- **Some briefs chose the wrong capability.** An extra-payment comparison
  mapped to payment history, and a decision about studying added a knowledge
  requirement.

The fixes:

- **Bridged tools.** Nine existing aggregate tools are available to V2
  unchanged: `getDebtProgress`, `getDebtPayments`, `getTaskFocus`,
  `getGoalProgress`, `getCareerPipeline`, `getWeeklyReviewMetrics`,
  `getSignals`, `getRunway` and `compareFinancialScenarios`. Each keeps its
  own input schema, session identity, owner filter, bounded transport and
  timeout. Their evidence is adapted to EvidenceV2 with its fixed label and
  real domain, in an isolated comparable group. Every label was checked in
  source to be fixed vocabulary (templates, stage and signal enums), never a
  record name. Numeric figures travel as aggregates; text values stay
  `basic_context` and are filtered on the shared route.
- **Routing.** Whole-domain capabilities go to the bridged tools, and a new
  `goal.overview` capability covers "which of my goals". A payment scenario
  resolves the debt, then compares the stated extra monthly payments (one or
  two options) with any income change; it takes the deep path because it
  needs two rounds. A one-time payoff is not modeled, as before.
- **Honest limits.** Ranking unnamed goals ("which of my goals should get
  attention") is recorded as an unsupported `goal.ranking` requirement, with
  the goal overview and task focus as non-essential context, so the answer is
  partial rather than an apparent ranking. A one-time payoff is an
  unsupported `debt.one_time_payoff` requirement (Q11 now reports
  `unsupported_capability`, as the corpus expects).
- **References.** `references.ts` extracts the phrase that names one record
  ("study part-time", "Synthetic"). Resolution also accepts a whole-word
  match of a two-or-more-word phrase in any order, with light stemming;
  several matches still ask rather than guess.
- **Test data.** The emulator's goal, milestone, debt and job-application
  rows gained the `created_at` and `updated_at` columns the schema requires
  (NOT NULL). Without them the signals engine crashed on synthetic data. The
  frozen fixture datasets are unchanged.

### 2.6 Runway fixtures and the income assumption (Q10, Q43)

The frozen datasets record no account balances, so the runway engine could
not compute the two scenario cases. `evaluation/runway-fixtures.ts` adds a
versioned supplement (`RUNWAY_FIXTURE_VERSION` 2026-09-28.1) for owner A's
rich dataset. The emulator serves it beside the frozen datasets, which are
unchanged; the supplement is pinned by its own fingerprint in
`freeze.test.ts`, so the original fingerprints never move.

| Supplement data        | Value                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Runway accounts        | Synthetic Savings ₱60,000.00 (in the reserve); Synthetic Wallet ₱2,500.00 (excluded) |
| Essential categories   | Groceries, Transport, Utilities, Health                                              |
| Synthetic Card terms   | 24% interest, ₱2,000.00 minimum payment                                              |
| September budget       | Planned essentials ₱9,500.00; expected income ₱50,000.00; the datasets' dining limit |
| Profile income, target | ₱50,000.00 monthly; 6 months                                                         |

The frozen transactions record only August among the three months before
the fixture clock, so the engine uses its budget fallback. The results check
by hand: ₱60,000.00 over a monthly need of ₱11,500.00 (₱9,500.00 essentials
plus the ₱2,000.00 minimum) is about 5.2 months; an extra ₱2,000.00 or
₱4,000.00 a month gives about 4.4 or 3.9 months. `run.test.ts` asserts these.

Owner B and the bulk dataset have no supplement, so their runway still
reports insufficient history. Other rows gained the schema's defaults
(`is_essential` false, zero debt terms). Serving the budget also exposes the
datasets' existing September dining limit to the signals engine.

**Q43 needed one behavior, not just data.** "What if my income drops?" names
no amount, and a scenario needs one. V2 now asks, "Should I assume your
monthly income falls by 20%?", recording a pending assumption in the sealed
context. It sends nothing to a provider and assumes nothing. When the user
says yes, the turn machinery from AI-03 records the assumption as
`user_confirmed`, and the proposer runs the scenario with it. A different
percentage or "no" is handled by the same machinery.

## 3. Hard gates (roadmap §8.4)

| Gate                                                                                      | Status                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner isolation, provider routing, consent, injection boundary, quota/meter, calculations | **Pass locally** against the emulator and scripted provider. The signed-in two-owner database run was **not run** (§5).                       |
| No unresolved high-severity security or source-of-truth issue in the changed scope        | Pass. The four defects found in this phase are fixed; none is known open.                                                                     |
| Every shipped material claim traceable and verified                                       | Pass by construction: only claims that pass the checks ship, including no-model fallback figures.                                             |
| No essential unanswered requirement silently labeled answered                             | Pass: coverage tests, and no fallback in the corpus run is labeled `answered`.                                                                |
| No production activation while provider handling or deployed migrations are unverified    | **Not satisfied.** The provider project's sharing enrollment is unverified (AI-00), so only aggregates may be sent and activation is blocked. |

## 4. Quality targets

All unmeasured: they need the live comparison (§6), human review of
difficult cases, and three runs per holdout case.

| Target                                            | Status                                                       |
| ------------------------------------------------- | ------------------------------------------------------------ |
| ≥90% answerable cases fully correct               | Unmeasured; evidence reach is 49 of 49 (§2.5, §2.6)          |
| ≥85% hard-question subset meets the rubric        | Unmeasured                                                   |
| ≥90% conversation continuity                      | Unmeasured live; deterministic follow-up tests pass          |
| New path preferred on ≥65% of hard non-tied pairs | Unmeasured                                                   |
| No simple-lookup accuracy regression              | Unmeasured                                                   |
| Latency and cost                                  | Unmeasured live; per-run ceilings are enforced by the ledger |

## 5. Blocked checks

- **Signed-in two-owner database and browser runs.** A disposable local
  Supabase needs a Docker daemon, which this container does not have. The
  emulator-based ownership tests pass, and the existing opt-in
  `src/lib/analyst/tools/local.integration.test.ts` and Playwright
  `e2e/authenticated-mobile-responsive.spec.ts` are ready for a machine with
  Docker (`npm run supabase:start`, then `ATLAS_TOOL_LOCAL_TESTS=1`).
- **Live evaluations.** None authorized. See §6.

## 6. Opt-in live harnesses (never run live)

| Suite                              | What it measures                                                                                       | Cost profile                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `comparison.live.eval.test.ts`     | Legacy, model-only upgrade (legacy route with GPT-5.4) and V2 on the 20 holdout cases, three runs each | 180 samples; each makes up to 3–7 provider calls |
| `writer.live.eval.test.ts` (AI-06) | Each picker model's structured-output support                                                          | 7 writer calls                                   |
| `review.live.eval.test.ts` (AI-05) | Reviewer false approvals and false rejections                                                          | 1 reviewer call                                  |

The comparison harness runs every holdout case on each arm. It records what
each run actually did:

- the status and visible text;
- the tools it called, recorded at each arm's tool entry point;
- the owner IDs its reads filtered on, taken from the emulator's requests;
- provider calls, settled tokens and latency.

From those it reports:

- status counts and status agreement;
- stability across runs;
- forbidden-claim hits;
- owner-isolation failures;
- security forbidden claims;
- budget overruns;
- tokens and median latency.

Neither arm reports the corpus's requirement IDs or extracted fact values, so
facts, requirement coverage, usefulness and preference are **not scored**
from placeholders. `ATLAS_EVAL_OUTPUT=<file>` saves every sample for a grader
instead.

The harness was checked end to end with `ATLAS_EVAL_DRY_RUN=1`, which blocks
every provider request:

- 180 samples, 0 provider calls, and no crashes;
- no owner-isolation failures or forbidden claims on any arm;
- no sample read more than one owner's records;
- V2 recorded 90 tool calls. Legacy recorded none, because its planner needs
  the provider.

This shows only that the harness works: with the provider blocked, every arm
falls back.

To run it, with approval: set `ATLAS_ANALYST_V2_LIVE_EVALS=1`, the OpenAI key
and the pool-meter credentials, then run
`npx vitest run src/lib/analyst/intelligence/evaluation/comparison.live.eval.test.ts`.

## 7. Rollback plan

1. Set `ATLAS_ANALYST_V2` to anything other than `1` (or remove it). The next
   request serves the legacy workspace, and `/api/analyst/v2` returns 404.
   No deploy is needed, and nothing is deleted.
2. Legacy protections are unaffected because V2 never changed them:
   - the legacy consent notice and its aggregates-only data rules;
   - the quota and pool meter;
   - the model picker;
   - `/api/analyst/freeform`.
3. V2 stores no records. Conversation context lives only in the browser as a
   sealed token. Consent choices live in `localStorage` under
   `atlas:analyst-consent-v2:{userId}`. V2 wrote only to the existing
   `ai_analyst_requests` quota rows, which the legacy path also uses.
4. Rotating or removing `ATLAS_ANALYST_CONTEXT_KEY` invalidates every sealed
   context; users then start fresh with a notice.

## 8. Validation

| Command                | Result                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run lint`         | Pass                                                                                                      |
| `npm run typecheck`    | Pass                                                                                                      |
| `npm run test`         | 148 files passed, 7 skipped; 911 tests passed, 38 skipped (the new skip is the opt-in comparison harness) |
| `npm run format:check` | Pass                                                                                                      |
| `npm run build`        | Pass; `/analyst` and `/api/analyst/v2` render per request                                                 |

## 9. What enablement still needs

Each item needs explicit authorization from the owner:

1. **Finish the remaining routing gap:** ask which goal for "my main goal"
   (Q15). The capability gap is closed (§2.5, §2.6).
2. **Verify the provider route.** Confirm the OpenAI project's data-sharing
   setting, or configure and verify a non-sharing route (AI-02).
3. **Run the live evaluations** (§6) within an approved budget, with human
   review of the difficult cases.
4. **Run the signed-in two-owner and browser checks** on a machine with
   Docker.
5. **Configure and enable.** Set `ATLAS_ANALYST_CONTEXT_KEY`, then enable the
   flag for a small authorized cohort. Verify the deployed commit and its
   configuration before widening.
