# Money — debts premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `DebtsWorkspace` and `DebtDetail` inside the app shell with
fixture data: four open debts (Maya Credit at 48%, BPI Rewards Card at 36%, a
0% Home Credit installment, and a 0% family loan), one paid-off GCash GLoan,
and payments from May to October 2026, at 9:00 AM on October 2. The "before"
route rendered the previous pages from the last commit with the same data.
Both routes were removed after capture. The "N" bubble is the Next.js
dev-mode indicator; full-page phone captures draw the fixed bottom navigation
where the viewport was.

## Evidence

- `01-first-screen-390-dark.jpg`: the first phone screen before (two totals
  and a tab strip) and after (what is owed, the share repaid, the payment that
  needs attention, and the debt-free date).
- `02-whole-page-desktop-dark.jpg`: the whole page before and after.
- `03-desktop-light.jpg`: light mode.
- `04-plan-with-extra.jpg`: ₱2,500 extra a month under avalanche (desktop,
  dark) and snowball (phone, light): the finish moves five months sooner, and
  the route redraws which debt gets the focus when.
- `05-detail-desktop-dark.jpg`: a debt before and after, with a payment typed
  in and double the minimum tried in the outlook.
- `06-sheets.jpg`: adding a debt (the estimate updates as the terms are
  typed) and editing one from its card.
- `07-states-phone.jpg`: nothing tracked, everything paid off, and a minimum
  that does not cover the interest.
- `08-360-200pct-text-dark.jpg`: the detail page at 360 px with 200% text.

## What changed

- **Under Money:** the page now carries the Money navigation and heading, so
  Debts sits beside Runway and Budget instead of apart from them.
- **Hero:** the total owed as the headline, how much of everything borrowed is
  repaid (paid-off debts included), the next payment with its urgency, and four
  figures: the debt-free month, monthly minimums, this month's interest at
  today's rates, and what was paid this month.
- **Payoff plan:** the three orders compared side by side on the same budget,
  each with its debt-free month and total interest, and the cheapest marked.
  An extra monthly amount (typed, or ₱500 to ₱5,000 in one tap) shows how much
  sooner and cheaper the plan gets. A note says what rolling each cleared
  payment on to the next saves against paying each minimum alone. The route
  draws every debt on one time line: hatched while it gets only its minimum,
  lit once it becomes the focus. Choosing an order updates the list and the
  address at once; nothing is saved.
- **Open debts:** cards in plan order, each with its balance against what was
  borrowed, the share repaid, its payoff month, the focus marker, a due chip
  (overdue, within a week, or later), the minimum, and the last payment. The
  card opens the debt; the pencil edits it in a sheet. A Dayline "Pay …" link
  (`?highlight=`) outlines and scrolls to its debt.
- **Paid off:** cleared debts are listed with what was repaid, where before
  they disappeared.
- **Add and edit:** a sheet with the debt type as tiles, peso fields, and a
  live estimate of the payoff at the minimum. A paid debt given a balance again
  becomes active again, so the database's paid check never rejects the save.
- **Debt page:** the balance against what was borrowed, the rate with this
  month's interest, the next due date, and the payoff month at the minimum. A
  payment form with Minimum and Full balance shortcuts, Today and Yesterday,
  and a preview of what the payment leaves (or that it clears the debt); it
  will not submit more than is owed. A payoff outlook draws the balance month
  by month with a crosshair (mouse or arrow keys) and a year-by-year table,
  and compares paying 25%, 50%, or 100% more. Payment history groups by month
  with totals and asks before deleting.

## Engine

`src/lib/debts/plan.ts` simulates every open debt month by month: interest
compounds first, each active debt gets its minimum, and the extra plus any
freed-up payments go down the chosen order. Paused and defaulted debts get no
minimum, only what the plan frees up. For one debt it matches
`projectDebtPayoff` to the centavo (covered by a test). A plan that never
finishes stops at 50 years, or sooner if balances run away, so figures stay
safe integers.

## Checks

1. No horizontal overflow on the list (ready, nothing tracked, all paid off,
   stalled, and one debt) or the debt page (with and without payments, and
   paid off) at 320, 360, 390, 768, and 1280 px in both themes, nor at 360 px
   with 200% text.
2. axe reports no violations in `main` across those states at 390 and 1280 px
   in light and dark (32 runs), and no console errors.
3. The strategy choices are native radios named by the strategy and described
   by their outcome; the route, meters, and chart are decorative or carry the
   same values in text and in a table.
4. Money in the plan's comparisons (whole-peso savings included) is hidden in
   privacy mode like every other amount.
5. The chart's axis labels are written out by hand: compact notation differs
   between Node's and Chromium's ICU data and caused a hydration mismatch.
6. Bars fill in and the route slides when the plan changes, and neither
   happens under `prefers-reduced-motion`. Text never animates.
