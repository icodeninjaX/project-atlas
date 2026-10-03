# Capture — premium pass

Captured on 2026-10-03 with Chromium against a throwaway route that rendered
the Capture page outside the app shell, with fixture proposals (an expense,
a task with a warning, a career application, and an unsupported action) fed
in as the batch state. The route was removed before commit. The "N" bubble
is the Next.js dev-mode indicator.

## Evidence

- `01-first-screen-desktop-dark.jpg`: the composer at 1440 px.
- `02-review-desktop-dark.jpg`: four proposals under review at 1440 px.
- `03-review-1280-light.jpg`: light mode at a laptop width.
- `04-first-screen-390-dark.jpg`: what a phone shows before scrolling.
- `05-review-320-dark.jpg`: the review at the narrowest supported width.

## What changed

- **Atmosphere:** Today's aurora and grain, the eyebrow in a glass pill, a
  gradient title, and a "Nothing saves until you confirm" pill.
- **Progress:** Describe → Review → Saved as a pill stepper with the current
  step marked (`aria-current="step"`) and finished steps ticked.
- **Composer:** one glass hero card. "What happened?" heads it; Typed or
  pasted / Copied email is a segmented control; the text well has a
  character counter and Ctrl/⌘ + Enter to preview; example chips fill the
  text; the file drop zone and Extract text sit side by side; the AI model
  and Preview actions share a footer with the privacy note.
- **Review:** a header with counts (to review, saved, rejected), a segment
  per proposal that fills as cards are saved or rejected, and Confirm all.
  When every card is handled it offers "Capture something else". New
  proposals scroll into view.
- **Proposal cards:** a colored rail and gradient icon tile per kind
  (expense, income, task, move task, career, knowledge), the source phrase
  as a quote, a confidence chip, warnings in an amber callout, themed inputs
  and selects in a two-column grid, and Confirm/Reject in a footer. Saved,
  rejected, and failed cards show a matching chip and status line.
- **Guide rail:** what Capture understands with an example per kind, three
  guarantees, and the manual forms as a list; sticky from `lg`, below the
  composer on phones.

## Behavior kept

- Server actions, form field names, save-all ordering and stop rules, file
  limits, and every message are unchanged.
- Accessible names tests rely on are unchanged: What happened?, Photo,
  document, or voice note, AI model, Choose a file, Extract text, Preview
  actions, Review all N proposals, Confirm all N remaining, Confirm this
  action, Reject, the field labels, and the manual form links.

## Checks

1. No horizontal overflow at 320, 390, 1280, and 1440 px in light and dark.
2. No console errors.
3. Lint, typecheck, and the full unit suite pass.
