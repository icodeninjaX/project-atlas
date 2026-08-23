# Project Atlas Design System

## Product context

Project Atlas is a private personal operating system that joins money, debts, tasks, goals, career activity, and weekly reviews into one daily route. Its primary job is to reduce cognitive load: show the user's present position, highlight the next useful action, and keep every value traceable. Philippine-peso amounts and Manila dates are first-class content.

Primary surfaces:
- Public landing and authentication.
- Today dashboard with ranked priorities and compact cross-module summaries.
- Operational modules for money, debt, tasks, goals, career, weekly reviews, search, settings, and onboarding.
- Installable PWA with offline mutation and synchronization states.

## Visual foundation

Preserve the existing Atlas identity. The product is calm, precise, restrained, and information-forward—not ornamental.

- UI font: Geist Sans (`--font-geist-sans`).
- Data font: Geist Mono (`--font-geist-mono`) for money, dates, status labels, counts, and metadata.
- Light: background `#f4f7fb`, foreground `#111827`, card `#ffffff`, primary `#2867e8`, secondary `#edf2f9`, muted `#e9eef6`, muted foreground `#5f6b7d`, border `#dce3ed`, destructive `#c83a4a`, sidebar `#f9fbfe`.
- Dark: background `#070a0f`, foreground `#f4f7fb`, card `#0e131c`, primary `#84afff`, secondary `#151d2a`, muted `#182131`, muted foreground `#8d99aa`, border `#202a39`, destructive `#e04f5f`, sidebar `#0a0e15`.
- Cards: flat bordered surfaces with 16px radius. Favor grouping, hierarchy, and whitespace over decorative shadows.
- Controls: 12px radius, visible focus rings, concise labels, and at least 44×44px mobile targets where practical.
- Icons: use the exact Lucide icons present in source. Do not introduce emoji, alternate icon families, decorative illustrations, or invented brand marks.
- Brand mark: reproduce the existing code-rendered `AtlasMark` exactly when identity is shown.
- Copy: direct, humane, factual. Avoid hype, gamification, and unexplained financial predictions.

## Type and spacing

- Application titles: 30px on mobile, 36px from `sm`, semibold, tight tracking.
- Section/card titles: 14–16px semibold.
- Default UI/body: 14px with 20–24px leading.
- Supporting copy: 12px; compact metadata 10–11px.
- Mobile page gutter: 16px by default; 12px only for dense task rows. Tablet 24px; desktop 32px.
- Common vertical rhythm: 8px within labels, 12–16px within cards, 24–32px between page sections.
- Preserve 8/12/16/20/24/32px spacing increments.

## Responsive application shell

- Desktop (`lg` and up): fixed 256px left sidebar, full navigation labels, 80px brand header, content offset by sidebar width.
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

- `Button`: primary for the dominant action, secondary for peer navigation/actions, ghost for icon-only or low-emphasis actions, destructive only for irreversible removal.
- `Card`: one concept per surface; mobile padding can reduce from 20px to 16px where density requires it.
- `PageHeading`: stack text and actions on mobile; actions wrap or become full-width while retaining hierarchy.
- `EmptyState`: centered icon/copy/action inside a dashed surface; avoid excessive fixed minimum height on short mobile viewports.
- Forms: labels above controls, error copy directly below the field, 44px minimum input height, and submit action reachable without sideways scrolling.

## Motion and accessibility

- Use restrained 150–200ms color/opacity/transform transitions only when they explain state.
- Honor `prefers-reduced-motion` exactly as the current globals do.
- Maintain visible keyboard focus, semantic landmarks, `aria-current`, named icon buttons, logical heading order, and text/background contrast.
- Do not communicate selected, error, overdue, or sync states by color alone.
