# Today — premium pass 2 and phone polish

Captured on 2026-10-02 with Chromium against a temporary local QA route that
rendered the real `TodayDashboard` inside the app shell with fixture data
(the same route, stops, and money as `../today-premium`, timed at 9:12 AM on
Wednesday, October 14 so the budget pace and week strip sit mid-period). The
"before" captures are from `../today-premium`. The route was removed after
capture. The "N" bubble is the Next.js dev-mode indicator; full-page phone
captures draw the fixed bottom navigation where the viewport was.

## Evidence

- `01-today-desktop-dark.jpg`, `02-today-390-dark.jpg`: before and after.
- `03-today-desktop-light.jpg`: light mode.
- `04-first-screen-every-phone-dark.jpg`,
  `05-first-screen-every-phone-light.jpg`: what each phone shows before any
  scrolling, at 320, 360, 375, 390, 393, 412, and 430 px.
- `06-phones-full-light.jpg`, `07-phones-full-dark.jpg`: whole pages at
  320, 375, and 430 px light, and 360, 390, and 412 px dark.
- `08-today-1280-and-tablet.jpg`: a 1280 px laptop and a 768 px tablet.
- `09-empty-day-dark.jpg`, `10-next-best-action-light.jpg`: the empty-day and
  follow-up states.
- `11-360-200pct-text-dark.jpg`: Dayline, Situation, and Financial position
  at 360 px with 200% text.

## What changed

- **Atmosphere:** a soft blue light behind the top of the page with fine
  grain; the title is a subtle vertical gradient; the greeting sits in a
  glass pill beside the date.
- **Surfaces:** cards trade their flat outline for a hairline edge that
  catches light from above (brighter at the top in dark mode), and on
  devices with a mouse a faint light follows the pointer across cards and
  tiles. The Dayline is frosted glass over the page light.
- **Dayline timing:** the route is laid end to end from now. NOW says when it
  ends ("45 min · until 9:57 AM"), each stop shows its start time, and the
  band reads "Your route from 9:12 AM … Clear by 10:27 AM". A bar draws Now,
  Next, Later, and the open time left in the day's capacity, with a legend in
  words. When any stop has no estimate the route stays untimed rather than
  guessing.
- **Day load:** the ring draws in with a sky-to-blue gradient.
- **Situation:** tiles stack icon, label, value, and detail so they fit narrow
  phones; Goals shows a progress ring; overdue tiles keep a red edge and a
  faint red wash.
- **Financial position:** the share of income kept this month, and an
  even-pace marker on the budget meter with "Day 14 of 31". Bars fill in on
  arrival.
- **Reflection:** the same edge and shadow as the other cards, a softer
  light-mode tone, and a large closing quote mark.
- **Motion:** only meters and rings animate (fill and draw, under a second);
  text never fades, so contrast checks are unaffected. All of it stops under
  `prefers-reduced-motion`.

## Phone polish

- 320 px: Situation is a 2×2 grid instead of four stacked tiles; header
  buttons drop their icons so "Record expense" stays on one line; the tagline
  is hidden so NOW starts higher; cards use 16 px padding.
- 320–393 px: the Dayline header keeps "Tune" beside the title (the title
  wraps first, and the decorative chip steps aside); "Tune" is an icon
  button with its accessible name.
- All phones: "Open this next" is full width under the thumb, with "Why this
  comes first" centered beneath; it is on the first screen from 360 px up.
- 200% text: Situation and the money tiles drop to one column, decorative
  icon chips and the stop arrows step aside, and stop cards tighten their
  padding.

## Checks

1. No horizontal overflow at 320, 360, 375, 390, 393, 412, 430, 768, 1280,
   and 1440 px, nor at 360 px with 200% text, in the default, empty, and
   next-best-action states (33 runs).
2. The e2e dashboard contracts hold in every run: the h1 matches
   `/route|mapped/i`, "Available balance" and "Your route through today" are
   visible, the follow-up heading shows when there is one, and on phones
   Dayline, Situation, Financial position, Signals, and Week position stack in
   that order.
3. axe reports no violations in `#main-content` in light or dark, in any of
   the three states, including the gradient title.
4. No console errors or warnings at any size.
5. The custom effects live in `src/components/dashboard/today.module.css`, per
   the Next.js guidance to scope custom CSS. None of its rules set
   `box-shadow` on elements that use Tailwind ring or shadow utilities, since
   unlayered rules would override them, focus rings included.
