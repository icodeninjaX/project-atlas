# Phase 15 — Scenario Intelligence

**Implementation:** Local, 2026-09-25. **Calculation version:** Existing runway engine version 1. No migration, new dependency, stored simulation, or financial write was added. Hosted deployment and an authenticated production flow remain unverified.

## Supported comparison

The freeform Analyst can request one `compareFinancialScenarios` tool call with one or two changed alternatives. The tool reads the signed-in owner's current runway source once, calculates the baseline, and runs each alternative through the existing `calculateScenario` engine. It returns five matching figures for Current and each option: available liquid balance, monthly financial need, monthly income, monthly free cash flow, and runway estimate. Source links, baseline type, included months, target, and each option's assumptions appear in the response. The comparison never creates a payment, transaction, budget, or account adjustment.

Supported changes are replacement monthly income, percentage change to baseline monthly income, monthly essential expense change, one-time purchase, extra **monthly** payment toward a selected active debt, and reserve target months. The optional debt picker verifies owner and active status before Analyst quota is reserved. A selected goal and a debt cannot be combined in one question. The planner copies stated peso amounts into peso strings; ATLAS converts them to integer centavos and computes percentage income from the loaded baseline. Unstated amounts, debt IDs, and target months are rejected. The existing `runFinancialScenario` tool remains available for compatibility.

One-time debt payments and payoff dates are unsupported in this comparison because the current engine models extra debt payments as a monthly obligation. A one-time debt question receives a clear limitation before quota reservation. Missing, stale, or partial runway baselines produce no comparison. A foreign or deleted debt ID produces no result. The displayed estimates are conditional, not guaranteed outcomes or a recommendation to move money.

The freeform route requires the approved comparison tool for a financial what-if and sends only comparison evidence to the answer model. The answer model cannot supply figures; its scenario wording is restricted to a neutral, cited interpretation. Invalid model output falls back to the deterministic cards. On narrow screens, Current and options stack vertically, with visible assumptions, source navigation, and a financial-decision caution.

## Local acceptance — 2026-09-25

Deterministic tests cover engine parity, two alternatives from one source snapshot, peso-to-centavo conversion, percentage income, stale and invalid assumptions, missing and foreign debts, planner grounding, and answer wording. Route and component tests cover owner checks, consent, selected debt context, quota avoidance for unsupported one-time debt, comparison evidence isolation, and fallback behavior. The local two-owner Analyst integration passed five tests against real Supabase sources. An authenticated disposable local account checked the comparison at 320px and 1280px in Chromium; the account was removed afterward. Nineteen synthetic live planner and answer evaluations passed after tightening the unit and scenario instructions. The final application suite passed 500 tests (24 skipped); lint, typecheck, formatting and the production build passed.

This phase does not claim that the existing runway model predicts future balances, includes irregular income, reconstructs past financial state, or determines an objectively best choice. Hosted rollout and a data-rich production browser flow remain release gates.
