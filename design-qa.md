# Career Kanban Design QA

## Comparison target

- Source visual truth:
  - `C:\Dev\Atlas\career-kanban-mobile.png`
  - `C:\Dev\Atlas\career-kanban-desktop.png`
- Primary rendered implementation:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\atlas-kanban-mobile-final-390.png`
- Supporting rendered states:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\atlas-kanban-mobile-360.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\atlas-kanban-mobile-customize-final.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\atlas-kanban-desktop-regression.png`
- Route: `http://localhost:3000/career?view=kanban`
- State: authenticated Atlas workspace, dark theme, Kanban selected. The source fixture contains active Applied-stage records; the available live account contains two Withdrawn-stage records. Dynamic record content was not treated as visual drift.

## Viewport and normalization

- Mobile source pixels: 375 × 812 at 1× density.
- Primary implementation viewport override: 390 × 844 CSS px at 1× density. The in-app browser captured the page region at 375 × 812 px, so the source and implementation were compared 1:1 without resampling.
- Narrow resilience check: 360 × 800 CSS px; captured page region 345 × 767 px at 1× density.
- Desktop regression check: 1440 × 1000 CSS px at 1× density.
- Combined full-view comparison evidence:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\atlas-kanban-mobile-source-vs-final.png`
- Focused interaction evidence:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\atlas-kanban-mobile-customize-final.png`
  - A focused state was required because customization controls, focus treatment, chip wrapping, and the sticky Done action are not legible enough in the full-view comparison.

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: the implementation retains Atlas's system font, compact mono eyebrow and metadata treatment, and the source's strong heading-to-body hierarchy. Mobile labels remain readable at 360 px, and long dynamic values truncate or wrap without colliding with actions.
- Spacing and layout rhythm: the mobile toolbar now uses one compact search-and-tools row. At 360 px and 390 px, the selected stage and application identity appear above the persistent navigation. Stage tabs, column header, card padding, 16 px radii, and surface borders maintain the Atlas rhythm.
- Colors and visual tokens: the background, cards, borders, primary blue, destructive red, muted text, and semantic stage dots map cleanly to existing Atlas tokens. Selected and focused states remain visually distinct.
- Image quality and asset fidelity: the board has no photographic or illustrative source assets. The existing Atlas mark is preserved, and UI icons use the project's Lucide family. No placeholder art, emoji, CSS drawings, or handcrafted SVG substitutes were introduced.
- Copy and content: “Search applications” and “Select a stage” stay clear at narrow widths. Customization explains that preferences are device-local, while Reset and Done provide explicit recovery and completion actions.
- Icons: search, attention, customization, company, location, date, and external-link icons share consistent stroke weight and optical sizing. Icon-only mobile controls retain accessible labels and desktop text labels.
- Responsiveness: no application-level overlap, horizontal page overflow, or awkward control wrapping was observed at the 360 px and 390 px checks. Desktop remains a horizontally navigable multi-column board with no regression from the mobile changes.
- Accessibility and behavior: touch targets are at least 40–44 px; the customization sheet exposes a labelled dialog, locks background scroll, receives focus on open, traps Tab navigation, closes with Escape/backdrop/Close/Done, and returns focus to its trigger. Stage tabs expose selection state, and stage selects remain the touch/keyboard alternative to drag-and-drop.

## Comparison history

### Pass 1 — desktop and initial responsive implementation

- [P2] Desktop overflow discoverability: later columns were reachable but lacked an obvious persistent navigation affordance.
  - Fix: added previous/next stage buttons, exploration copy, smooth board paging, and retained native horizontal scrolling.
  - Post-fix evidence: `atlas-kanban-v2-desktop.png`.
- [P2] Mobile page movement and density: breadcrumb space, stacked secondary actions, and `scrollIntoView` delayed card access and could move the page vertically.
  - Fix: hid the Kanban breadcrumb below the small breakpoint, grouped secondary actions, and centered the selected tab by changing only the tab strip's horizontal scroll position.
  - Post-fix evidence: `atlas-kanban-v2-mobile.png`.

### Pass 2 — first responsive recheck

- The desktop and mobile comparisons were reopened after the fixes. No remaining P0/P1/P2 issue was found in the first responsive implementation.

### Pass 3 — dedicated mobile refinement

- [P2] Above-the-fold card access: the 390 px baseline showed the board card beginning behind the bottom navigation because the toolbar used a second full control row.
  - Fix: compressed search, attention, and customization into one touch-friendly row; shortened narrow copy; reduced mobile-only vertical gaps; preserved text labels from the small breakpoint upward.
  - Post-fix evidence: `atlas-kanban-mobile-final-390.png` and `atlas-kanban-mobile-360.png` show the stage, company, role, metadata, and next-action label before the persistent navigation.
- [P2] Mobile customization expansion: opening customization inserted a long form into page flow and forced users to lose their board context.
  - Fix: converted customization below the desktop breakpoint into a bounded bottom sheet with backdrop, scroll containment, initial/return focus, focus trap, Escape handling, Close, Reset, and sticky Done controls. Desktop retains its inline panel.
  - Post-fix evidence: `atlas-kanban-mobile-customize-final.png`.

### Pass 4 — final comparison

- The 375 × 812 source and final page capture were placed together in `atlas-kanban-mobile-source-vs-final.png` and reviewed at equal pixel dimensions.
- Typography, spacing, tokens, assets, copy, icons, card visibility, and mobile interaction states were rechecked. No actionable P0/P1/P2 findings remain.

## Interaction and runtime verification

- Browser-rendered in the Codex in-app browser at 360 × 800, 390 × 844, and 1440 × 1000 viewport overrides.
- Tested: mobile stage visibility, compact search toolbar, customization open/close, automatic focus, Escape dismissal, focus return, backdrop-safe modal state, and desktop layout regression.
- Customization focus evidence: focus moved to “Close customization” on open; Escape removed the dialog and returned focus to “Customize.”
- Drag-and-drop remains covered by an isolated component test with the update action mocked, avoiding live application mutation.
- Console checked after the final interaction pass: no application errors or warnings; only React development information and Fast Refresh logs were present.
- Automated verification: 116 tests passed across 36 files; ESLint passed without warnings; TypeScript passed; Prettier passed for the changed component/test; the Next.js 16.3.2 production build passed.

## Follow-up polish

- [P3] A future enhancement could add named visibility presets such as “Active pipeline” and “All outcomes” above the existing column toggles.

## Implementation checklist

- [x] First application identity visible above persistent navigation at 360–390 px
- [x] Compact, labelled one-row mobile search and tool controls
- [x] Swipeable single-stage focus with selected-state counts
- [x] Touch-friendly customization bottom sheet
- [x] Focus trap, Escape, backdrop, Close, Done, and focus return
- [x] Device-local density, detail, and visible-column preferences
- [x] Desktop Kanban regression check
- [x] Full automated and browser-rendered verification

final result: passed
