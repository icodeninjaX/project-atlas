# Career Kanban Design QA

## Mobile option 3 application card

### Source and rendered evidence

- Selected visual truth:
  - `C:\Users\kdv06\.codex\generated_images\01a03197-5ea8-7fe1-8380-507ca73421a2\exec-1db9038a-479a-4292-bda8-992b3e5c443d.png`
- Final mobile implementation:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-kanban-option3-implementation-top-final.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-kanban-option3-xmeta-final.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-kanban-card-option3-360.png`
- Desktop regression evidence:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\desktop-kanban-card-regression-option3.png`
- Equal-size comparison evidence:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-kanban-option3-full-comparison-final.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-kanban-option3-card-comparison-final.png`

### Viewport, state, and normalization

- Source: 853 × 1844 pixels. It was downsampled with Lanczos to the implementation capture size for the full-view comparison.
- Primary implementation: 390 × 844 in-app Browser viewport override; the content capture is 375 × 812 pixels at 1× density after the in-app viewport gutter. The source and implementation have the same 0.462 mobile aspect ratio after normalization.
- Narrow resilience check: 360 × 800 viewport override at 1× density.
- Desktop regression check: 1440 × 1000 viewport override at 1× density.
- State: authenticated dark-theme Career Kanban with Withdrawn selected. The focused comparison uses the same X-Meta application, date, stage, role, location, next action, and due state.
- The selected concept depicts a job-post action for X-Meta, but the live record has no `job_url`; the implementation correctly omits that unavailable action. The SGV & Co. card verifies the complete two-action row when a job URL exists.

### Final findings

No actionable P0, P1, or P2 findings remain after the second visual pass.

- Fonts and typography: the implementation retains Geist, the mono uppercase next-action label, bold company/stage hierarchy, readable 14–20 px mobile text, and restrained muted metadata. Long role and location values truncate without overlapping controls.
- Spacing and layout rhythm: the card follows the selected record layout—status/date header, identity block, blue-rule next action, full-width stage selector, and divided secondary actions. The implementation is intentionally slightly taller than the generated target to preserve 44 px touch targets and real saved content.
- Colors and visual tokens: the implementation uses Atlas `background`, `card`, `border`, `muted-foreground`, `primary`, and semantic destructive tokens. Blue is reserved for the record rule, due state, icons, and actions.
- Image quality and asset fidelity: the card has no raster or illustrative assets. Building, location, calendar, pencil, external-link, and drag affordances use the existing Lucide outline family, which matches the selected concept and the rest of Atlas. No custom SVG, CSS art, emoji, or placeholder asset was introduced.
- Copy and content: company, role, stage, application date, location/setup, next action, due state, edit action, and optional job-post action all use live record data. The native stage control displays its actual current value instead of the concept's placeholder copy.
- Responsiveness and accessibility: the mobile column shell is visually removed while its labelled region remains semantic. Cards remain full-width at 360 px and 390 px, interactive controls have at least 44 px touch height, focus rings remain visible, and desktop retains its original compact columns and drag affordance.

### Comparison history

#### Pass 1

- [P2] The first rendered card was materially taller and softer than the selected record treatment because the company tile, card radius, section gaps, and controls were all oversized together.
  - Fix: reduced the mobile radius and company tile, moved location into the identity block, tightened vertical gaps, strengthened the blue record rule, and normalized interactive controls to accessible 44 px targets.
  - Evidence: `mobile-kanban-option3-card-comparison-pass1.png`.

#### Pass 2

- The selected X-Meta card and final X-Meta implementation were cropped and placed together at the same 331 px width in `mobile-kanban-option3-card-comparison-final.png`.
- The hierarchy, alignment, type treatment, color balance, icons, controls, and responsive behavior were rechecked. The remaining height difference is an intentional accessibility/data constraint, not an actionable mismatch.

### Card interaction and runtime verification

- Tested in the Codex in-app Browser: 390 px and 360 px mobile rendering, full card scrolling, native stage control visibility, edit-dialog open/close and focus behavior, cards with and without a job URL, and 1440 px desktop regression.
- No live application data was changed during visual QA.
- Browser console: no application errors or warnings; only React development and Fast Refresh information.
- Automated verification: 123 tests passed across 38 files; ESLint passed; TypeScript passed; the changed Career files passed Prettier; and the Next.js 16.3.2 production build passed.
- Repository-wide Prettier still reports 69 pre-existing files outside this Career change; none of the changed Career files are in that list.

## Mobile application editor refinement

### Source and rendered evidence

- Selected Atlas form reference:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-application-create-form-reference.png`
- Captured pre-fix edit flow:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\02-mobile-kanban-edit-open.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\03-mobile-kanban-edit-lower.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\04-mobile-kanban-edit-bottom.png`
- Final mobile implementation:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-edit-form-final-top.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-edit-form-final-middle.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-edit-form-final-bottom.png`
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-edit-form-final-360.png`
- Desktop regression evidence:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\desktop-edit-form-regression.png`
- Combined full-view comparison:
  - `C:\Users\kdv06\.codex\visualizations\2026\08\24\01a03197-5ea8-7fe1-8380-507ca73421a2\mobile-edit-form-reference-vs-final.png`

### Viewport, state, and normalization

- Source and primary implementation: 390 × 844 CSS px, captured at 390 × 844 pixels and 1× density. They were compared side by side without resizing.
- Narrow resilience check: 360 × 800 CSS px at 1× density.
- Desktop regression check: 1440 × 1000 CSS px at 1× density.
- State: authenticated dark-theme Career Kanban, X-Meta application editor open. The form reference shows an empty create state while the implementation shows saved application values; layout, labels, controls, rhythm, and interaction hierarchy were compared, not the dynamic values.
- Focused region evidence was required because the middle and bottom sections and sticky actions are outside the first viewport. `mobile-edit-form-final-middle.png` and `mobile-edit-form-final-bottom.png` verify those regions.

### Editor findings

No actionable P0, P1, or P2 findings remain after the editor refinement.

- Fonts and typography: the editor uses the same Atlas heading, mono eyebrow, 12 px labels, muted descriptions, and 14 px input text as the selected form reference. Labels stay visible after values are populated.
- Spacing and layout rhythm: mobile fields occupy the full available width with consistent 16 px section padding, 16 px vertical gaps, 44 px controls, and 16 px radii. The sticky header and footer remain stable while content scrolls. Desktop reflows to a centered two-column dialog.
- Colors and visual tokens: background, card tint, borders, primary blue, muted foreground, focus ring, overlay opacity, and elevation all use existing Atlas tokens and match the reference surface treatment.
- Image quality and asset fidelity: this form has no raster or illustrative assets. The Pencil and Close controls use the project's existing Lucide icon family; no placeholder art, CSS drawing, emoji, or custom SVG was added.
- Copy and content: fields are grouped into Role details, Next move, Compensation, and Contact & notes. Section descriptions explain purpose without replacing labels. Cancel and Save changes remain explicit and always reachable.
- Responsiveness: no form clipping, horizontal overflow, compressed half-width controls, or application-nav overlap was observed at 360 px or 390 px. The desktop modal remains bounded and scrollable.
- Accessibility and behavior: the editor is a labelled modal dialog with visible labels, semantic fieldsets, 44 px touch targets, keyboard focus containment, Escape dismissal, focus return, a non-submitting Cancel action, pending copy, and success-driven close behavior.

### Editor comparison history

#### Editor pass 1 — captured baseline

- [P1] The inline editor inherited the Kanban action column width, compressing every control to roughly half of the mobile card while leaving unused space beside it.
  - Fix: moved editing into a responsive Radix dialog portal that fills the mobile viewport and centers within a bounded desktop modal.
- [P1] Populated inputs had no visible labels, so values such as dates, salary, email, and resume version could not be identified reliably.
  - Fix: added persistent visible labels and semantic fieldsets for every control.
- [P2] Save changes appeared only at the end of a very long page-level expansion, while the persistent app navigation remained over the form.
  - Fix: added a modal overlay, independent scrolling, sticky header, and sticky Cancel/Save footer.
  - Baseline evidence: `02-mobile-kanban-edit-open.png`, `03-mobile-kanban-edit-lower.png`, and `04-mobile-kanban-edit-bottom.png`.

#### Editor pass 2 — final comparison

- The selected 390 × 844 Atlas form reference and final editor were placed together in `mobile-edit-form-reference-vs-final.png` and reviewed at equal dimensions.
- Top, middle, bottom, 360 px, desktop, focus, dismissal, and submission states were rechecked. No actionable P0/P1/P2 findings remain.

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
- Tested: mobile stage visibility, compact search toolbar, customization open/close, editor open/close, automatic focus, Escape dismissal, focus return, labelled field groups, sticky actions, 360 px reflow, and desktop layout regression.
- Customization focus evidence: focus moved to “Close customization” on open; Escape removed the dialog and returned focus to “Customize.”
- Drag-and-drop remains covered by an isolated component test with the update action mocked, avoiding live application mutation.
- Console checked after the final interaction pass: no application errors or warnings; only React development information and Fast Refresh logs were present.
- Automated verification: 123 tests passed across 38 files; ESLint passed without warnings; TypeScript passed; Prettier passed for the changed Career files; the Next.js 16.3.2 production build passed.

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
- [x] Full-width, visibly labelled mobile application editor
- [x] Sticky editor header and Save/Cancel actions
- [x] Editor focus return, Escape, Cancel, and successful-submit coverage
- [x] Full automated and browser-rendered verification

final result: passed
