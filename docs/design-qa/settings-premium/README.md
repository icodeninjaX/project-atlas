# Settings — premium pass

Captured on 2026-10-02 with Chromium against the real `/settings` route inside
the app shell, served by a throwaway local Supabase stub with fixture data
(Kai Rivera, Snowball plan, reminders on, quiet hours 22:00–07:00, two money
accounts). Push delivery isn't configured in the stub, so the reminders card
shows its "Not configured" note and disabled master switch. The "N" bubble is
the Next.js dev-mode indicator.

## Evidence

- `01-first-screen-desktop-dark.png`: the first screen at 1440 px.
- `02-whole-page-desktop-dark.png`: the whole page at 1440 px.
- `03-whole-page-1280-light.png`: light mode at a laptop width.
- `04-first-screen-390-dark.png`: what a phone shows before scrolling.
- `05-profile-390-dark.png`, `06-reminders-390-dark.png`: phone sections with
  the sticky section strip.

## What changed

- **Atmosphere:** Today's aurora and grain, the eyebrow in a glass pill, a
  gradient title, and Activity history as a pill beside the heading.
- **Account hero:** a gradient-ringed avatar, name and email, owner-only and
  reminder status chips, and "Your defaults at a glance": start page, payoff
  plan, quiet hours (the first three jump to their sections), currency,
  timezone, and weekly cycle.
- **Navigation:** a sticky left rail from `lg` with icons, numbers, and an
  active indicator; below that, a sticky strip of glass pills with icons and
  faded edges.
- **Sections:** glass cards with a numbered eyebrow, gradient icon tile, and
  a hairline of light; inside, groups headed by an eyebrow and fading rule.
- **Profile:** payoff plans as cards with an icon, check, and a small bar
  sketch of the payoff order; selects with a custom chevron; minute suffixes;
  the saved focus capacity in hours; a footer with feedback and Save.
- **Appearance:** System, Light, and Dark as miniature ATLAS windows (System
  split diagonally); the font as a specimen card with category, sample
  sentence, and character set.
- **Security:** password and email as expandable rows with chevrons; the
  authenticator with a Protected / Recommended chip, numbered steps, and a
  spaced code field.
- **Offline:** tiles with a connection chip, queue counts, and a storage meter;
  sync and cache actions as rows.
- **Reminders:** a master card with an On/Off chip and switch; each reminder
  type as a switch row; quiet hours as large time tiles.
- **Data:** the sensitive-values row shows a masked/unmasked sample; Activity
  history and the JSON archive as a featured pair; CSVs as a three-column grid
  with file icons.
- **Account:** sign-out rows, then a Danger zone for deletion.

## Behavior kept

- Every form, field name, server action, and confirmation is unchanged.
  Switches are still real checkboxes, so reminder forms submit as before.
- Section ids and jump links are unchanged; accessible names of controls the
  tests use (Display name, payoff radios, theme buttons, Font family, Reset
  font, section links) are unchanged.

## Checks

1. No horizontal overflow at 390, 1280, and 1440 px in light and dark.
2. axe reports no violations inside `main` in any of those captures.
3. No console errors; the only warning is the app shell's existing launch-
   image preload notice.
4. Lint, typecheck, and the full unit suite pass.
