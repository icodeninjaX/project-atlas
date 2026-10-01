# Money — mobile premium pass QA

Captured on 2026-10-01 at 390 × 844 (2× density, touch emulation) with
Chromium, against a temporary local QA route that composed the real Money
components with fixture data (six accounts, twelve transactions, three
transfers). The route was removed after capture.

## Evidence

- `01-accounts-first-screen-dark.jpg`: the first screen before and after.
  The heading drops its description and buttons on phones; the hero gains
  round quick actions (Record, Transfer, Add account, Archived) and an
  account-count pill, so the accounts start on the first screen.
- `02-accounts-full-light.jpg`: the whole page. Accounts stack like cards in
  a wallet — each strip shows logo, name, and balance, the last card is
  whole — taking the page from 1,944px to 1,371px tall.
- `03-transactions-first-screen-light.jpg`: compact heading and lighter
  month summary (plain stats under a hairline instead of boxed tiles), with
  the floating new-transaction button.
- `04-record-first-screen-dark.jpg`: the record bar no longer covers the
  category tiles before there is an amount.
- `05-transfers-first-screen-dark.jpg`: compact heading and real
  placeholders in the empty From/To tiles.
- `06-stack-opens-account-dark.jpg`: tapping a covered strip opens that
  account (BPI Payroll), not the card above it.
- `07-history-add-button-dark.jpg`: the add button floats above the bottom
  navigation while scrolling history.
- `08-record-docked-dark.jpg`: once an amount is typed, the bar docks with
  the balance after the entry and the amount on the button.

## Checks

1. Each stacked strip leaves exactly 72px (4.5rem) visible; the last card
   is whole.
2. Quick actions fit four across at 320, 360, and 390px; at 150% text they
   become two columns and at 200% one, never overlapping.
3. With large text (150% and 200% root size) the stack falls back to whole
   cards in a column, because a strip would otherwise clip the balance or
   hide the name. A container query makes the switch.
4. No horizontal overflow on Accounts, Transactions (History and Record),
   Transfers, or Archived at 320, 360, 768, and 1280px, nor at 360px with
   200% root text size.
5. No console errors or warnings while opening sheets from the stack, using
   the quick actions, tapping the floating button, or docking the bar.
6. Tablet and desktop layouts are unchanged: stacking, quick actions, the
   compact heading, and the floating button apply below `sm` only.
