# Phase 14 — Recorded pattern and association discovery

**Implementation:** Local, 2026-09-25. **Method version:** 1. This phase adds no migration, new dependency, stored inference, or autonomous action. Deployment and hosted browser acceptance have not been verified.

## Supported question and source boundary

ATLAS tests pairs among the six Phase 12 historical metrics: recorded income, expenses, debt payments, task completions, knowledge reviews, and weekly review score. The scope is whole-domain monthly history. Career activity, stress, sleep, goals, Graph links, and category-level spending are not supported historical series and cannot become association findings. A selected goal cannot be attributed a whole-domain pattern.

The `atlas_historical_metrics` RPC runs as the signed-in owner with RLS and has no owner argument. It recomputes surviving records on each request. The new Patterns page scans all fifteen unordered metric pairs; the approved `getPatternAssociation` Analyst tool reads one pair with the same method. The tool returns one citation only for a qualified finding, or `insufficient` with no evidence when a check fails. No private descriptions, review prose, raw rows, or owner IDs go to the answer model. The freeform route requires this tool for association questions and provides only its qualified finding to the answer model. Existing consent and quota controls still apply.

## Method and refusal rules

The fixed window is the **eleven most recent completed Asia/Manila calendar months**. The Phase 12 RPC rejects dates more than 365 days old; eleven full months fit that existing boundary without changing the database contract. This gives ten aligned month-to-month changes per metric. No current partial month, missing bucket, shifted period, or period before the first surviving source is filled with zero.

A pair is withheld unless both series have all eleven `recorded` months, at least twelve contributing records across the window and activity in at least six months. Flat change series are withheld. For eligible pairs, ATLAS calculates Pearson correlation of the ten monthly changes, requires absolute correlation of at least 0.75, and repeats the calculation after omitting each change in turn. Every omission must keep the direction and absolute correlation of at least 0.55. A deterministic 20,000-draw two-sided permutation test estimates the null probability. Its p-value is Bonferroni-adjusted for **all fifteen** supported pairs, even for a one-pair Analyst request; only adjusted p at most 0.01 passes. The method and thresholds are versioned together. Failed checks produce no coefficient or AI explanation.

The displayed coefficient and adjusted p-value are descriptive statistics for recorded data, not confidence that a life-domain relationship is real. First differences reduce simple shared trends; they do not rule out seasonality, serial dependence, confounding, chance over later monthly reruns, edits, deletion, or unrecorded activity. A passing finding is still an association, never evidence that one metric caused another. The answer validator rejects causal language and numeric claims in model prose; authoritative numbers, method, period, sources, and limitations remain ATLAS-rendered.

## Product surface

`/history/patterns` is linked from Recorded history. It shows a quiet no-finding state when no pair passes, or source-linked cards with an accessible monthly table, sample count, coefficient, estimated adjusted p-value, method, and causal limitation. Tables scroll within cards on narrow screens; source values follow privacy mode. Analyst citations link to this page and use the `correlation` unit rather than treating a coefficient as a review score.

## Local acceptance — 2026-09-25

- Deterministic tests cover same-direction and inverse findings, incomplete/shifted/sparse series, flat and unrelated movement, single-outlier sensitivity, edits/deletions, reproducibility, and a seeded 100-window independent-null search over all fifteen pairs. The synthetic false-pattern check passed its at-most-five-window threshold after the permutation sampler and significance rule were tightened.
- Tool and route tests cover strict pair inputs, owner-argument rejection, validated RPC rows, withheld output, approved-tool requirement, and refusal to give causal language. The full application suite, local database assertions, typecheck, lint, format check, and production build passed in this working copy; exact final counts are recorded in the implementation closeout.
- The existing real local two-owner Analyst integration ran all approved tools, including the new pattern tool, without provider calls. Authenticated Chromium desktop and mobile browser checks reached the no-finding Patterns state through the History link, verified readable layout without page-level overflow, and removed the disposable account afterward. A full qualified-finding card was rendered in a component test; live browser acceptance of a data-rich finding remains unverified.
- Eight synthetic live planner evaluations passed, including exact selection of the pattern tool and its two metric keys while preserving the older monthly comparison plan. Seven synthetic live answer evaluations passed, including a qualified pattern citation and a causal challenge. The answer path either emits a validated neutral citation or falls back to ATLAS facts when model prose violates the claim rules.

Hosted rollout remains a separate release gate. A new application revision must be deployed and checked against the existing hosted Phase 12 RPC and an authenticated browser account before this phase can be called production-verified.
