# Weekly reviews — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `ReviewsScreen` inside the app shell with fixture data: a
draft for the week of September 28 with three of seven prompts written and an
energy score, seven past reviews from August 3 to September 27 (one a draft,
one week skipped, so a four-week streak), last week's stored insight, and this
week's facts, at 7:00 PM on Friday, October 2 in Manila. The "before" captures
rendered the previous page's markup with the same data. The routes were
removed after capture. The "N" bubble is the Next.js dev-mode indicator.
Full-page desktop captures draw the sticky action bar in place at the end of
the review; `05` shows it held in view while scrolling.

## Evidence

- `01-this-week-desktop-dark.jpg`: This week, before and after.
- `02-archive-desktop-dark.jpg`: Past reviews, before and after.
- `03-first-screen-390-dark.jpg`: what a phone shows first, before and after,
  then writing a prompt and reading a past week.
- `04-desktop-light.jpg`: both tabs in light mode.
- `05-sticky-actions-1280.jpg`: mid-review with Save draft and Submit review
  in reach.
- `06-states.jpg`: first run (no reviews yet) on both tabs, and a week
  submitted on Sunday.

## What changed

- **Atmosphere:** Today's soft light and grain, the eyebrow in a glass pill,
  a gradient title, and This week / Past reviews as a segmented pill that
  floats in reach on phones.
- **This week (hero):** the week as a large figure with its ISO number, a
  status in words (Not started, Ready to reflect, Draft saved with how many
  prompts are written, Submitted) and a streak of submitted weeks. A seven-day
  strip marks today. **Your compass this week** brings back the direction last
  week's review chose, with a link that opens that review in the archive
  without leaving the page, so unsaved writing stays. The week's facts are
  tiles in each module's color that link to the module.
- **What changed this week:** one glass card with Last week and This week so
  far side by side; claims carry a chip for their kind (What the records
  show, What it may mean, Worth a look), facts open as a ledger, limitations
  have an info mark, and each consent is one tappable row.
- **Your reflection:** a composer card with the automatic date and a
  seven-segment progress bar; numbered prompt cards with a writing surface,
  word counts, and Captured; the last prompt is set apart as next week's
  compass. Scores have a large figure between − and +, a ten-segment meter in
  the score's color, and the note in words. On wide screens the action bar
  (save state, Save draft, Submit review) stays at the bottom of the view
  while the review scrolls. Phones keep one prompt at a time, now with each
  prompt's icon in the stepper.
- **Past reviews:** a hero with weeks reflected, a sentence on how weeks have
  felt and when energy peaked, the streak, and averages for overall, energy,
  and stress with meters. Week cards carry an overall ring, energy and
  stress, and Draft where it applies. The open week reads as a page: the
  chosen focus leads, three score rings, a tile per written prompt, and the
  blank prompts named on one line instead of seven "No note" boxes.
- **Your review rhythm:** overall, energy, and stress share one 0–10 scale in
  the app's validated three-series palette (blue, aqua, orange; worst
  all-pairs CVD ΔE 9.2 light / 9.4 dark), stress dashed, overall with a soft
  wash, a hairline grid, a value-first tooltip, a legend, a marker on the week
  being read, and a table view. Selecting a week on the chart opens it.

## Behavior kept

- Saving goes through the same `review.save` mutation with the same fields and
  intents; labels for every prompt and score, "Submit review", and the
  progress bar's name are unchanged.
- The insight card's requests, consent checkboxes and their wording, and the
  automatic last-week preparation are unchanged.
- `?view=archive` and `?highlight=` still open a given review; amounts go
  through `SensitiveValue`.

## Checks

1. axe reports no violations in light or dark at 390 and 1280 px across This
   week, Past reviews, both first-run tabs, and a submitted week (20 runs).
   One fix came out of this: the selected week card's date uses a deeper blue
   in light mode to keep 4.5:1 on its tint.
2. No horizontal overflow at 320, 360, 375, 390, 412, 430, 768, 1024, 1280,
   and 1440 px in those five states, nor at 360 px with 200% text.
3. No console errors.
4. View math (week position, status, streak, compass, prompts written,
   archive averages) lives in `lib/reviews/view.ts` with unit tests.
5. Score rings draw on arrival, except under `prefers-reduced-motion`; text
   never animates.
