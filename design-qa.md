**Design QA — Career Stage Spotlight**

- Source visual truth: `C:\Users\kdv06\.codex\generated_images\019ff693-bf1a-7910-94b9-f7fc578c8ae3\exec-2a7c4b23-014a-4ea4-887b-81579bd11b13.png`
- Mobile implementation: `C:\Users\kdv06\OneDrive\Desktop\Atlas\career-kanban-mobile.png`
- Desktop implementation: `C:\Users\kdv06\OneDrive\Desktop\Atlas\career-kanban-desktop.png`
- Normalized comparison: `C:\Users\kdv06\OneDrive\Desktop\Atlas\career-kanban-comparison.png`
- State: authenticated, dark theme, Kanban view, Applied stage selected, attention sorting, three realistic applications
- CSS viewport: 390 × 844 mobile and 1440 × 1024 desktop
- Density: devicePixelRatio 1
- Source pixels: 853 × 1844; normalized to 375 × 811 for comparison
- Mobile implementation pixels: 375 × 812

**Findings**

- No actionable P0, P1, or P2 visual differences remain.
- Typography: Atlas's existing Geist typography is preserved. The title, eyebrow, stage labels, card hierarchy, and small metadata closely match the selected direction in weight, spacing, and contrast.
- Spacing and layout: the implementation keeps the selected stage-spotlight hierarchy, horizontal stage rail, focused vertical card stack, clear next-action section, and paired Move/Edit controls. The persistent Atlas account header and mobile navigation reduce the number of full cards visible above the fold compared with the concept; this is an expected product-shell constraint, and all cards remain easy to reach vertically.
- Colors and tokens: the implementation uses Atlas's existing background, card, border, primary, muted, and destructive tokens rather than introducing one-off colors. Selected and overdue states remain visually distinct in dark mode.
- Image and asset fidelity: the source direction does not require photography or illustration. All functional marks use the project's existing Lucide icon set; no placeholder or simulated artwork is present.
- Copy and content: the compact heading, stage counts, swipe cue, sort control, application metadata, next actions, due states, Move stage, and Edit details match the selected experience. Real application data replaces the concept's presentation-only counts.
- Responsive behavior: mobile has no page-level horizontal overflow; the stage rail alone scrolls intentionally and centers the selected stage. Desktop uses the available width for two columns and has no horizontal or vertical viewport overflow in the tested state.
- Accessibility and interaction: the stage rail uses tabs and a labelled tab panel, native selects keep keyboard and mobile-picker behavior, controls meet the existing Atlas tap-target conventions, and focus rings use the shared ring token.

**Comparison History**

1. Initial rendered comparison found a P2 control-density issue: Edit details sat beneath Move stage, making cards taller and drifting from the selected side-by-side action layout.
2. The card action row was changed to a responsive two-control grid, with the edit form expanding beneath both controls. The stage rail was also made sticky and now centers the selected stage.
3. The post-fix mobile capture shows the paired Move/Edit actions, selected-stage emphasis, overdue priority, and card rhythm matching the visual target. No P0/P1/P2 issue remains.

**Primary Interactions Tested**

- Open and close the Add application dialog.
- Change Arc Studio from Applied to Offer and verify the card disappears immediately from Applied while both stage counts update.
- Move Arc Studio back to Applied and restore the comparison state.
- Switch stage tabs and verify the selected panel changes.
- Check browser console errors: none.

**Focused Region Evidence**

The normalized side-by-side image is readable at the header, stage rail, complete first card, and action controls. No separate focused crop was needed because there are no raster assets or fine-detail logos to inspect.

**Follow-up Polish**

- P3: a future iteration could make the signed-in header more compact on small screens across all Atlas sections, allowing more Career content above the fold. This is an app-shell change and is intentionally outside this focused Kanban redesign.

**Implementation Checklist**

- [x] Preserve Atlas design tokens and global shell.
- [x] Add a mobile-first, horizontally scrollable stage rail.
- [x] Show one focused stage as a vertical card stack.
- [x] Make stage changes update and regroup cards immediately.
- [x] Keep add and edit workflows functional.
- [x] Verify mobile and desktop rendering and core interactions.

final result: passed
