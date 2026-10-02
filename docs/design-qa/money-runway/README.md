# Money — runway premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `RunwayWorkspace` inside the app shell with fixture data:
five accounts (BPI Savings, GCash, and cash counted; Maya and an investment
account left out), six essential categories with July to September 2026
spending, two credit debts, and a 6-month target, at 9:00 AM on October 2.
The "before" route rendered the old page's markup with the same data. Both
routes were removed after capture. The "N" bubble is the Next.js dev-mode
indicator.

## Evidence

- `01-first-screen-390-dark.jpg`: the first phone screen before (a number
  in a card, then six stat boxes) and after (the runway as a figure, the
  date the money would last until, the month track, and the target gap in
  words).
- `02-whole-page-desktop-dark.jpg`: the whole page before and after. The
  always-open assumptions form and the list of names give way to the need
  split by category and the funds split by account.
- `03-desktop-light-target-met.jpg`: light mode with the target met.
- `04-scenario-desktop-and-phone-dark.jpg`: a ₱25,000 purchase and a doubled
  card payment, compared before and after; on phones the result docks above
  the navigation while the fields are being filled.
- `05-assumptions-sheet.jpg`: the assumptions sheet with Maya added and the
  new estimate previewed before saving.
- `06-states-phone.jpg`: under a month at 320 px, a missing choice, and a
  budget baseline.
- `07-360-200pct-text-dark.jpg`: 360 px with 200% text.

## What changed

- **Hero:** the runway as a large figure, when the chosen funds would last
  until ("early February 2027"), and a status in words: under a month,
  below the target, or target met. A track draws each month from now, lit
  up to the runway, hatched up to the target, with the target flagged and
  the months named underneath. The gap or the months to spare follow in a
  sentence, then runway funds, monthly need with a daily figure, free cash
  flow, and the reserve.
- **Monthly need:** essentials and debt minimums as a split bar, then each
  essential category and each debt minimum with its share. Category amounts
  add up to the total to the centavo.
- **Runway funds:** each counted account with its logo, balance, and the
  months of need it covers; accounts left out are listed below, with how
  much runway counting them would add.
- **Scenario:** presets (income stops, trim essentials 10%, double a debt
  payment), peso fields, spend less or more instead of a signed amount, and a
  month stepper. A result panel shows now and the scenario side by side as
  tracks, the change in months, and each figure before and after.
- **Assumptions:** a sheet, as on the budget page, with accounts and
  categories as tappable rows that show balances and monthly amounts. The
  estimate is recalculated as choices change, before they are saved. It saves
  through the same `runway.savePreferences` mutation and form fields
  (`accountId`, `categoryId`, `targetMonths`).
- **Setup states:** each missing piece names itself and opens the sheet, or
  links to Accounts or Budget when the fix lives there.

## Checks

1. No horizontal overflow in the ready, target-met, under-a-month, setup,
   budget, and no-debt states at 320, 360, 390, and 1280 px, with the sheet
   open or closed, nor at 360 px with 200% text.
2. axe reports no violations in `main` or the sheet in light or dark across
   those states (20 runs).
3. The preview in the sheet uses the same engine as the server. Choosing a
   different set of essentials picks the fallback budget again, the way the
   server loads it (`pickRunwayBudget`).
4. The track, bars, and docked result are decorative; every value they show
   is also in text. Months fill in on arrival and slide when a scenario
   changes, and neither happens under `prefers-reduced-motion`.
