# Analyst Intelligence — AI-05 Semantic Review, Repair and Recommendations

Phase AI-05 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-04 bounded investigation](analyst-intelligence-investigation.md).

| Field               | Value                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Date                | 2026-09-28 (Asia/Manila)                                                                                                                                                                   |
| Starting commit     | `d329526` (AI-04) on `claude/gifted-gauss-p02yki`                                                                                                                                          |
| Legacy path         | Unchanged. The legacy word bans and verifier still govern `/api/analyst/freeform`.                                                                                                         |
| Live provider calls | None made. The writer and reviewer are implemented against the existing metered gateway and tested with scripted provider responses. A live reviewer evaluation exists but is opt-in (§6). |
| Pool feature        | Writer, reviewer and repair calls are metered as `analyst_answer`. The database only accepts existing feature names, and adding one needs a migration.                                     |
| Migrations          | None.                                                                                                                                                                                      |

## 1. Pipeline (`synthesis.ts`)

1. **Draft.** The writer (`writer.ts`) drafts claims against the brief, the
   selected evidence and the ATLAS-derived facts, using a strict JSON schema.
2. **Deterministic checks first.** The AI-01 claim checks reject invalid
   figures, scopes, periods, references and wording before any review.
3. **Semantic review** (`review.ts`) runs when the answer interprets
   (interpretations, hypotheses, associations or recommendations) or the run
   was deep. A lookup made only of facts or calculations makes no review call.
4. **Repair.** When an essential requirement lost its claim (to a
   deterministic rejection or a reviewer's "not answered"), or a claim was
   qualified, one repair asks the writer for the missing content. The request
   includes the rejection reasons and the reviewer's notes, and the notes are
   marked untrusted.
5. **Re-check.** Repaired claims pass the same deterministic checks and, when
   interpretive, a second review. A repaired claim is never considered
   verified because the first draft was checked.
6. **Merge.** First-round claims that passed are kept, and repaired claims
   that pass are added with new IDs.
7. **Recompute** (`recomputeAnswer` in `response.ts`). Coverage, status,
   unresolved reasons, sources, the direct answer and sections are derived
   again from the claims that can ship. A reviewer's "not answered" overrides
   an attached claim. Reasons the investigation already knew (unsupported,
   excluded, missing data) are kept.

**When a check can't run:**

| Situation                                   | Result                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The writer fails                            | `fallback_facts`, with a limitation saying only checked facts are shown                       |
| The reviewer is unavailable or unaffordable | Interpretive claims are withheld (`review:unavailable`); facts still ship                     |
| A repair is unaffordable                    | Only the claims already validated ship, and the answer is `partial_answer` with typed reasons |
| A claim is qualified but never repaired     | It does not ship (`review:qualification_not_applied`)                                         |

## 2. Stage calls (`stages.ts`)

Each writer, reviewer or repair call:

- builds its request only from the policy-filtered payload, and asserts that
  payload again immediately before sending (AI-02 policy);
- must fit the run ledger (`canCallAnswerStage`). Answer stages may spend the
  reserve AI-04 held back; nothing else may;
- goes through the existing `requestStructuredJson` gateway and daily pool
  meter;
- is charged from the provider's reported usage. When usage is unknown it is
  charged at the reserved maximum. A call the meter refused sent nothing and
  is not charged.

## 3. Reviewer contract

The reviewer sees the question, requirements, assumptions, the claims that
passed deterministic checks, and only the evidence and derived facts those
claims cite. It returns:

- a verdict for each claim: `supported`, `qualified` or `unsupported`, with
  issues (`unsupported_by_evidence`, `wrong_subject`, `wrong_period`,
  `overstated_certainty`, `association_as_cause`, `ignores_counterevidence`,
  `not_connected_to_objective`, `generic`, `contradiction`);
- whether each requirement is answered, and by which claims;
- contradictory claim pairs;
- repair instructions.

It cannot run tools, and nothing it writes is shown to users.

`applyReview` handles the reviewer's output as follows:

| Reviewer output                                             | Effect                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| A verdict citing evidence the claim does not cite           | Ignored, so the reviewer cannot bring in new facts          |
| No verdict for an interpretive claim, or a malformed review | The claim is `unsupported` (`review:not_confirmed`)         |
| A contradicting pair                                        | Both claims become `qualified` until a repair resolves them |
| A verdict for a requirement ID that does not exist          | Ignored                                                     |

`reviewerAgreement` measures false approvals and false rejections against
seeded claims with known verdicts.

## 4. Recommendations

A `recommendation` claim needs a structured `recommendation` with:

- `objectiveRequirementId`: a brief requirement, meaning the user's objective;
- constraints;
- a trade-off;
- one next action: a label and an optional path to an existing ATLAS page. It
  never performs a change;
- `conditional`: when set, or when the text says "if" or "kung", the claim
  must cite an assumption.

The trade-off, constraints and action label are checked together with the
claim text, including figures, dates, wording and superlatives. Generic
advice ("stay focused", "keep it up", "work harder") is rejected. Supported
rankings, accounting contributions and conditional options pass. No overall
"life score" is computed.

Contradiction and context-change handling across turns reuse AI-03's
`explainChange`: `data_changed`, `assumption_changed`, `scope_changed`,
`source_unavailable` or `prior_error`.

## 5. Required tests (`synthesis.test.ts`)

| Seeded case                                                    | Result                                                                                                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A lookup made only of facts                                    | `answered`, one writer call, no review                                                                                                         |
| A supported tie ranking and a conditional recommendation       | `answered`; the recommendation passes both deterministic and semantic checks and keeps its trade-off; every requirement is confirmed           |
| An unsupported interpretation ("habits are out of control")    | Rejected by the reviewer. The repair adds a hedged interpretation that passes a second review: `answered` after writer, critic, repair, critic |
| A wrong-scope claim                                            | Rejected deterministically; the repair is checked again; `answered`                                                                            |
| A repaired claim with an invented figure                       | Rejected; nothing ships                                                                                                                        |
| Contradicting claims                                           | Qualified, then resolved by repair; the contradicting claim does not ship                                                                      |
| Generic, objective-free or unstated-assumption recommendations | Rejected (`generic_recommendation`, `recommendation_without_objective`, `unstated_assumption`)                                                 |
| A dropped essential answer with no budget left for repair      | Repair refused as `provider_calls`; `partial_answer`, with only the validated claim shipped                                                    |
| Reviewer unavailable                                           | Interpretations withheld, facts kept, review marked `unavailable`                                                                              |
| A reviewer that cites evidence the claim does not              | The verdict is ignored; the claim is not confirmed                                                                                             |
| The writer fails                                               | `fallback_facts`                                                                                                                               |
| Labels and private text on the shared route                    | Absent from the provider request body                                                                                                          |
| Reviewer metrics                                               | False approvals and false rejections counted separately                                                                                        |

## 6. Opt-in live reviewer evaluation

`review.live.eval.test.ts` sends one metered reviewer request over six seeded
synthetic claims with known verdicts:

- three that should be supported;
- one naming the wrong category as the main source;
- one inventing a motive;
- one forecasting.

It logs agreement, false approvals, false rejections and usage. It runs only
with `ATLAS_ANALYST_V2_LIVE_EVALS=1`, a configured OpenAI key and the pool
meter, and it asserts no accuracy threshold. **It has not been run:** no live
evaluation was authorized. A local check confirmed that all six seeds pass
the deterministic checks, so they would reach the reviewer.

## 7. Validation

| Command                | Result                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run lint`         | Pass                                                                                                          |
| `npm run typecheck`    | Pass                                                                                                          |
| `npm run test`         | 139 files passed, 5 skipped; 855 tests passed, 30 skipped (AI-04: 842; the new skip is the opt-in live suite) |
| `npm run format:check` | Pass                                                                                                          |
| `npm run build`        | Pass                                                                                                          |

## 8. Known limits and next phase

- Reviewer accuracy is unmeasured until the opt-in evaluation is authorized
  and run repeatedly; one run is not a reliability estimate.
- Writer and reviewer share the `analyst_answer` pool feature. Separate
  metering labels would need a migration.
- The writer schema always leaves `table` null; tables arrive with the AI-06
  interface.

**Next phase: AI-06** — implemented; see
[communication, model controls and interface](analyst-intelligence-communication.md).
