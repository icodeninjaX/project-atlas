# ATLAS Design System

## Product context

ATLAS is a private personal operating system that joins money, debts, tasks, goals, career activity, and weekly reviews into one daily route. Its primary job is to reduce cognitive load: show the user's present position, highlight the next useful action, and keep every value traceable. Philippine-peso amounts and Manila dates are first-class content.

Primary surfaces:

- Public landing and authentication.
- Today dashboard with ranked priorities and compact cross-module summaries.
- Operational modules for money, debt, tasks, goals, career, weekly reviews, search, settings, and onboarding.
- Installable PWA with offline mutation and synchronization states.

## Visual foundation

Preserve the existing ATLAS identity. The product is calm, precise, restrained, and information-forward—not ornamental.

- UI font: Geist Sans (`--font-geist-sans`).
- Data font: the `font-mono` utility renders the UI face with tabular numerals (`tnum`) for money, dates, status labels, counts, and metadata, so figures align without a terminal feel. Geist Mono (`--font-geist-mono`) is reserved for `kbd`, `code`, and `pre`.
- Light: background `#f4f7fb`, foreground `#111827`, card `#ffffff`, primary `#2867e8`, secondary `#edf2f9`, muted `#e9eef6`, muted foreground `#5f6b7d`, border `#dce3ed`, destructive `#c83a4a`, sidebar `#f9fbfe`.
- Dark: background `#070a0f`, foreground `#f4f7fb`, card `#0e131c`, primary `#84afff`, secondary `#151d2a`, muted `#182131`, muted foreground `#8d99aa`, border `#202a39`, destructive `#e04f5f`, sidebar `#0a0e15`.
- Filled primary surfaces that carry text (buttons, active pills, selected segments) use `primary-solid` / `primary-solid-foreground`: `#2867e8` in light and a saturated `#2b66f2` in dark, both with white labels at 4.5:1 or better. `primary` stays the accent for links, rings, tints, and meters.
- Cards: flat surfaces with a uniform 1px hairline and 16px radius (`rounded-2xl`); nothing larger. No large or colored shadows on in-page surfaces; elevation shadows belong only to floating layers (menus, popovers, dialogs, sheets). Primary buttons carry only a faint top highlight, never a colored glow.
- Inside a card, group with tonal wells (`bg-background/55`, 12px radius, no border) rather than nested bordered boxes. Interactive tiles keep a ring so hover and selection read.
- No decorative light: no glow orbs, auroras, radial washes, film grain, gradient text, gradient hairlines, or cursor spotlights. Gradients are allowed only for data (a chart fill) and for provider-colored account cards.
- Color is for data and actions. Labels, kickers, and chrome stay neutral; blue marks what you can act on, red what needs attention, green what went well. Ordered scales (career stages, memory strength) use one hue that deepens, with semantic colors only at the ends.
- Controls: 12px radius, visible focus rings, concise labels, and at least 44×44px mobile targets where practical.
- Icons: use the exact Lucide icons present in source; each navigation destination has a distinct icon. Do not introduce emoji, alternate icon families, decorative illustrations, or invented brand marks. In headings, an icon is a 16px muted glyph beside the title, not a tinted tile. Where a tile helps scanning (rows, starters), use a small neutral square (`bg-muted/60`, 8px radius) and let only the glyph carry color.
- Brand mark: reproduce the existing code-rendered `AtlasMark` exactly when identity is shown.
- Copy: direct, humane, factual. Avoid hype, gamification, and unexplained financial predictions.

## Type and spacing

- Application titles: 24px on mobile, 28px from `sm`, semibold, −0.02em tracking. App pages are tools, not landing pages: no slogan-sized display titles.
- Page eyebrows only carry information: a trail (`Money / Budget`), a greeting with the date, or a cadence (`Monday–Sunday`). No icon in the eyebrow and no descriptor kickers ("Insight engine").
- Hero figures: at most 52px (`text-[clamp(2.5rem,10vw,3.25rem)]`); money totals at most 48px. Display tracking no tighter than −0.03em.
- Section/card titles: 14–16px semibold, sentence case. Small labels above content are muted and sentence case; all caps only for data annotations (month and weekday abbreviations, chart axes, table headers).
- Default UI/body: 14px with 20–24px leading.
- Supporting copy: 12px; compact metadata 10–11px.
- Mobile page gutter: 16px by default; 12px only for dense task rows. Tablet 24px; desktop 32px.
- Common vertical rhythm: 8px within labels, 12–16px within cards, 24–32px between page sections.
- Preserve 8/12/16/20/24/32px spacing increments.

## Responsive application shell

- Desktop (`lg` and up): fixed 256px left sidebar, full navigation labels, 72px brand block aligned with the 72px app header, content offset by sidebar width. The header names the current page; the signed-in identity lives in the account menu behind an initial avatar.
- Mobile/tablet (below `lg`): no sidebar. Use a compact top bar and fixed bottom navigation that respects `env(safe-area-inset-bottom)`.
- Mobile navigation must prioritize reachability, readable labels, clear selected state, and 44px minimum interactive targets. A More destination may expose lower-frequency Career, Reviews, Search, and Settings items.
- Content must never be obscured by the bottom navigation; account for its full height plus safe-area inset.
- Mobile overlays and menus must stay inside viewport gutters and close on escape/outside interaction.

## Mobile UX direction for this task

- Preserve the current colors, fonts, brand mark, and restrained card language.
- Improve the 320–430px experience first, then confirm tablet and desktop do not regress.
- Reduce header crowding: prioritize identity/context and the most important global action; move secondary actions into a deliberate overflow or compact menu if needed.
- Keep primary page actions discoverable without allowing button rows to overflow or become tiny. Full-width or two-column action treatment is acceptable when the source hierarchy supports it.
- Convert dense multi-column content to a meaningful single-column sequence. Put next actions and time-sensitive status before secondary summaries.
- Allow segmented filters/tabs to scroll horizontally with clear edge affordance; do not shrink labels below readable sizes.
- Keep financial values readable without clipping; use `min-width: 0`, controlled wrapping, and mono numerals.
- Avoid nested horizontal scrolling except for content whose mental model truly requires it (for example, a kanban board); provide an intelligible mobile alternative or snap behavior there.
- Keep bottom navigation stable, safe-area aware, and compatible with virtual keyboards.
- Support 200% text zoom and long user content without horizontal page overflow.

## Component patterns

- Navigation tabs (Money sections, Task views): underline tabs with no track, no icons, counts as plain muted numbers (red only for overdue). Segmented filters (All / Expenses / Income, List / Board) may keep a track.
- Pills are for status only (stage, severity, review state). Dates, amounts, and reasons are plain text, red or amber only when overdue or close.
- Repeated figures belong in one summary strip (one card, hairline dividers), not a row of identical bordered stat cards.
- Long lists live in one card with dividers and date sub-headers, not one card per group.
- `Button`: primary for the dominant action, secondary for peer navigation/actions, ghost for icon-only or low-emphasis actions, destructive only for irreversible removal.
- `Card`: one concept per surface; mobile padding can reduce from 20px to 16px where density requires it.
- `PageHeading`: stack text and actions on mobile; actions wrap or become full-width while retaining hierarchy.
- `EmptyState`: centered icon/copy/action inside a dashed surface; avoid excessive fixed minimum height on short mobile viewports.
- Forms: labels above controls, error copy directly below the field, 44px minimum input height, and submit action reachable without sideways scrolling. No numbered step badges, no icon on every section, no bordered box around each group: group with a plain 14px heading and a hairline. Placeholders only show a format (a URL, an amount); they never replace a label.
- Controls are 12px (`rounded-xl`): inputs, selects, text buttons, chips, segmented tracks and selectable tiles. `rounded-full` is for icon-only round buttons, avatars, dots, switches and progress tracks only. Focus is a 2px ring, never a 4px glow.
- Selectable tiles and checkbox rows show selection with a ring and their check or radio, not with a tinted fill or a filled icon tile.
- Page titles name the page ("Accounts", "Transfers", "Debts", "Timeline"); descriptions are one factual sentence. Empty states say what is missing ("No applications yet") at 16px, never a slogan or a three-step "how it works" row.

## Floating layers

- Scrim: `bg-black/60` with a 2px blur, the same everywhere.
- Sheets (`MoneySheet`) and dialogs: `bg-background`, hairline border, 16px radius on every floating corner, a neutral `shadow-2xl`. Sticky headers and footers inside them are solid, not frosted.
- Dialog titles: 20px for sheets and form dialogs, 18px for confirms. An eyebrow only when it informs (the account type, the month), never the page trail. No kicker plus icon tile, no filler subtitle. Close is a ghost icon button.
- Menus and popovers: `bg-card`, hairline border, 12px radius, `shadow-lg`, 8px-radius items with a muted hover; destructive items in red text. No hard-coded slate or white.
- Inline destructive confirms: a muted well, one question, "Keep it" (secondary) beside the destructive action.
- Toasts: one flat card style for every type, neutral border, the icon alone carries the color (green success, red error).
- Full-screen modes (Focus, review session) use the page background and tokens, not a custom night sky, glow or gradient ring.
- Interruptions stay small: a daily report is a compact dialog with one sentence and Done, not a celebration card.
- The launch splash is a short fade of the AtlasMark and wordmark on the theme background, with no spin, pulse, glow or tagline.

## Motion and accessibility

- Use restrained 150–200ms color/opacity/transform transitions only when they explain state. Sheets may slide for 250–300ms. No staggered reveals, blur-in entrances, infinite sweeps or pings except for something that is actually running.
- Honor `prefers-reduced-motion` exactly as the current globals do.
- Maintain visible keyboard focus, semantic landmarks, `aria-current`, named icon buttons, logical heading order, and text/background contrast.
- Do not communicate selected, error, overdue, or sync states by color alone.
