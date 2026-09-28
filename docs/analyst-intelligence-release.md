# Analyst Intelligence — AI-07 Evaluation, Hardening and Release Evidence

Phase AI-07 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-06 communication and interface](analyst-intelligence-communication.md).

> **Release decision: not released.** V2 stays behind `ATLAS_ANALYST_V2`, which
> is off by default. Two hard gates are not satisfied (§3), the quality
> targets are unmeasured because no live evaluation was authorized (§4), and
> the deterministic corpus run already shows a capability gap that rules out
> the answerable-coverage target (§2.2). Nothing in this phase enables V2
> anywhere.

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
| Statuses                                              | 39 `fallback_facts`, 19 `insufficient_evidence`, 2 `clarification_required`              |
| `fallback_facts` answers with no checked figure       | 0 (was 58 before fix 1)                                                                  |
| Maximum tool calls in one run                         | 5, within the deep envelope of 8                                                         |
| Cases over their frozen per-case tool budget          | 2: Q28, Q38 (4 calls against 3; V2 takes the deep path for these relationship questions) |
| Answerable cases reaching any evidence                | **35 of 49 (71%)**                                                                       |

**The capability gap is a release blocker.** Fourteen answerable cases get
no evidence from V2 at all:

| Area                          | Cases              |
| ----------------------------- | ------------------ |
| Cash and debt scenarios       | Q06, Q10           |
| Goal attention and task order | Q18, Q19           |
| Job applications              | Q23, Q44           |
| Weekly reviews                | Q26, Q52           |
| Signals                       | Q30                |
| Decisions                     | Q31, Q32, Q33, Q35 |
| Clarification follow-up       | Q43                |

These are the legacy-only capabilities recorded in AI-04. Since at most 71% of
answerable cases can be answered from evidence, the ≥90% answerable-coverage
target cannot be met by any writer model. The test pins this list: shrinking
it is progress, and any addition fails.

Q15 ("How is my main goal going?") returns `insufficient_evidence` where the
corpus expects `clarification_required`. The deterministic brief does not
treat "main goal" as ambiguous.

### 2.3 Shared-client regressions

`src/lib/ai` and `src/lib/analyst/tools` are unchanged since AI-00. Their
suites pass (295 tests across AI, capture, analyst routes, freeform, planner
and tools). So do the weekly insights, Capture, the preset `/api/analyst` and
the freeform route suites (148 tests).

### 2.4 Rollback

`page.test.tsx` shows the server flag alone chooses the workspace, on each
request. With the flag off, or for a signed-out visitor, users get the legacy
workspace. With it off, `/api/analyst/v2` returns 404.

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
| ≥90% answerable cases fully correct               | Unmeasured; **bounded above by 71% evidence reach** (§2.2)   |
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

The comparison harness runs every holdout case on each arm and reports:

- status counts and status agreement;
- stability across runs;
- forbidden-claim hits and hard-gate failures;
- provider calls and settled tokens;
- median latency.

Facts, usefulness and preference are left for a human or grader. It was
checked end to end with `ATLAS_EVAL_DRY_RUN=1`, which blocks every provider
request. That dry run produced 180 samples, 0 provider calls, and no crashes
or hard-gate failures on any arm. It shows only that the harness works: with
the provider blocked, every arm falls back.

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
| `npm run test`         | 145 files passed, 7 skipped; 893 tests passed, 38 skipped (the new skip is the opt-in comparison harness) |
| `npm run format:check` | Pass                                                                                                      |
| `npm run build`        | Pass; `/analyst` and `/api/analyst/v2` render per request                                                 |

## 9. What enablement still needs

Each item needs explicit authorization from the owner:

1. **Close the capability gap** (§2.2): V2 read tools for debt scenarios,
   task priority, job applications, decisions, weekly reviews and signals,
   plus ambiguity detection for Q15.
2. **Verify the provider route.** Confirm the OpenAI project's data-sharing
   setting, or configure and verify a non-sharing route (AI-02).
3. **Run the live evaluations** (§6) within an approved budget, with human
   review of the difficult cases.
4. **Run the signed-in two-owner and browser checks** on a machine with
   Docker.
5. **Configure and enable.** Set `ATLAS_ANALYST_CONTEXT_KEY`, then enable the
   flag for a small authorized cohort. Verify the deployed commit and its
   configuration before widening.
