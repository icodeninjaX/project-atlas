# Today — premium redesign QA

Captured on 2026-10-01 with Chromium against a temporary local QA route that
rendered the real `TodayDashboard` inside the app shell with representative
fixture data (a NOW task, a NEXT debt payment, a LATER career follow-up; 75 of
180 minutes planned; two overdue tasks; one overdue follow-up; three goals;
three signals). The "before" captures ran the same fixtures through the
previous components. The route was removed after capture. The "N" bubble is
the Next.js dev-mode indicator. Full-page phone captures draw the fixed bottom
navigation where the viewport was.

## Evidence

- `01-today-desktop-dark.jpg`, `02-today-mobile-dark.jpg`,
  `04-today-mobile-light.jpg`: Today before and after.
- `03-today-desktop-light.jpg`, `05-today-1280-dark.jpg`,
  `06-today-tablet-light.jpg`: light mode, a 1280 px laptop, and a tablet.
- `07-empty-day-dark.jpg`: an evening with nothing on the Dayline, no budget,
  no deadline, no signals, and a reviewed week.
- `08-next-best-action-desktop-light.jpg`: with a career follow-up to turn
  into a task.
- `09-today-320-light.jpg`, `10-dayline-360-200pct-dark.jpg`: the smallest
  phone and 200% text.

## What changed

- **Header:** a greeting by the time of day in Manila (Good morning,
  afternoon, evening, with a matching icon) beside the date, without the year.
- **Dayline hero:** a deeper surface with a top highlight, a faint grid, and
  a glow. NOW shows the kind of work (task, payment, career, goal) and the
  first two reasons as chips; "Due today", "overdue", and "critical" chips are
  tinted red and still say so in words. A **Day load** ring shows planned
  minutes against Dayline capacity, the open time (or how far over), and
  energy as three bars plus a word. NEXT and LATER sit as stops on a route
  line — across on wider screens, down the left on phones.
- **Situation:** separate tiles with an icon per area. Available cash shows
  the payday countdown; Tasks shows what is due today and its estimated
  time; Career shows how many applications are interviewing; Goals shows the
  nearest goal's progress with a bar. Overdue values are red with a dot and
  keep the word "overdue". Bars are decorative: the same figure is in the
  text. Tasks does not show "done today": the snapshot's `completed_today`
  counts from UTC midnight (8 AM in Manila), so it would miscount early
  mornings.
- **Financial position:** the balance leads with quiet centavos and a payday
  pill. The month's money in and out are bars against each other with the net
  kept (or overspent). Budget left (with a meter, or "Over budget by") and
  Debt remaining (with the next due date) are tiles that open Budget and
  Debts. The snapshot already returned these figures; no new queries.
- **Signals, Week position, reflection:** matching cards. Week position draws
  Monday to Sunday with today filled and says how many days until the week
  closes. The reflection quote is larger and the rotation note sits at the
  foot of the card. An empty Signals card centers its all-clear.

## Checks

1. No horizontal overflow at 320, 360, 390, 430, 768, 1280, and 1440 px, nor
   at 360 px with 200% root text, in the default, empty, and next-best-action
   states.
2. The e2e dashboard contracts hold in all three states: the h1 matches
   `/route|mapped/i`, "Available balance" and "Your route through today" are
   visible, and on phones Dayline, Situation, Financial position, Signals, and
   Week position stack in that order.
3. axe reports no violations in `#main-content` in light or dark, in any of
   the three states. Two came out of this: the cash-flow list now keeps each
   bar in its own `dd`, and the red reason chips use red-700 / red-300 so
   12 px text stays above 4.5:1 on the tint. Centavos inside muted notes stay
   full strength rather than "quiet".
4. Large text: the Situation grid and the financial tiles pick columns with
   rem-based container queries, so 200% text gets one readable column instead
   of words broken letter by letter. When a card is that narrow, decorative
   icon chips, the route rail, and the stop arrows step aside, and the Day load
   text moves under its ring.
5. Privacy mode hides every amount on the page, including the cash-flow and
   budget figures.
6. No console errors or warnings.
7. Colored outlines use `ring-*` utilities, for the reason given in
   `docs/design-qa/tasks-premium/README.md`.
