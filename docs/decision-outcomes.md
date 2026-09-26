# Decision → Outcome Intelligence — Phase 19

**Status:** Implemented and locally accepted on 2026-09-26. Hosted migrations are applied; application release and signed-in production acceptance remain to be verified.

## Product contract

- A signed-in owner records a decision in their own words with its date, intended action, expected outcome, and later review date. Rationale, assumptions, one owned goal, one owned action task, and one supported recorded measure are optional. ATLAS does not infer or create a decision from other activity.
- Owners can edit and delete decisions and dated observation notes. A note may cite one owned task, transaction, or career application. Composite owner foreign keys, RLS, and server-side identity checks protect links. Deleting a linked record clears that link; deleting a decision removes its notes, revisions, and Timeline entries. Account deletion cascades through these records.
- Plan edits preserve the previous wording, date, expected outcome, rationale, assumptions, review date, goal, action task, and measure in an owner-only revision record. This history prevents later edits from silently rewriting the original plan.
- Native Graph links connect a decision to its goal and action task, an observation to its decision, and an observation to its cited source. Goal relationship counts include decisions. Life Timeline shows decisions and observations in date order, with source availability checked when read.
- The review compares one selected measure in equal 14-day windows before and after the decision, excluding the decision date. It waits for both the complete after window and the chosen review date. Phase 12 daily metrics supply the deterministic figures. A bounded owner-scoped query lists individual source IDs, dates, titles, amounts where applicable, and links for both windows. When a fully enumerated source count disagrees with the metric count, the comparison is withheld.
- The review describes sequence only. It shows questions about alternative explanations, the user's original assumptions, missing entries, and changed plans. It does not rate success or claim that the decision caused a change. An unavailable baseline, partial window, unsupported measure, or comparison older than the one-year history boundary remains inconclusive. No model call or reminder is made by this phase.
- JSON export includes decisions, notes, and revisions as format version 5. Separate CSV exports are available in Settings. Records remain until their owner deletes them or the account.

## Local acceptance — 2026-09-26

- Three migrations applied to the existing local Supabase database without a reset: `20260926051251_decision_journal`, `20260926051306_decision_timeline_column_fix`, and `20260926051309_decision_revision_context`. The second migration resolves an ambiguous Timeline output column found by pgTAP; the third preserves changed assumptions and rationale. Local migration history was aligned to the hosted versions after deployment.
- All 225 database assertions across 21 files passed. The Phase 19 cases cover owner isolation, foreign-link rejection, source cleanup, revision history, Timeline, Graph counts, bounded source IDs, and deletion. Local Supabase security advisors found no warning-level issues.
- Lint and typecheck passed. The production build included `/decisions` and `/decisions/[id]`. The application suite passed with two workers: 553 passed, 29 skipped across 113 files. The default parallel run had unrelated 5-second test timeouts; those tests passed in isolation and the bounded full run passed.
- A disposable local account completed the signed-in Chromium flow at 1280px and 320px: record a decision, select goal and task, cite a career application, inspect the source, revise the plan, see Timeline, verify no horizontal overflow, and delete the decision. The account was deleted afterward.
- Synthetic review cases cover complete and missing windows, delayed follow-up, year boundaries, and a larger recorded measure without a success or causal label. All five measure-specific alternative prompts remain questions.

## Release boundary

The hosted Supabase project has the prerequisite Graph and History migrations and all three Phase 19 migrations. Application deployment and a disposable signed-in production browser check remain. The current Analyst planner has no decision-specific evidence tool, so Phase 19 presents bounded deterministic interpretation instead of sending journal contents to a model. A future Analyst explanation needs a dedicated decision evidence contract, explicit data-sharing choice, quota handling, and the same no-causation checks.
