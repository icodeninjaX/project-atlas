# Weekly reviews — clarity pass

Captured on 2026-10-11 with Chromium against a temporary local route that
rendered the real `ReviewsScreen` inside the app shell with fixture data: a
draft for the week of October 12 with three of seven prompts written and an
energy score, five past reviews from September 7 to October 11 (one a draft),
last week's stored insight, and this week's facts, at 7:00 PM on Friday,
October 16 in Manila. "Before" is the page at `ffc21dd` with the same data.
The route was removed after capture. Full-page captures draw the fixed phone
navigation where the viewport was, and on desktop the sticky action bar where
the viewport ended.

## Evidence

- `01-this-week-phone-dark.jpg`: This week on a phone, before and after.
- `02-this-week-desktop-dark.jpg`: This week on desktop, before and after.
- `03-past-reviews-phone-dark.jpg`: Past reviews on a phone, before and after.
- `04-past-reviews-list-then-week.jpg`: the list of weeks, then one week
  opened, with "All weeks" to go back.
- `05-desktop-light-and-archive.jpg`: This week in light mode; Past reviews
  on desktop.
- `06-first-run-and-320px.jpg`: a first visit (nothing written, no past
  reviews) and the page at 320 px.

## What was confusing

- The AI insight card, with two long data-sharing notices, came before the
  review itself, so on a phone the review started three screens down.
- Seven prompt cards each carried an icon, a number, a hint, a word count, and
  "Captured"; phones stepped through them with a row of seven unlabeled icons.
- The hero held a week strip, a compass card (or an explanation of one), and
  five icon tiles, but no clear next step.
- Past reviews swiped sideways on phones, with the week's page below the
  carousel; each week card repeated scores already shown by rings and meters.

## What changed

- **One job per section.** This week reads hero → Your review → What changed.
  On wide screens What changed sits beside the review, so the writing column
  stays a comfortable width.
- **Hero:** the week, where the review stands in one sentence, one button
  (Start / Continue / Edit your review) that jumps to the form, last week's
  focus when there is one, and the week's numbers as plain figures. The
  decorative week strip and the empty-compass explanation are gone.
- **Your review:** three numbered steps. 1 · Look back (what went well, what
  was hard, what you learned, with time, money, and career folded behind "More
  to reflect on" showing how many are written). 2 · How did the week feel
  (one row per score: name, its meaning in words, − value +). 3 · Choose next
  week's focus. One progress bar and the automatic date sit on top; Save draft
  and Submit review stay at the bottom, sticky on wide screens.
- **What changed:** last week's insight first, with "Turn off" once it is
  automatic (consent is only asked when turning it on). "Check this week so
  far" is folded; opening it shows the consent and Generate insight. Claim
  kinds are a dot and a label instead of colored pills.
- **Past reviews:** a summary with weeks reflected, one sentence, and three
  averages; "All weeks" as a plain list (week, focus, overall score). Phones
  show the list, then the chosen week with "All weeks" to go back; wide
  screens show both side by side. A week reads as a page: its focus, three
  scores in one line, each written prompt under its title, and the blank ones
  named once. The chart keeps its legend, and the table folds behind "Scores
  as a table".
- `Disclosure` moved from `components/debts` to `components/shared` so both
  pages use the same folded row.

## Behavior kept

- Saving uses the same `review.save` mutation, fields, and intents. Every
  prompt and score keeps its label; "Submit review" and the progress bar's
  name are unchanged. Folded prompts stay in the form and still submit.
- The insight requests, both consent texts word for word, and the automatic
  last-week preparation are unchanged.
- `?view=archive` and `?highlight=` still open a given review (straight to
  its page on phones), and the compass link still opens its review without
  leaving the page.

## Checks

1. No horizontal overflow at 320, 360, 390, 768, 1024, and 1280 px on both
   tabs, in light and dark, nor in the first-run state.
2. `npm test` (1,572 passing), `npm run lint`, `npm run typecheck`, and
   Prettier pass. New tests cover the folded prompts, turning the automatic
   insight off, and the phone list-then-week flow.
