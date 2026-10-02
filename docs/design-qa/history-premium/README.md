# Recorded history and Patterns — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `HistoryScreen` and `PatternsScreen` inside the app shell
with fixture rows built by the RPC's own bucketing and coverage rules: a
year of income (salary twice a month plus freelance), daily spending,
debt payments from June 10, task completions, knowledge reviews from
August 3, and weekly review scores from May 4 with some weeks missing, at
9:31 PM on October 2 in Manila. Patterns used eleven crafted months in which
two pairs qualify (expenses with task completions, together; income with
knowledge reviews, opposite) and the rest are held back for missing history
or weak movement. The "before" captures ran the same fixtures through the
previous pages. The routes were removed after capture. The "N" bubble is the
Next.js dev-mode indicator, and the header reads "ATLAS" because the QA
route sat outside `/history`.

## Evidence

- `01-desktop-dark.jpg`: the first screen before (a heading, a select form
  with Update view, two paragraphs of fine print) and after.
- `02-whole-page-desktop-dark.jpg`: the whole page before (six identical
  scroll tables) and after.
- `03-first-screen-390-dark.jpg`: a phone before and after, the toolbar, and
  one series.
- `04-desktop-light.jpg`: light mode.
- `05-reading-a-chart.jpg`: pointing at June in Recorded debt payments (the
  partial month the first payment fell in), with its ledger open.
- `06-grains-and-new-account.jpg`: 52 weeks by week, 30 days by day, and an
  account whose records began nine days ago.
- `07-empty-and-error.jpg`: nothing recorded yet, before and after, on a
  phone, and history that could not be loaded.
- `08-patterns-desktop-dark.jpg`: Patterns before and after.
- `09-patterns-light-and-phone.jpg`: Patterns in light mode and on a phone.
- `10-patterns-no-finding.jpg`: no qualifying pair, before and after.
- `11-360-200pct-text-dark.jpg`: 360 px with 200% text.

## What changed — Recorded history

- **Atmosphere:** the soft light and grain of Today, Timeline, and Career, a
  gradient title, the eyebrow in a glass pill, and Patterns as a glass pill
  link.
- **In this window (hero):** the source records behind every value as a
  large figure, the window and its grouping ("May 1 – Oct 2, 2026 · 6
  months, by month"), when values were rebuilt, and a status in words
  (Every series has history, 4 of 6 series have history, No history in this
  window). Money recorded shows income against expenses with bars, the net,
  and debt paid, and says transfers are left out.
- **Series at a glance:** each series as a strip of its buckets, deeper where
  the value is higher, striped where partial, outlined with no history, and
  tinted at zero, with the window's total; each row jumps to its card.
- **Toolbar:** Group by (Day, Week, Month) and Look back (1, 3, 6, 12 months;
  30 days by day) as one glass bar of links. Each applies in one tap, and
  the address always says what is in view, replacing the select form and
  its Update view button.
- **Series cards:** the source and a link to its module; the total in view
  (or, for the review score, the mean of every score, weighted by reviews);
  the typical month of fully recorded buckets, the peak, and the first
  record; a bar chart drawn by coverage, with the typical bucket as a dashed
  rule; and a readout that rests on the latest bucket ("Oct 2026 · so far,
  Counted Oct 1–2") and follows the pointer or the arrow keys. The full
  table moves into a Period ledger disclosure under the chart.
- **How to read it:** recorded, partial, and no history each explained beside
  the mark that draws it, with the time zone, metric version, and update
  time.
- **Empty:** an account with no records sees what feeds each series, with a
  link and the action that starts it, instead of six empty tables.

## What changed — Patterns

- **The scan (hero):** how many of the 15 pairs qualified as a large figure,
  or "No reliable pattern to show yet"; the window; and, new, why the other
  pairs were held back, counted by reason (not enough history, too few
  records, no movement, weak or uncertain). No coefficient is shown for a
  held-back pair.
- **Every pair tested:** a lower-triangle table of the series, one cell per
  pair: rising parallel lines when they move together, crossing lines when
  they move apart, and a quiet mark for each reason held back. Found pairs
  link to their card.
- **Findings:** each pair's two series month by month, each on its own scale,
  with a readout that follows the pointer or arrow keys; Pearson r with a
  true minus sign, the number of changes, and the adjusted p as tiles; links
  to both sources; and the monthly table, now labelled "Feb 2025" instead of
  "2025-02-01", in a disclosure.
- **How the scan decides:** the four checks as a list, with the existing
  limits and the method version.

## Behavior kept

- The RPC, metric contract, association method, and their versions are
  unchanged. `grain` and `months` in the address work as before (days always
  look back 30 days); the page is now a loader for `HistoryScreen`, and the
  view math lives in `lib/history/view.ts` and `lib/history/pattern-view.ts`
  with unit tests.
- Clipped buckets still name the dates they count ("Counted Sep 3–24"), and
  missing values stay blank, never zero.
- Values, counts, coefficients, and p-values go through `SensitiveValue`, so
  privacy mode masks them, including chart readouts and announcements.

## Checks

1. No horizontal overflow at 320, 360, 375, 390, 412, 430, 768, 1024, 1280,
   and 1440 px, nor at 360 px with 200% text, across eleven states (month by
   6 and 12 months, week by 3 and 12 months, day, a new account, empty,
   unavailable, Patterns with findings, without, and unavailable). Fixes from
   this: the Series note wraps, a series card's module link drops below its
   title, finding cards hide their icon pair in narrow containers, the
   held-back list drops its marks, and the pair table keeps a usable size and
   scrolls in its own region only when text is very large.
2. axe reports no violations in light or dark at 390 and 1280 px across seven
   states with every ledger opened (28 runs).
3. No console errors or warnings in any capture.
4. Charts read by keyboard (arrows, Home, End) with polite announcements;
   pointer moves are not announced. Toolbar links, glance rows, and matrix
   cells were exercised in the browser.
5. The e2e History check now expects the first-run state on a disposable
   account and the held-back reason on Patterns.
6. Bars rise, strips and cells settle, and lines draw in on arrival; none of
   it runs under `prefers-reduced-motion`. Text never animates.
