# Decision journal — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `DecisionsScreen` and `DecisionDetail` inside the app shell
with fixture data: ten decisions from May to September 2026 (four ready to
review, three waiting, three reviewed), eight notes, and for the featured
decision ("Cook at home on weekdays") 28 recorded days of expenses, three
notes citing a transaction, a task, and a record that no longer exists, and
one edit to its plan. The "before" captures ran the previous pages from a
separate worktree with the same fixtures behind their loaders. Both routes
were removed after capture. The "N" bubble is the Next.js dev-mode
indicator; full-page phone captures draw the fixed bottom navigation where
the viewport was.

## Evidence

- `01-list-desktop-dark.jpg`: the journal before (a heading, then one bordered
  card per decision with "Review decision" on its own line) and after.
- `02-detail-desktop-dark.jpg`: a decision before (every note an open form,
  the edit form always at the bottom) and after.
- `03-first-screen-390-dark.jpg`: what a phone shows before scrolling, for the
  journal and a decision.
- `04-desktop-light.jpg`: light mode.
- `05-320-light.jpg`: both pages at 320 px.
- `06-sheets.jpg`: recording a decision (with "In 1 month" picked) on a
  desktop, and editing one on a phone.
- `07-empty-and-waiting.jpg`: nothing recorded yet, and a decision still
  waiting for its review date.

## What changed

- **Atmosphere:** the same soft light, grain, gradient title, and glass eyebrow
  pill as Today, Money, Career, and Timeline.
- **Review loop (hero):** how many decisions, a status in words ("4 ready to
  review", "Next review in 3 days", or "All caught up"), where they stand in
  one sentence, and since when, how many notes, and how many have a measure.
  Up next lists what to return to first: ready reviews, longest waiting first,
  then the soonest upcoming. A bar splits decisions by state, and six bars
  show how many were recorded each month.
- **Review states:** a decision waits until its review date, is ready from
  then on, and counts as reviewed once there is a note dated on or after the
  review date. That says only that the user came back to it, never how it
  went.
- **Journal:** chapters by the month decided. Each row has the date as a
  calendar leaf (tinted while ready), the title as the row's link, the
  expected outcome, and chips for its state, measure, note count, and goal.
  Pages read "Newer decisions" and "Older decisions"; a page past the end
  offers a way back.
- **Recording and editing:** a sheet instead of an inline form, in four steps
  (the choice, when to look back, your reasoning, connections), with review
  dates two weeks, one month, or three months from the decision in one tap,
  a review date that cannot precede the decision, and a sticky footer.
- **Decision page:** the title with its state, an arc from the decision to its
  review with today marked ("Day 10 of 14 · 4 days to the review"), and the
  number of notes, the measure, and the number of plan edits. The plan reads
  as tiles, with the expected outcome set apart. The records card adds the
  change between the windows in neutral words and colors ("Lower after the
  decision", never "better"), a bar for each of the 28 days with the decision
  day between them, and source records folded under a count. When there is no
  comparison it says why: no measure, the review date ahead (with the date the
  comparison opens), the 14 days after the decision still running, older than
  a year of history, unavailable, or inconclusive.
- **Observations:** the composer shows what you expected above the note. Notes
  sit on a rail, newest first, with the day after deciding ("Day 16"), a
  "Review note" mark for notes on or after the review date, the review date
  itself as a stop on the rail, the cited record as a chip, and "Supporting
  record no longer available" when it is gone. Edit opens a note's form in
  place instead of every note always being a form. `#observation-…` links
  from the graph still land on and outline their note.
- **Earlier plans:** each edit lists only what changed, before and after, and
  names what stayed the same.
- **Delete:** moved to a quiet section at the end, as an outlined red button.

## Behavior kept

- The server actions, the schema, and the form field names and labels are
  unchanged; the journal still pages 20 at a time through `?page=`.
- The comparison is computed exactly as before (`compareDecisionHistory`), and
  is withheld when its totals do not match the listed source records.
- Amounts go through `SensitiveValue`, so privacy mode masks them, including
  the change between windows. The day bars carry no amounts.

## Data

The journal reads two light queries (titles and dates of up to 1,000 recent
decisions, and dates of up to 1,000 recent notes, each with an exact count);
when there are more notes than that, the page's own notes are read separately
so its rows stay exact. View math lives in `lib/decisions/view.ts` with unit
tests; the pages are loaders for `DecisionsScreen` and `DecisionDetail`.

## Checks

1. No horizontal overflow, in the page or inside the sheets, at 320, 360, 375,
   390, 412, 430, 768, 1024, 1280, and 1440 px across the journal, a later
   page, empty, a decision with a comparison (sources open and a note being
   edited), waiting, no measure, too old, and both sheets, nor at 360 px with
   200% text (99 runs). Fixes from this: one-column grids use
   `minmax(0, 1fr)` so date inputs and links shrink, and the record picker
   spans `col-span-full` rather than adding a column.
2. axe reports no violations in light or dark at 390 and 1280 px across the
   journal, a later page, empty, four decision states, and both sheets (40
   runs). The theme's filled destructive button holds white at 3.85:1 in dark
   mode, so Delete decision uses red text on a quiet surface instead.
3. No console errors or warnings in any capture.
4. The e2e decision flow now opens the sheets to record and edit, waits for the
   new row, and finds the action task as a link by name.
5. The state bar, monthly bars, day bars, and review arc grow on arrival; none
   of it runs under `prefers-reduced-motion`. Text never animates.
