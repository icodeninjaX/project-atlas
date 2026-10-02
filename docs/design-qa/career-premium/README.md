# Career — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `CareerWorkspace` inside the app shell with fixture data:
eleven applications (one interested, one preparing, two applied, one in
assessment, two interviewing, one in a final round, one offer, one rejected,
one withdrawn), two of them with overdue follow-ups, and stage events that
put conversion at 67%, 67%, and 25%, at 7:00 PM on October 2 in Manila. The
"before" captures rendered the old page's markup with the same data before
any change. The routes were removed after capture. The "N" bubble is the
Next.js dev-mode indicator; full-page phone captures draw the fixed bottom
navigation where the viewport was.

## Evidence

- `01-list-desktop-dark.jpg`: the list view before (three plain conversion
  boxes, then a table where every application took two rows, the second
  holding only "Edit application") and after.
- `02-board-desktop-dark.jpg`: the board before and after.
- `03-first-screen-390-dark.jpg`: what a phone shows before scrolling, for
  the list and the board, and the board's cards.
- `04-list-desktop-light.jpg`: light mode.
- `05-list-320-light.jpg`: the whole list at 320 px.
- `06-dialogs.jpg`: adding an application on a desktop, and editing one on a
  phone.
- `07-empty-and-closed.jpg`: nothing tracked yet, and every application
  closed.
- `08-highlight-1280-dark.jpg`: opened from a link elsewhere in ATLAS
  (`/career?highlight=…`), scrolled to and marked.
- `09-customize.jpg`: board customization as a phone sheet and inline on a
  desktop.
- `10-360-200pct-text-dark.jpg`: 360 px with 200% text.
- `11-laptop-and-tablet.jpg`: 1280 px and 768 px.

## What changed

- **Atmosphere:** the same soft light and grain as Today behind the top of
  the page, a gradient title, and the eyebrow in a glass pill. The
  breadcrumb, which only this page had, is gone.
- **Hero:** open applications as a large figure with a status in words (how
  many follow-ups are overdue, an offer on the table, how many open
  applications have no next step, or every follow-up on track) and where
  they stand in one sentence ("1 at offer, 3 in interviews, 3 in review, and
  2 not yet applied"). Up next names the most overdue follow-up, or the
  soonest, with its company and a link to its row. A bar splits the open
  applications by stage with each stage counted beneath it, and conversion
  shows how many reached assessment, interview, and offer, out of how many.
  On phones Up next comes straight after the figure.
- **List:** replaces the table and its separate phone cards with one
  responsive list in sections by what each application needs next: Needs
  attention (overdue), This week, Later, No next step, and Closed. Each row
  has the company's initials on a color picked from its name, the role and
  place, the next action with a due chip ("3 days overdue", "Tomorrow", "In
  5 days"), the stage as a tinted chip that opens the native picker, the
  salary range in compact pesos ("₱120K–₱150K a month"), the job link, and a
  pencil that opens the editor.
- **Board:** a glass toolbar (search, an Overdue filter with its count, sort,
  customize, and scroll arrows), stage tabs on phones as pills with dots and
  counts, glass columns with a stage-colored top edge, and cards with the
  initials, a next-action panel, a due chip, the stage chip, and icon
  actions. Overdue cards keep a red edge and a faint red wash. An empty
  column says "Drop to move to …" while a card is dragged over it.
- **Dialogs:** adding and editing share sections with icons (Role details,
  Next move, Compensation, Contact & notes), a peso sign inside salary
  fields, values in full contrast rather than the label's muted gray, and a
  sticky footer. Add gains a Cancel button; Edit shows the company's
  initials and current stage in its header.
- **Empty:** the hero explains what the page keeps, lists the seven stages,
  and holds the only add button.

## Behavior kept

- Stage changes save through the same `application.setStage` mutation (or
  `updateApplicationStageAction` without an offline user) and roll back on
  failure; drag and drop, board preferences in `localStorage`, the phone tab
  strip, search, the overdue filter, and sort work as before.
- Adding and editing submit the same form fields through
  `application.create` and `application.update`, with the same labels.
- `?view=kanban` still opens the board; the switch now links to
  `?view=board`.

## Checks

1. No horizontal overflow at 320, 360, 375, 390, 412, 430, 768, 1024, 1280,
   and 1440 px in the list and board, nor at 360 px with 200% text in the
   list, board, empty, and closed states.
2. axe reports no violations in light or dark at 390 and 1280 px across the
   list, board, empty, closed, and highlighted states, the add and edit
   dialogs, and board customization (32 runs). Chips use deeper text shades
   because they often sit on tinted panels.
3. No console errors or warnings in any capture.
4. The e2e "adds a job application" flow now finds the new row as a list
   item and its pencil by the company's name; those locators were replayed
   against the QA route at 1280 and 390 px and in the empty state.
5. The stage bar and conversion meters fill in on arrival, dialogs fade in,
   and the phone customization sheet slides up; none of it runs under
   `prefers-reduced-motion`. Text never fades, so contrast checks hold.
