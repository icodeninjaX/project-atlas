# Money — category dropdown

Captured on 2026-10-01 at 390 × 844 (2× density, touch emulation) with
Chromium, against a temporary local QA route that rendered the real record
form with fixture categories and accounts. The route was removed after
capture.

## Evidence

- `01-record-dark.jpg`: the record form before (a grid of boxed tiles) and
  after (one dropdown field), closed and open. The trigger shows the chosen
  category's icon and name; the list marks it with a filled icon and a
  check.
- `02-record-light.jpg`: the same in light mode, with the empty
  "Choose a category" state.
- `03-edit-sheet-and-missing-dark.jpg`: the dropdown opening above the
  edit sheet, and the message shown when you record without a category.

## Checks

1. The category section is 94px tall at every width, down from 376px on
   phones and 288px on tablet and desktop, so the account choices start on
   the first screen.
2. The list opens under the trigger at the trigger's width and flips above
   it when there is no room below; it scrolls with arrow buttons when it is
   taller than the space.
3. The list sits above money sheets (z-60), so it works inside the edit
   sheet.
4. Recording without a category keeps the entry, focuses the dropdown, and
   shows "Choose a category to record this." under it, linked as its
   description. Choosing a category clears it.
5. Keyboard: Enter or the arrow keys open the list, arrows move, Enter
   chooses, Escape closes, and typing a letter jumps to a category; focus
   returns to the trigger.
6. With large text, when the field is narrower than 14rem the icon squares
   step aside and names wrap. No horizontal overflow at 320, 360, 390, 430,
   768, and 1280px, nor at 150% and 200% text, open or closed.
7. The form still submits `categoryId` through the hidden native select
   that Radix keeps in the form.
