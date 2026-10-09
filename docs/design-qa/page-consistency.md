# Cross-page consistency — Design QA

## Method

Local Supabase with `supabase/seed.sql` and one QA user. Every authenticated
list page (23 routes) plus the debt and goal detail pages, at 1440×900 desktop
and 390×844 mobile, dark theme. For each page the `<h1>` position and size
were measured in the browser, and screenshots were compared side by side.

## Findings before

Pages used two different designs, so moving between them felt like moving
between apps:

| Measure (desktop) | Before                                       | After      |
| ----------------- | -------------------------------------------- | ---------- |
| Title left edge   | 6 positions (288, 304, 321, 330, 368, 432px) | 288px      |
| Title top         | 5 positions (129–165px)                      | 151px      |
| Title size        | 4 sizes (30, 38.4, 41.6, 52px)               | 52px       |
| Title style       | gradient (11 pages) vs. plain (12 pages)     | gradient   |
| Eyebrow           | icon pill vs. plain caps vs. mono caps       | icon pill  |
| Page width        | 9 widths (768px–1500px)                      | 1240px     |
| Background light  | aurora on 11 pages, none on 12               | everywhere |

On mobile the title sat at 104–135px from the top in 32px or 34px type; it is
now 127px and 34px on every page. Goals put its title inside a card, Tasks
used a date eyebrow with no pill, Search used a smaller mono eyebrow, and the
three detail pages used three different back links (`← Back to goals`, an
icon link, and a pill).

## Changes

- `PageShell` (`src/components/shared/page-shell.tsx`): one width, gutter,
  vertical rhythm, and aurora for every app page.
- `PageHeading` (`src/components/shared/page-heading.tsx`) is now the single
  page title: icon eyebrow pill, optional quiet meta (date), gradient title,
  description, buttons (`actions`) and pills/links (`aside`). Companion
  pieces: `PageHeadingLink`, `PageHeadingNote`, and `BackLink`.
- Every app page, including Money, Debts, Tasks, Goals, Search, Activity
  history, Onboarding, and the debt/decision/goal/milestone detail pages, now
  uses them. The 11 hand-copied premium headers were replaced by the shared
  component.
- Onboarding keeps a narrower column on purpose (a focused, one-time flow).

## Evidence

- Before: `page-consistency/before-desktop.png`, `before-mobile.png`
- After: `page-consistency/after-desktop.png`, `after-mobile.png`
