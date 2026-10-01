# Money — budget premium pass

Captured on 2026-10-01 at 390 × 844 (2× density, touch emulation) and
1280 × 900 with Chromium, against a temporary local QA route that rendered
the real budget components with fixture data: eleven expense categories,
an October plan of ₱42,000 against ₱65,000 expected income, spending
through 18 October, and a September plan and spending to start from. The
"before" route mirrored the old page's markup with the same data. Both
routes were removed after capture.

## Evidence

- `01-first-screen-dark.jpg`: the first screen before (three stat boxes)
  and after (one hero: month switcher, what is left to spend, the plan
  meter with today's pace marker, the daily allowance, and what is over,
  named).
- `02-whole-page-light.jpg`: the whole page. The always-open form with an
  input per category gives way to category envelopes and the spending that
  sits outside the plan; the page drops from 2,792px to 2,332px tall.
- `03-plan-editor-dark.jpg`: the plan editor sheet: expected income, quick
  starts from last month, an amount per category with this month's and last
  month's spending beside it, and live totals that stay in view.
- `04-edit-from-category-light.jpg`: tapping a category opens the editor
  with that category's amount focused.
- `05-empty-month-light.jpg`: a month with no plan, before and after, and
  the editor started from September's plan.
- `06-desktop-dark.jpg`: the same at 1280px: the hero splits into the
  headline and a 2 × 2 grid of figures, and envelopes run in two columns.

## Checks

1. "Left to spend" is the plan minus every expense this month, planned or
   not, so spending outside the plan is never hidden; it is also listed by
   category with a way to plan it.
2. Overspending is named in text: "Over plan by", "Over in Shopping and
   Utilities.", "₱640.00 over" on the envelope, and "over income" in the
   editor when the plan passes expected income.
3. The pace marker and "Day 18 of 31" show only for the current month; past
   months read "Left unspent" and "Month closed", and offer "This month".
4. The editor saves through the same `budget.save` mutation and form fields
   as before (`monthStart`, `expectedIncome`, `item:<category>`), and keeps
   the month's existing note instead of clearing it.
5. No horizontal overflow on the plan, empty, over-plan, and past views, or
   with the editor open, at 320, 360, 390, 768, and 1280px, nor at 150% and
   200% text. With large text the figure grid falls back to one column.
6. No console errors while opening the editor from the
   hero, a category, or "Plan", using both quick starts, and typing.
