# Knowledge — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `KnowledgeWorkspace` inside the app shell with fixture data:
thirteen concepts across six categories (two new, two overdue, one due today,
four returning this week, three later, one archived) at every strength from
Fragile to Mastered, and twenty reviews over six weeks with a six-day streak,
at 7:00 PM on October 2 in Manila. The "before" captures ran the same fixtures
through the previous page. The routes were removed after capture. The "N"
bubble is the Next.js dev-mode indicator.

## Evidence

- `01-first-screen-desktop-dark.jpg`: the first screen before (a plain
  heading and four count boxes) and after.
- `02-whole-page-desktop-dark.jpg`: the whole page before and after.
- `03-first-screen-390-dark.jpg`: what a phone shows before scrolling.
- `04-whole-page-1280-light.jpg`: light mode at a laptop width.
- `05-review-session.jpg`: a review session with the notes revealed, on a
  desktop and a phone.
- `06-concept-sheet-phone.jpg`: a concept opened on a phone, before and after
  revealing the notes.
- `07-add-concept.jpg`: adding a concept on a desktop and a phone.
- `08-empty-dark.jpg`: nothing saved yet, before and after.
- `09-states.jpg`: all caught up, a search with no matches, and the archive.
- `10-opened-from-link.jpg`: opened from a link elsewhere in ATLAS
  (`/knowledge?highlight=…`) on a desktop and a phone.
- `11-320-light-and-360-200pct-dark.jpg`: 320 px, and 360 px with 200% text.

## What changed

- **Atmosphere:** Today's soft light and grain, a gradient title, the eyebrow
  in a glass pill, and Add concept beside the heading.
- **Review queue (hero):** what is due as a large figure, with a status in
  words (N overdue, Ready to review, All caught up) and one sentence on the
  mix ("2 new and 3 returning") or when the next review is. Start review opens
  a session; with nothing due, Practice N weak concepts does. Recall rate over
  30 days, the review streak, and reviews this week sit beneath. Up next names
  the first concept in the queue (or the next one scheduled) with its strength
  and a link to it. Memory strength splits the library across five levels —
  Fragile, Learning, Familiar, Strong, Mastered — in one bar with counts, and
  Next 7 days charts how many reviews fall on each day and names the busiest.
- **Toolbar:** one glass bar with search, category, and sort, and the views as
  pills with counts (Archived joins them). Filters in force show as removable
  chips with Clear filters.
- **Library:** sections by when concepts return — Due now, This week, Later —
  when sorted by next review; one list otherwise. Each row has a strength ring
  (five arcs, colored by level), the title, category and tags, a chip for when
  it is due ("2 days overdue", "New · due now", "In 10 min", "Tomorrow"), and
  the strength and review count in words.
- **Concept:** beside the list from 1280 px, sticky and scrolling on its own;
  below that, a bottom sheet on phones and a side panel on tablets, so a tap
  no longer leaves the concept below the whole list. It shows strength, next
  review, spacing, and reviews as tiles; Edit and Archive; active recall; and
  the review history as a trail of colored dots and a list.
- **Active recall:** a two-step card. The notes reveal with the example and
  the personal explanation (which the page never showed before). Each rating
  previews the interval it would set for this concept ("Good · 15 days")
  instead of fixed hints, and after rating the card says what was saved
  ("Rated Good. Next review in 3 days. Strength up to Learning.") with
  Practice again and Next due concept. A concept just rated stays in view
  even when it leaves the current list.
- **Review session:** a focused dialog through the queue as it stood when the
  session began: progress, the concept's category, strength, and history, the
  recall card, Skip for now, and a summary of each rating and when each
  concept returns. Space reveals and 1–4 rate outside text fields.
- **Add and edit:** a sheet with sections (The concept, What to remember, In
  your own words), existing categories suggested as you type, and a sticky
  footer.
- **Empty:** the hero explains capture, recall, and spacing, shows how the
  gaps grow when every review goes well (3 days → 7 → 15 → 33 → 2 months,
  computed from the scheduler), and holds the only add button.

## Behavior kept

- Concepts and reviews load as before; the address still carries `view`,
  `query`, `category`, and `sort`, and older `view=recent` links still work.
- The same server actions create, update, review, archive, and restore.
  Create now returns the new concept's id so the page can select it, and a
  review returns the schedule the database set; capture ignores both.
- A link to an archived concept (`view=archived&highlight=…`, from activity
  history) now opens the archive with that concept, instead of the full
  library without it.

## Checks

1. No horizontal overflow at 320, 360, 375, 390, 412, 430, 768, 1024, 1280,
   and 1440 px across the library, empty, caught up, no matches, and archive
   only, nor at 360 px with 200% text. The title now wraps at 200% text, and
   row details wrap rather than run past the edge.
2. axe reports no violations in light or dark at 390 and 1280 px across the
   library, empty, caught up, no matches, the archive, a linked concept, the
   concept sheet, the add sheet, and the session. The revealed notes' label
   uses a deeper blue in light mode to keep 4.5:1 on its tint.
3. No console errors or warnings in any capture.
4. The e2e Graph flow's locators (Add concept, Concept title, the category
   input, Learning notes, Save concept) are unchanged, and Add concept is
   now the label in the empty state too.
5. Strength bars fill and forecast bars rise on arrival, and revealed notes
   and session cards settle in; none of it runs under
   `prefers-reduced-motion`, and only transforms animate, so text keeps its
   contrast.
