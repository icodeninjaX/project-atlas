# Money — category pills on phones

Captured on 2026-10-01 at 390 × 844 (2× density, touch emulation) with
Chromium, against a temporary local QA route that rendered the real record
form with fixture categories and accounts. The route was removed after
capture.

## Evidence

- `01-expense-dark.jpg`: the expense categories before and after. Boxed
  tiles with an icon square inside each box become pills that carry the
  icon and the full name on one line; the chosen one fills with the primary
  colour.
- `02-income-light.jpg`: the income categories. Long names such as
  "Investment Income" stay on one line instead of wrapping inside a tile.

## Checks

1. The picker is shorter on phones: 336px instead of 376px at 390px wide,
   and 284px instead of 376px at 430px.
2. Every pill is at least 44px tall at every text size.
3. With large text, when the list is narrower than 10.5rem, pills drop the
   icon disc so the name keeps the room. At 200% text on a 390px screen no
   name breaks; on a 360px screen only "Entertainment" and "Transportation"
   wrap, where the old tiles also wrapped "Transportation".
4. No horizontal overflow at 320, 360, 390, and 430px, nor with 150% or
   200% text.
5. Arrow keys still move between categories and the focus ring follows the
   pill shape. The edit sheet uses the same pills.
6. Tablet and desktop keep the tiles unchanged; the pills apply below `sm`.
