# Analyst Intelligence — AI-01 Contracts and Claim Checks

Phase AI-01 of the [Analyst intelligence roadmap](analyst-intelligence-implementation.md),
built on the [AI-00 baseline](analyst-intelligence-baseline.md).

| Field               | Value                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Date                | 2026-09-28 (Asia/Manila)                                                                               |
| Starting commit     | `a3471d3` (AI-00) on `claude/gifted-gauss-p02yki`                                                      |
| Legacy path         | Unchanged. `/api/analyst/freeform`, its prompt, verifier, word bans and response shape are untouched.  |
| Feature flag        | `ATLAS_ANALYST_V2=1` (server only, default off). It gates only the fixture preview page in this phase. |
| Live provider calls | None. No writer model produces V2 drafts yet; tests use fixed synthetic drafts.                        |
| Migrations          | None.                                                                                                  |

## 1. What was added

All under `src/lib/analyst/intelligence/` unless noted.

| File                                                                          | Responsibility                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts.ts`                                                                | Zod schemas and inferred types: `AnalysisBrief`, `EvidenceV2` (metric, record fact, text excerpt, graph path, scenario output), `DerivedFact`, draft claims, `AnalyticalClaim` verification, `DraftAnswer`, `RequirementCoverage`, `AnswerV2`, result statuses and unresolved reasons. |
| `semantics.ts`                                                                | Metric semantics. Historical metrics are read from `metricDefinitions`; other entries describe values existing tools return. Every metric has a comparable group, and domain vocabulary (English and Filipino) for text binding.                                                       |
| `legacy-evidence.ts`                                                          | Adapter from current `ToolEvidence` plus the validated tool input to `EvidenceV2`. Unclassified values get an isolated comparable group.                                                                                                                                               |
| `calculations.ts`                                                             | Approved derivations: `difference`, `percent_change`, `ratio`, `sum`, `rank`, `contribution`.                                                                                                                                                                                          |
| `claims.ts`                                                                   | Deterministic claim checks and `claimCanShip`.                                                                                                                                                                                                                                         |
| `response.ts`                                                                 | Coverage evaluation after rejection, result status, repair eligibility and `AnswerV2` assembly.                                                                                                                                                                                        |
| `flags.ts`                                                                    | `analystIntelligenceV2Enabled()`.                                                                                                                                                                                                                                                      |
| `evaluation/v2-fixtures.ts`, `evaluation/observe.ts`, `evaluation/preview.ts` | V2 evidence from the AI-00 fixtures, the bridge from `AnswerV2` to the AI-00 scorer, and preview answers.                                                                                                                                                                              |
| `src/components/analyst/answer-v2.tsx`                                        | Minimal renderer: status, direct answer, sections, server-rendered table values, unresolved requirements, limitations, verification summary and sources. Privacy masking uses the existing `ClaimText` and `SensitiveValue`.                                                           |
| `src/app/(app)/analyst/v2-preview/page.tsx`                                   | Request-time preview of fixture answers. Returns 404 unless the flag is on and the request is signed in. It reads no user records and calls no model.                                                                                                                                  |

## 2. Contract rules

- **One authority.** Types are inferred from the schemas; nothing is duplicated
  for the UI.
- **The writer proposes and ATLAS verifies.** A draft claim has no
  `verification` field (strict schema). `checkClaim` fills in the structural,
  deterministic and semantic results.
- **Evidence coverage is four separate facts:** query, recording, period and
  relationship completeness. Stored records never set recording coverage to
  complete. Legacy `partial` maps to an incomplete query.
- **Sets.** Totals, rankings and contributions need every member of a set
  that is marked complete. The legacy top-five category slice is marked
  incomplete, so it can never support a ranking.
- **Derived facts** carry their operation version, operands, metric,
  comparable group, scope, periods, rounding (tenths of a percent, half away
  from zero), denominator rule and completeness. A zero denominator returns
  `undefined` rather than a number. Centavo arithmetic throws if it would
  leave the safe-integer range.
- **Everything visible is checked.** The direct answer and sections list claim
  IDs, and rejected claims are removed from both. Table cells are references
  that ATLAS renders itself. A table's caption claim must cite every value in
  the table, or the caption is rejected and the table is dropped. Section
  labels cannot contain figures.

## 3. Deterministic claim checks

A claim ships only when it passes structural and deterministic checks, and
semantic review has not found it unsupported. Semantic review does not run
yet (AI-05); interpretive claims ship with `semantic: "pending"`, and the
renderer says so.

| Check            | Rule                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| References       | Cited evidence, derived facts, requirements and assumptions must exist and be unique. Every material kind needs support.                                                                                                                                                                   |
| Scope            | Every cited item must be in the claim's own scope. Limitation claims are exempt. Goal and whole-domain facts need separate claims.                                                                                                                                                         |
| Figures          | Every number must equal a cited value or ATLAS-derived output, to the centavo or whole pesos, or to a tenth or whole percent. Years of cited periods are allowed. Differences and percentages between arbitrary pairs are no longer accepted.                                              |
| Dates and months | ISO dates and month-day phrases must be cited period endpoints. Month names (English and Filipino), "this month" and "last month" must overlap a cited period. "May" counts as a month only beside a day, a year or "in".                                                                  |
| Measure          | A domain word in the text ("income", "gastos", "tasks") must be backed by cited evidence from that domain.                                                                                                                                                                                 |
| Direction        | English and Filipino direction words need either a declared comparison or a cited ATLAS change with the same sign. Comparisons need the same unit, comparable group and scope. A different measure needs the same period; the same measure in different set members needs the same period. |
| Superlatives     | "Largest", "highest", "most" and "pinaka-" need a cited complete `rank` or `contribution`. A tie must be disclosed ("tied").                                                                                                                                                               |
| Completeness     | Non-limitation claims cannot cite incomplete evidence or incomplete derived facts. An undefined percent can be cited only when the claim says it is undefined.                                                                                                                             |
| Kept bans        | Causal words (including "dahil"), certainty, significance and number words are still rejected. Interpretations and hypotheses must be hedged. An association must cite the approved test. A recommendation must name a requirement or assumption.                                          |

What V2 relaxes compared with the legacy verifier, each backed by a typed
check and a test: supported superlatives and ties, and Filipino wording.

## 4. Coverage and result status

`evaluateCoverage` runs over the checked claims:

- A requirement is `answered` only by a shippable, non-limitation claim.
- Otherwise it is `unresolved`, with `insufficient_evidence` (a shipped
  limitation explains it), `claim_rejected`, or `no_supported_claim`.
- Status: all essential requirements answered gives `answered`. Some answered
  gives `partial_answer`. Only limitations gives `insufficient_evidence`.
  Nothing shippable gives `fallback_facts`.
- `repairEligible` is true when an essential requirement lost its claim to
  rejection.

Semantic confirmation that an attached claim really answers its requirement
is `pending` until AI-05.

## 5. AI-00 gaps closed on the V2 path

| Baseline                               | V2 result                                                                                                             | Test                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| B01 trivial claim survives as answered | `partial_answer`, unresolved `claim_rejected`, repair eligible; the scorer shows no hard-gate failure                 | `response.test.ts`                         |
| B02 wrong month                        | rejected (`month`)                                                                                                    | `response.test.ts`                         |
| B03 wrong metric                       | rejected (`metric_mismatch`)                                                                                          | `response.test.ts`                         |
| B04 unrelated counts compared          | rejected (`incompatible_comparison`); `difference` throws                                                             | `response.test.ts`, `calculations.test.ts` |
| B05 supported tie rejected             | passes with "tied"; rejected without it                                                                               | `response.test.ts`                         |
| B06 top-five slice                     | complete `contribution` reconciles ₱1,900.00 across seven members including uncategorized; a legacy slice cannot rank | `calculations.test.ts`                     |
| B07 810% from unrelated values         | rejected (`figure`)                                                                                                   | `response.test.ts`                         |
| B08 Taglish false direction            | rejected; the correct Taglish comparison passes                                                                       | `response.test.ts`                         |
| Sampled "largest" (Q04)                | rejected (`unsupported_superlative`, `undefined_result`); the full-month ranking passes                               | `response.test.ts`                         |
| Zero baseline (Q08)                    | `undefined`; "100%" rejected                                                                                          | `calculations.test.ts`, `response.test.ts` |

The legacy characterization tests in `evaluation/baseline.test.ts` still pass
unchanged, confirming that the legacy path was not weakened or altered.

## 6. Validation

| Command                                   | Result                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `npm run lint`                            | Pass                                                                   |
| `npm run typecheck`                       | Pass                                                                   |
| `npm run test`                            | 134 files passed, 4 skipped; 782 tests passed, 29 skipped (AI-00: 752) |
| `npm run format:check`                    | Pass                                                                   |
| `npm run build`                           | Pass; `/analyst/v2-preview` is dynamic (`ƒ`)                           |
| `next start` with the flag on, signed out | 307 to login, with no preview content in the body                      |

Not run: signed-in preview in a browser (no Supabase test environment),
Supabase database tests, end-to-end tests, and live models.

## 7. Known limits and next phase

- Figures bind to a cited value, not to a particular position in the
  sentence. A claim citing both totals could swap their labels. Per-figure
  binding needs the writer to emit figure references, which is AI-05/AI-06
  writer work.
- Category and entity names are not validated in text; names reach the
  renderer only as owner-authorized labels (AI-02).
- The domain vocabulary is lexical. It narrows mislabeling but is not a
  semantic check; the structured comparison is the authority.
- No tool yet returns a complete category breakdown; `getMoneyBreakdown` is
  AI-02B. Until then the V2 path cannot rank categories from live data.

**Next phase: AI-02** (done; see [analyst-intelligence-data-access.md](analyst-intelligence-data-access.md)) — data policy and capability manifest (AI-02A), entity
resolution and numeric detail tools including the complete money breakdown
(AI-02B), and decisions with connected context (AI-02C). Sensitive narrative
access stays disabled until a verified non-sharing provider route exists.
