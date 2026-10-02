# Signals — premium pass

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `SignalsScreen` inside the app shell with nine fixture
signals written in the engine's own words (an overdue debt payment, a reached
budget, rising overdue tasks, a dining spike, an approaching goal deadline,
debt paydown, a strong task week, low application response, and a quiet
goal), checked at 7:00 PM in Manila. The route was removed after capture.
The "N" bubble is the Next.js dev-mode indicator.

## Evidence

- `01-desktop-dark.png`, `02-desktop-light.png`: the pulse hero and toolbar.
- `03-first-screen-390-dark.png`: what a phone shows before scrolling.
- `04-filtered-and-why-390-dark.png`: Tasks filtered, with a reason open.
- `05-all-clear-light.png`: nothing detected.

## What changed

- **Atmosphere:** Today's soft light and grain, a gradient title, the eyebrow
  in a glass pill, and when the signals were checked.
- **Pulse (hero):** how many need attention as a large figure, a status in
  words (Act now, Keep watch, Nothing urgent, All clear), one sentence on
  what was found and where, a bar by severity with counts, and Start here
  with the most urgent signal and a link to act on it. A radar places every
  signal in its area's slice, nearer the center the more urgent; critical
  blips pulse, a sweep circles, and a filter lights its area and dims the
  rest. The radar is decorative; the text says the same.
- **Toolbar:** one glass bar with Area and Severity pills, each with what it
  would show. They are links, so a filter applies in one tap (the severity
  select and Apply button are gone); filters in force show as removable
  chips with Clear all.
- **Feed:** sections for Needs attention, Progress, and Worth knowing. Each
  card has its area's icon tinted by severity, severity in words, the
  message, and its figures charted where they compare (now against a
  baseline, with the change) or make a share (budget used, goal progress,
  debt paid down, conversion). Urgent cards keep a colored edge and wash.
  "Why am I seeing this?" opens the reason; the action names where it goes
  ("Open budget", "Review overdue"). An end marker closes the feed.
- **Empty and unavailable:** an all-clear hero that lists what ATLAS watches
  in each area, with links; a filter with no matches offers Clear filters.

## Behavior kept

- The engine, ranking, and `loadSignals` are unchanged; the address still
  carries `category` and `severity`.
- Sensitive figures go through `SensitiveValue`; in privacy mode their bars
  and changes are hidden too, so lengths do not reveal masked amounts.
- The dashboard's compact Signals card renders as before.

## Checks

1. No horizontal overflow at 320, 360, 390, 768, and 1280 px, nor at 360 px
   with 200% text, across full, filtered, no-match, calm, empty, and
   unavailable states.
2. axe reports no violations in light or dark at 390 and 1280 px across those
   six states (24 runs).
3. No console errors or warnings in any capture.
4. The sweep, ping, and meter fills stop under `prefers-reduced-motion`.
