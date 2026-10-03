# Analyst — premium pass

Captured on 2026-10-03 with Chromium against a throwaway route that rendered
the Analyst page outside the app shell, with `/api/analyst/freeform` stubbed to
return one verified answer (four money facts, an interpretation, a
suggestion, two notes, three follow-ups). The route was removed before
commit. The "N" bubble is the Next.js dev-mode indicator. Full-page captures
draw the sticky follow-up composer where the viewport ended.

## Evidence

- `01-first-screen-desktop-dark.jpg`: the first screen at 1440 px, before
  consent.
- `02-answer-desktop-dark.jpg`: a verified answer at 1440 px.
- `03-answer-1280-light.jpg`: light mode at a laptop width.
- `04-first-screen-390-dark.jpg`: what a phone shows before scrolling.
- `05-answer-320-dark.jpg`: an answer at the narrowest supported width.

## What changed

- **Atmosphere:** Today's aurora and grain, the eyebrow in a glass pill, a
  gradient title, and an "Every figure checked against its sources" pill.
- **Hero:** a glass card with glows, grid texture, and a gradient icon; the
  consent notice as a tinted callout; the composer with a soft focus halo and
  a gradient send button.
- **Starters:** each question as a card with an area label (Money, Overview,
  Debts, Tasks, Goals, Scenarios) and a matching colored tile. The area label
  is hidden from assistive tech, so each button's name is still the question.
- **Answers:** glass cards with a hairline of light and a gradient Analyst
  mark; "Checked against your records" as a green chip; key figures as
  separate tiles; "What it may mean" and "Worth checking" as tinted callouts
  with a side rail; source cards highlight when a citation jumps to them.
- **Conversation:** gradient question bubbles, glass follow-up pills, and a
  blurred sticky composer.
- **Guide rail:** "How Analyst answers" as three numbered steps plus the fine
  print that used to sit in a fold, and "What leaves ATLAS"; sticky from `lg`,
  below the conversation on phones.

## Behavior kept

- Requests, streaming stages, consent storage, model choice, focus, history,
  and follow-ups are unchanged.
- The `ATLAS Analyst` heading and the accessible names the tests use are
  unchanged.
- The flagged V2 workspace keeps its layout under the new page header.

## Checks

1. No horizontal overflow at 320, 390, 1280, and 1440 px in light and dark.
2. No console errors.
3. Lint, format, typecheck, and the full unit suite pass.
