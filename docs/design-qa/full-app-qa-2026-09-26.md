# Full-app UI/UX QA — 2026-09-26

## Method

- Local Supabase stack with all 42 migrations, one QA user, and `supabase/seed.sql`.
- Every route (7 public, 27 authenticated) at 1440×900 desktop and 390×844
  mobile, in dark and light system color schemes.
- Automated checks per page: HTTP status, redirects, `<title>`, single `<h1>`,
  horizontal overflow, broken images, tap targets under 24px, console
  errors/warnings, and axe-core (WCAG 2.0/2.1 A + AA).
- Manual review of every full-page screenshot.

Baseline result: no horizontal overflow at 390px, no broken images, one `<h1>`
per page, and no failed routes.

## Fixed in this pass

| Area                 | Issue                                                                                            | Fix                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Reviews              | A new, untouched weekly review said "You have unsaved thoughts"                                  | Form now starts from complete empty defaults, so pristine is not dirty |
| Settings             | Hydration mismatch error on every load (theme buttons' `aria-pressed` differed server vs client) | Theme picker shows no selection until hydrated                         |
| Mobile, all pages    | 4.5s opaque brand splash replayed on **every** full load (refresh, PWA reopen, login)            | Splash plays once per browser session                                  |
| Sidebar, every page  | DAILY / PLAN / REFLECT labels failed contrast (axe serious)                                      | Full muted-foreground color                                            |
| Sidebar + More sheet | Reviews and Decisions used the same icon                                                         | Decisions uses `Scale`                                                 |
| Accounts             | White text on Cash (and Savings/Investment) cards failed 4.5:1                                   | Darker card tones; solid white sub-labels                              |
| Dashboard            | Financial position `<dl>` had invalid structure (axe serious ×10)                                | Split into valid definition lists                                      |
| History, Reviews     | Scrollable tables / fact strip not reachable by keyboard                                         | Focusable, labelled regions with focus ring                            |
| Budget               | "−₱984 Over budget" in red when no budget exists                                                 | Shows "No plan set for this month"                                     |
| Debt detail          | Tab title was just "ATLAS"; status shown as lowercase `active`                                   | "Debt details · ATLAS"; capitalized status                             |
| Career               | Table dates `9/30/2026` while Kanban used `Sep 30, 2026`                                         | Table matches Kanban                                                   |
| Runway               | Account types lowercase (`cash`, `e wallet`)                                                     | Capitalized, matching Accounts                                         |
| Tasks                | 12px mobile gutter vs 16px on every other page                                                   | 16px                                                                   |

## Recommendations (not changed — design decisions)

### High impact

1. **Mobile forms and filters bury the content.** Decisions shows a ~15-field
   form before any past decisions; Timeline, Search, and Knowledge put a full
   filter card above results (even with zero records). Collapse the create form
   behind a "Record a decision" button (as Tasks/Goals/Debts already do) and
   put filters in a disclosure or bottom sheet.
2. **History tables on mobile.** Period cells wrap to 4 lines
   (`2026-` / `09-01` / `–` …) and the Coverage column is cut off. Use short
   labels (`Sep 2026`) or stacked cards under `sm`.
3. **Header actions duplicate the Money sub-nav.** Transactions ("Accounts",
   "Record transfer"), Transfers ("Money movement", "Accounts"), Budget
   (3 buttons, 3rd wraps full-width), and Runway ("Accounts", "Budget") repeat
   links already in the tab bar. Keep one primary action per page.
4. **Settings is 7,300px tall on mobile.** Add a section index or split into
   sub-pages (Profile, Appearance, Security, Offline, Reminders, Data).
5. **Date formats are inconsistent app-wide:** `2026-10-01` (Dashboard, Debts,
   Transactions, History), `Sep 30, 2026` (Career), `Nov 25` (Goals),
   `mm/dd/yyyy` native inputs. Pick one display helper for the en-PH locale.

### Medium

6. Horizontally scrolling tab strips (Tasks, Money sub-nav, Signals, Knowledge)
   cut off the last tab with no hint. Add an edge fade, and scroll the active
   tab into view (Runway's tab is off-screen when you're on Runway).
7. Transactions: "View transaction history" is the primary (blue) button while
   "Record a transaction" is secondary. The recording action should be primary.
8. Dashboard: Next Best Action often proposes the same task shown as Dayline
   "Now", and Situation says "0 follow-ups" directly below a follow-up card.
9. Capture: unstyled native file input ("Choose File No file chosen"), and
   "Extract text" is enabled before a file is chosen. Manual-form links are a
   dense row of underlined text; chips or buttons would scan better.
10. Analyst: dense helper copy and model names (`GPT-4o mini`) up front.
    Move provider/model details into a disclosure.
11. Onboarding shows the app's bottom navigation and header; a focused setup
    flow shouldn't let users wander off mid-setup. The form card also has an
    empty band above "About you".
12. Timeline events store raw enum text (`Stage: interview`). This comes from
    the database trigger, so fixing it needs a migration.
13. Goal detail: meta line reads like debug output
    ("Tasks · Supports goal · From record · planned").
14. Back links vary: "← Back to goals" (text arrow), "All debts" (icon),
    "Dashboard > Career" breadcrumb (only Career has one).

### Low

15. Tasks shows three "Add task" buttons at once when empty (header Quick task,
    page action, empty state). Tab counts (e.g. Upcoming 2) would help users
    know where their tasks are.
16. Reviews: "Next" and "Submit review" are both primary buttons, stacked.
17. The `/` shortcut hint appears in the mobile search field, where there is no
    keyboard.
18. The 404 page has no brand mark or navigation, and always says
    "Return to Today" (logged-out users bounce to login).
19. On mobile, the landing page preloads the splash image, then warns that the
    preload went unused.

## Not issues

- The sidebar looked short in full-page desktop screenshots, but it is
  `position: fixed`. That's a capture artifact.
- The "N" badge in the corner is the Next.js dev indicator.
- Light system scheme still renders dark: the app defaults to dark until the
  user picks a theme in Settings (dark-first by design).
