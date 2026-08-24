# Mobile task actions design QA

## Comparison target

- Source visual truth: `C:\Users\kdv06\AppData\Local\Temp\codex-clipboard-d2c327c6-a996-4343-9153-83699b1efb4e.png`
- Source pixels: 354 × 170. The source is already a focused crop of the mobile task card.
- Browser-rendered implementation:
  - Closed menu: `C:\Dev\Atlas\.codex-audits\task-actions\01-mobile-menu-closed-360x800.png` (345 × 767 captured pixels)
  - Previous open menu: `C:\Dev\Atlas\.codex-audits\task-actions\02-mobile-menu-open-360x800.png` (345 × 767 captured pixels)
  - Reminder sheet: `C:\Dev\Atlas\.codex-audits\task-actions\03-mobile-reminder-sheet-360x800.png` (360 × 800 captured pixels)
  - Focus dialog: `C:\Dev\Atlas\.codex-audits\task-actions\04-mobile-focus-dialog-360x800.png` (360 × 800 captured pixels)
  - Narrow-phone open menu: `C:\Dev\Atlas\.codex-audits\task-actions\05-mobile-menu-open-320x800.png` (305 × 763 captured pixels)
  - Final solid dark menu: `C:\Dev\Atlas\.codex-audits\task-actions\06-solid-menu-dark-360x800.png` (345 × 767 captured pixels)
  - Final solid light menu: `C:\Dev\Atlas\.codex-audits\task-actions\07-solid-menu-light-360x800.png` (345 × 767 captured pixels)
  - Final compact metadata row: `C:\Dev\Atlas\.codex-audits\task-actions\08-compact-meta-row-dark-360x800.png` (360 × 800 captured pixels)
  - Final narrow compact row: `C:\Dev\Atlas\.codex-audits\task-actions\09-compact-meta-row-dark-320x800.png` (320 × 800 captured pixels)
  - Final narrow open menu: `C:\Dev\Atlas\.codex-audits\task-actions\10-compact-meta-menu-dark-320x800.png` (320 × 800 captured pixels)
  - Final inline completion control: `C:\Dev\Atlas\.codex-audits\task-actions\12-inline-complete-dark-360x800.png` (360 × 800 captured pixels)
  - Final narrow inline completion control: `C:\Dev\Atlas\.codex-audits\task-actions\13-inline-complete-dark-320x800.png` (320 × 800 captured pixels)
  - Final narrow inline completion menu: `C:\Dev\Atlas\.codex-audits\task-actions\14-inline-complete-menu-dark-320x800.png` (320 × 800 captured pixels)
  - Final severity colors in dark theme: `C:\Dev\Atlas\.codex-audits\task-actions\15-priority-colors-dark-360x800.png` (360 × 800 captured pixels)
  - Final severity colors in light theme: `C:\Dev\Atlas\.codex-audits\task-actions\16-priority-colors-light-360x800.png` (360 × 800 captured pixels)
- CSS viewport: 360 × 800 for the primary pass and 320 × 800 for the narrow pass.
- Device scale factor: 1. No density resampling was used. The browser viewport includes a 15px vertical-scrollbar gutter in page screenshots, which accounts for the 345px and 305px captured page widths.
- Theme and content: dark and light themes; overdue task titled “Make the app offline first,” with the final responsive pass using critical priority and a 2026-08-13 due date.
- Capture setup: a temporary unauthenticated QA route rendered the production `TaskActionsMenu`, task edit form, Focus dialog, and the same mobile task-card layout because the normal `/tasks` route requires a signed-in Supabase session. The temporary route was removed after capture.

## Full-view comparison evidence

- The original task card scatters Delete at the far right and Focus/Edit below the metadata. The revised mobile card keeps completion at the left, places one three-dot control at the right edge of the title row, and removes the standalone mobile Focus, Edit, and Delete controls.
- The final closed card is 95 CSS pixels tall versus roughly 146 pixels in the source crop. Its first row now uses the full card width for the title at left and the completion/three-dot controls at right; the second row pairs the priority at left with overdue/date at right.
- The open 208px action menu presents Focus, Set reminder, Edit task, and Delete task in one scan-friendly stack. Its final solid white/slate surfaces, brighter labels, stronger border, and deeper shadow clearly separate it from the task card. Delete remains visually separated and uses the destructive color.
- At the 320px check, the title starts at x=21 instead of x=73, and the completion control remains a 40 × 44px target at x=225. The priority and overdue/date labels also use the card’s full inner width, while the action menu remains fully within the viewport.
- The final four-task severity pass shows the full hierarchy without changing badge size: low uses emerald, medium amber, high orange, and critical red. Text labels remain present, so severity is not conveyed by color alone.

## Focused-region comparison evidence

A separate crop was not needed: the 354 × 170 source visual is already a focused task-card region, and the primary implementation screenshots keep the card and menu text readable at 1× density. The reminder and Focus screenshots provide focused evidence for the two actions that open larger surfaces.

## Required fidelity surfaces

- Fonts and typography: Existing Atlas sans and mono font tokens, title weight, priority sizing, and overdue metadata hierarchy are preserved. Menu labels use the existing button typography. Long titles remain readable and wrap rather than truncate.
- Spacing and layout rhythm: The completion target retains a 44px vertical tap area, the overflow target remains 40px wide, and both now sit together at the right of the title row. Removing the dedicated mobile completion column lets the title and status row begin at the card’s 12px inner padding. Desktop keeps its existing left completion control and detailed schedule layout.
- Colors and visual tokens: Card, foreground, ring, and destructive tokens match the existing themes. Priority badges now use low/emerald, medium/amber, high/orange, and critical/red semantic families with translucent fills, visible borders, and theme-specific foreground shades. The final menu keeps fully opaque white in light mode and slate-800 in dark mode.
- Image quality and asset fidelity: No raster assets are required for this control. All icons use the project’s existing Lucide icon library and remain sharp at native size.
- Copy and content: Focus, Set reminder, Edit task, and Delete task match the requested actions. The compact mobile row intentionally shows priority plus overdue/date only; exact time and duration remain in the existing desktop metadata and task actions.

## Interaction and accessibility verification

- Three-dot trigger exposes `aria-haspopup="menu"`, `aria-expanded`, and a task-specific accessible name.
- Completion stays directly accessible with task-specific Complete/Reopen labels; only its mobile position changed, while the mutation and desktop placement remain intact.
- Menu opens and closes, closes on outside pointer or Escape, returns focus to the trigger, and supports Arrow Up/Down, Home, and End navigation.
- Set reminder opens a bottom sheet and focuses Scheduled date.
- Edit task opens the same compact sheet and focuses Task title.
- Focus launches the existing full-screen 30-minute Focus dialog while the menu closes; closing Focus returns focus to the three-dot trigger.
- Delete remains a form submission and was not activated during visual QA.
- Browser console errors and warnings: none.

## Comparison history

### Iteration 1

- Finding: [P1] The open menu used `bg-popover`, but this project does not define a popover color token, so underlying overdue metadata showed through the first menu row.
- Evidence: `C:\Dev\Atlas\.codex-audits\task-actions\00-initial-transparent-menu-360x800.png`.
- Fix: Replaced the undefined popover surface with the existing opaque `bg-card text-card-foreground` tokens.
- Post-fix evidence: `C:\Dev\Atlas\.codex-audits\task-actions\02-mobile-menu-open-360x800.png` and the 320px narrow pass.

### Iteration 2

- Finding: [P2] Although `bg-card` was technically opaque, its value was too close to the surrounding task card and page background, so the menu still appeared transparent and the muted labels were difficult to scan.
- Evidence: `C:\Dev\Atlas\.codex-audits\task-actions\02-mobile-menu-open-360x800.png` and direct user feedback.
- Fix: Replaced the low-contrast card surface with solid white/slate-800 theme surfaces, brighter slate text, stronger borders, and deeper shadows.
- Post-fix evidence: `C:\Dev\Atlas\.codex-audits\task-actions\06-solid-menu-dark-360x800.png` and `C:\Dev\Atlas\.codex-audits\task-actions\07-solid-menu-light-360x800.png`.

### Iteration 3

- Finding: [P2] Priority and overdue/date still consumed separate horizontal groups in the title and metadata areas, creating an unnecessary extra row on mobile.
- Evidence: the source crop plus direct user feedback requesting critical at left and overdue/date at right on one line.
- Fix: Kept the title and three-dot trigger on the first mobile row, then moved priority and the compact overdue/date label into a dedicated `justify-between` row. The longer date/time/duration metadata remains desktop-only.
- Post-fix evidence: `C:\Dev\Atlas\.codex-audits\task-actions\08-compact-meta-row-dark-360x800.png`, `C:\Dev\Atlas\.codex-audits\task-actions\09-compact-meta-row-dark-320x800.png`, and the measured 320px alignment noted above.

### Iteration 4

- Finding: [P2] The completion check still occupied a dedicated left column on mobile, preventing the title and status row from using the card’s full width.
- Evidence: `C:\Dev\Atlas\.codex-audits\task-actions\09-compact-meta-row-dark-320x800.png` and direct user feedback.
- Fix: Moved the mobile Complete/Reopen control into the task header immediately before the three-dot menu. The original left-side control is retained only at the desktop breakpoint.
- Post-fix evidence: `C:\Dev\Atlas\.codex-audits\task-actions\12-inline-complete-dark-360x800.png`, `C:\Dev\Atlas\.codex-audits\task-actions\13-inline-complete-dark-320x800.png`, and `C:\Dev\Atlas\.codex-audits\task-actions\14-inline-complete-menu-dark-320x800.png`.

### Iteration 5

- Finding: [P2] Priority labels used one neutral visual treatment, so users had to read every badge to distinguish task severity.
- Evidence: the neutral Medium badge in the source crop and direct user feedback requesting severity color coding.
- Fix: Added a reusable priority-to-color mapping for low, medium, high, and critical badges. Kept the written severity label to preserve non-color identification and used separate light/dark text shades for contrast.
- Post-fix evidence: `C:\Dev\Atlas\.codex-audits\task-actions\15-priority-colors-dark-360x800.png` and `C:\Dev\Atlas\.codex-audits\task-actions\16-priority-colors-light-360x800.png`.

### Final pass

- No actionable P0, P1, or P2 findings remain.
- The menu options remain clearly legible against fully opaque surfaces, the compact metadata row stays readable without overflow at 320px, and all four priority badges remain distinct in both themes.
- Title, priority, and overdue/date now use the mobile card’s full inner width, while desktop keeps its established completion and metadata presentation.

final result: passed

---

# Atlas System Core brand design QA

## Comparison target

- Source visual truth: `C:\Dev\Atlas\public\brand\logo-concepts\atlas-logo-03-system-core.png`
- Source pixels: 1254 × 1254 RGBA.
- Production asset: `C:\Dev\Atlas\public\brand\atlas-system-core.png` at
  1254 × 1254 RGBA.
- Browser-rendered implementation:
  - Dark desktop: `C:\Dev\Atlas\docs\brand\qa\atlas-system-core-desktop.png`
    at 1440 × 1000 captured pixels.
  - Light desktop: `C:\Dev\Atlas\docs\brand\qa\atlas-system-core-desktop-light.png`
    at 1440 × 1000 captured pixels.
  - Dark mobile: `C:\Dev\Atlas\docs\brand\qa\atlas-system-core-mobile.png`
    at 390 × 844 captured pixels.
  - Focused comparison: `C:\Dev\Atlas\docs\brand\qa\atlas-system-core-comparison.png`.
- CSS viewport: 1440 × 1000 for desktop and 390 × 844 for mobile.
- Device scale factor: 1. The focused comparison normalizes the selected
  1254px concept to the same 36 × 36px CSS slot as the rendered header mark,
  then enlarges both panels 6× with nearest-neighbor scaling for inspection.
- State: public landing page, dark and light themes, desktop and mobile.

## Full-view comparison evidence

- The System Core symbol appears directly beside the Project Atlas name in the
  existing 36px brand slot on both desktop and mobile without changing the
  header height, link target, typography, or surrounding spacing.
- The mark remains readable against both `#070a0f` dark and `#f4f7fb` light
  surfaces. Its five modules and open center remain distinguishable at the
  rendered size.
- The 390px capture keeps the mark and Project Atlas name aligned and leaves the
  existing responsive landing-page composition unchanged.
- The installed-app icons use the same silhouette, with the mark fitted to 68%
  of normal icons and 56% of the maskable icon so important geometry remains in
  the maskable safe area.

## Focused-region comparison evidence

- `atlas-system-core-comparison.png` places the selected concept and final
  36px browser rendering in one normalized comparison input.
- The production normalization intentionally removes the generated tonal
  gradient and low-alpha edge noise while preserving the selected five-part
  silhouette, proportions, rotation, and open center.
- The final source is loaded directly as a PNG rather than being recompressed by
  the Next.js image optimizer; the browser reports a 1254 × 1254 natural image
  rendered at 36 × 36 CSS pixels.

## Required fidelity surfaces

- Fonts and typography: Geist Sans and existing weights, sizes, line heights,
  tracking, and Project Atlas label remain unchanged.
- Spacing and layout rhythm: The mark stays in the existing 36 × 36 slot. Header
  height, logo-to-name gap, navigation spacing, and responsive breakpoints are
  unchanged.
- Colors and visual tokens: The primary mark uses Atlas blue `#2867e8`.
  Installed-app icons use the established dark primary `#84afff` on `#070a0f`.
  The manifest and offline theme color now use Atlas blue instead of legacy
  teal.
- Image quality and asset fidelity: The exact selected raster geometry is used,
  with a deterministic flat-color and alpha cleanup. No CSS drawing, inline
  SVG, letterform, or placeholder shape substitutes for the source. Normal and
  maskable PNG icons returned HTTP 200 in browser endpoint checks.
- Copy and content: No product copy changed. The brand remains the symbol beside
  the existing Project Atlas name; no text was embedded in the logo asset.

## Interaction and accessibility verification

- The brand link remains accessible as “Project Atlas” and still points to `/`.
- The logo image is decorative (`alt=""`) inside an `aria-hidden` mark wrapper,
  avoiding duplicate announcement beside the visible Project Atlas name.
- The theme toggle was exercised and the logo remained visible in dark and
  light states.
- Manifest, production mark, and all four icon endpoints returned HTTP 200 with
  the expected image or manifest content type.
- Browser console errors and warnings: none.

## Comparison history

### Iteration 1

- Finding: [P2] The initial browser implementation let the image optimizer
  recompress the small solid-color logo, softening its edges at 36px.
- Fix: Served the compact 12.9KB production PNG directly and converted the
  generated alpha into a clean high-resolution silhouette before browser
  downsampling.
- Post-fix evidence: `atlas-system-core-desktop.png`,
  `atlas-system-core-desktop-light.png`, and
  `atlas-system-core-comparison.png`.

### Final pass

- No actionable P0, P1, or P2 findings remain.
- The chosen mark is visually faithful, crisp at the in-app size, aligned in
  both themes and responsive layouts, and consistent across browser and PWA
  identity surfaces.

final result: passed
