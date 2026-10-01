# Money — premium redesign QA

Captured on 2026-10-01 with Chromium against a temporary local QA route that
composed the real Money components with representative fixture data (six
accounts across GCash, BPI, cash, Maya, GoTyme, and an investment account;
twelve transactions; three transfers). The route was removed after capture.

## Evidence

- `01-accounts-desktop-dark.jpg`, `02-accounts-mobile-dark.jpg`: Accounts before
  and after. The total leads in a hero with a part-to-whole split; each account
  is a card in its provider's colors with its share of the total.
- `03-record-desktop-dark.jpg`, `04-record-mobile-light.jpg`: Recording an
  expense before and after. The amount is the hero, categories and accounts are
  one-tap tiles, dates have Today/Yesterday shortcuts, and wide screens show a
  live preview with the account's balance after the entry. Full-page captures
  draw the phone action bar where the viewport was; `09` shows it docked.
- `05-history-desktop-light.jpg`: History before and after — month summary,
  search and filters, day groups with daily net, category icons.
- `06-transfers-desktop-dark.jpg`: Transfers before and after — From/To tiles
  with swap, balances after the transfer, history drawn as account pairs.
- `07-account-sheet-desktop-dark.jpg`: Opening an account card: activity,
  reconcile, edit, and a confirmed archive.
- `08-reconcile-mobile-light.jpg`: Reconcile previews the correction before it
  is saved.
- `09-record-docked-mobile-light.jpg`: On phones the summary docks above the
  bottom navigation, so amount → category → record needs no scrolling.
- `10-edit-transaction-mobile-dark.jpg`: Tapping a transaction opens it in a
  sheet for editing; delete asks first.
- `11-new-account-desktop-dark.jpg`: New account, in numbered steps, with the
  real card as its live preview.

## Checks

1. No horizontal overflow on Accounts, Transactions (History and Record),
   Transfers, or Archived at 320, 360, 768, and 1280 px, nor at 360 px with
   200% root text size. Category and account grids use rem-based columns, so
   larger text gets fewer, still-legible tiles.
2. No console errors or warnings while opening sheets, switching tabs, filling
   the record and transfer forms, or opening the new-account dialog.
3. Card text stays at WCAG AA: `walletSurface` deepens any provider color until
   85%-white secondary text reaches 4.5:1 on the card's lightest stop. The unit
   test covers every provider and account-type color.
4. The allocation bar's three series colors pass the categorical palette
   validator in both themes (CVD ΔE ≥ 9.2, normal-vision ΔE ≥ 20.9). Its legend
   lists every value as text, which also satisfies the light-theme aqua
   contrast relief rule.
5. Money in uses `--positive` (`#047857` light, `#34d399` dark), at least 5:1
   on card and background, and always carries a `+` sign so it never relies on
   color alone.
6. Every interactive tile is a native radio or button with a visible focus
   ring; sheets trap focus, close on Escape, and are named by their titles.
