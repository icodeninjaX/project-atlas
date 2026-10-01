# Tasks — premium redesign QA

Captured on 2026-10-01 with Chromium against a temporary local QA route that
composed the real Tasks components with representative fixture data (seven
tasks today, two finished; two overdue; three upcoming; three in the inbox;
five completed across three days). The "before" captures ran the same
fixtures through the previous page from a separate worktree. The route was
removed after capture. The "N" bubble in the corner is the Next.js dev-mode
indicator.

## Evidence

- `01-today-desktop-dark.jpg`, `02-today-mobile-dark.jpg`,
  `03-today-mobile-light.jpg`: Today before and after. A "Today's plan" hero
  leads with what is left, a progress ring, time left, the next exact time,
  and the overdue count. The view tabs become icon pills with counts (Overdue
  turns red when it has tasks). Tasks sit in one card per section —
  Scheduled and Anytime — instead of a card per task.
- `04-overdue-desktop-light.jpg`, `05-upcoming-desktop-dark.jpg`: Overdue and
  Upcoming are grouped by day ("Yesterday Sep 30", "Tomorrow Oct 2"), each
  with its task count and estimated time. Rows that sit under a day show only
  the time; overdue rows say how many days late they are.
- `06-completed-mobile-light.jpg`: Completed reads as a log, newest first,
  grouped by the day each task was finished, with the finish time.
- `07-create-desktop-dark.jpg`, `08-create-mobile-light.jpg`: Quick capture
  gets a larger title field, Today and Tomorrow date shortcuts, a tinted
  planning-details panel, and a footer with Cancel, Add task, and the N
  shortcut hint. Escape closes it.
- `09-actions-menu-mobile-dark.jpg`: the row menu opens over the next rows.
- `10-empty-day-mobile-dark.jpg`: an empty day reads "Open day" with a sun
  in the ring rather than "0%".
- `11-today-320-light.jpg`, `12-today-360-200pct-dark.jpg`: the smallest
  phone and 200% text.

## Row anatomy

- A round checkbox whose ring takes the priority color (critical red, high
  orange, medium amber, low neutral). A check appears on hover or focus;
  finished tasks show a filled green circle that turns into a reopen arrow
  on hover. The priority is also written out in the row, so color is never
  the only cue.
- Meta line: when (time, date, overdue days, or finish time), estimate,
  priority, and energy when it is not the default medium.
- Descriptions clamp to two lines.

## Checks

1. No horizontal overflow at 320, 360, 390, 768, 1280, and 1440 px, nor at
   360 px with 200% root text size (with and without the capture form
   open). Two fixes came out of this: the view strip is `relative` so the
   pills' screen-reader counts cannot widen the page, and the heading row
   wraps so a large-text Add task button drops below the title.
2. At 320 px the three hero stats stay on one row; their label icons hide
   below 360 px so "Time left" is not truncated.
3. No console errors or warnings across the views, the capture form, date
   shortcuts, planning details, the row menu, or Focus mode.
4. Ring colors use the 600 shade in light mode and 400 in dark, keeping at
   least 3:1 against the card. The Overdue count badge is white on
   `--destructive` in light mode and red-300 on a red tint in dark mode,
   which keeps its small text above 4.5:1.
5. The e2e locators were checked against the QA route: a row is the nearest
   `li` of its title, it holds "1 day overdue" or "9:30 AM", the
   quick-capture trigger and submit button are unique, and Focus mode opens
   from the row menu.
6. Rings and chip outlines use `ring-*` utilities. The global
   `* { border-color: var(--border) }` rule in `globals.css` is unlayered,
   so it overrides every `border-<color>` utility in the app; fixing that
   is left to its own change because it would restyle borders everywhere.
