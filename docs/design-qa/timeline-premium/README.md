# Life timeline — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `TimelineScreen` inside the app shell with fixture data:
thirty moments across all seven modules from September 15 to October 2
(income, spending, a transfer, debt payments, finished tasks, milestones, a
finished goal, an application and two stage moves, two weekly reviews, a
decision and an observation, and a task whose source was deleted), with seven
older moments behind "Load older moments", at 7:00 PM on October 2 in Manila.
The "before" captures ran the same fixtures through the previous page from a
separate worktree. The routes were removed after capture. The "N" bubble is
the Next.js dev-mode indicator; full-page phone captures draw the fixed bottom
navigation where the viewport was.

## Evidence

- `01-desktop-dark.jpg`: the first screen before (a plain heading, a filter
  card, and a card per event under a gray date) and after.
- `02-feed-desktop-dark.jpg`: the whole page before and after.
- `03-first-screen-390-dark.jpg`: what a phone shows before scrolling, and
  the feed on a phone.
- `04-desktop-light.jpg`, `05-feed-desktop-light.jpg`: light mode.
- `06-320-light.jpg`: the whole page at 320 px.
- `07-filters-and-states.jpg`: Money over the last 7 days, a search with no
  matches, and a start date after the end date.
- `08-phone-filters-open-light.jpg`: dates opened from Filters on a phone.
- `09-empty.jpg`: nothing recorded yet, before and after, and on a phone.
- `10-load-more-and-sticky.jpg`: after loading older moments (September 15
  now holds moments from both pages, and August begins), and a day's date
  staying in view while its card scrolls at 1024 px.
- `11-360-200pct-text-dark.jpg`: 360 px with 200% text, before (the page
  scrolled sideways) and after.

## What changed

- **Atmosphere:** Today's soft light and grain behind the top of the page, a
  gradient title, the eyebrow in a glass pill, and Activity history as a
  glass pill link.
- **In view (hero):** the number of moments loaded as a large figure, the
  span they cover and how many days were active, and a status in words
  (Active today, Last moment yesterday, Last moment N days ago, Quiet for N
  days, or Filtered view). Money in view sums what came in and went out, with
  bars on wider screens and the net; transfers between accounts are left out
  and said so. Where it happened splits the moments by module in one bar with
  counts beneath. A chart stacks each day's moments by module (by week past a
  month, by month past 26 weeks) and names the busiest day. While older
  moments remain, the hero says it counts only what is loaded, and it grows
  as more load.
- **Toolbar:** one glass bar. Search and custom dates submit as before;
  modules are pills with their color, and All, 7 days, 30 days, and This year
  apply a range in one tap. Each filter in force shows below as a chip that
  removes it, with Clear all. Phones keep the dates behind Filters.
- **Feed:** chapters by month with a count, days as a calendar leaf with
  Today, Yesterday, or the weekday, the day's count, and the day's net money.
  From `sm` the date is a column that stays in view while its day scrolls.
  Each day is one glass card with a rail joining its moments; each moment has
  a node in its module's color with an icon for what happened, the kind in
  words (Expense, Milestone reached, Stage changed…), the time when known,
  the title, the amount (green for money in), and an arrow to its source
  ("Open in Money: Jollibee" to assistive technology). Career moves show the
  stages as colored chips ("Interview → Final interview") instead of the
  stored `Stage: interview → final interview` (item 12 of the 2026-09-26
  full-app QA), review scores read "8/10", and stand-in descriptions that
  only repeat the kind ("Task completed") are not shown twice.
- **End of the feed:** "Load older moments" with how many are loaded, then
  "That’s the beginning of your timeline" (or "every moment that matches"
  when filtered), which takes focus when the last page arrives; loads are
  announced politely.
- **Empty:** nothing recorded yet explains what feeds the timeline and links
  each module with what to do there; no toolbar until there is something to
  filter. A filter with no matches says so and offers Clear filters, instead
  of the first-run message.

## Behavior kept

- Filters, the `/api/timeline` cursor, page size, and the life_timeline RPC
  are unchanged; the address still carries `q`, `module`, `from`, and `to`.
- Amounts go through `SensitiveValue`, so privacy mode masks them, including
  the hero's totals and each day's net.
- The workspace is keyed by its filters, so a filter applied from a pill link
  starts from its own first page and the form shows the values in force.

## Checks

1. No horizontal overflow at 320, 360, 375, 390, 412, 430, 768, 1024, 1280,
   and 1440 px across the full feed, a module filter, no matches, empty, a
   date range with a search, and an invalid range, nor at 360 px with 200%
   text in each. Two fixes came out of this: the Filters and Apply buttons
   now wrap when text is large (in the shared `CollapsibleFilters`, which
   also serves Search and Knowledge), and money figures and month headings
   wrap rather than truncate or push the page wide.
2. axe reports no violations in light or dark at 390 and 1280 px across the
   feed, a filtered view, no matches, empty, after loading older moments, and
   an invalid range (24 runs). Filter chips and today's calendar leaf use a
   deeper blue in light mode to keep 4.5:1 on their tints.
3. No console errors or warnings in any capture.
4. The e2e Timeline check now finds the source link by its name ("Open in
   Tasks: …").
5. The module bar and money bars fill in and the chart's bars rise on
   arrival; none of it runs under `prefers-reduced-motion`. Text never fades.
