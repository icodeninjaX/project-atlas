# Circular Provider Icons — Design QA

## Comparison target

- Source visual truth: `C:\Users\kdv06\AppData\Local\Temp\codex-clipboard-f8876f39-98bd-4539-8eaf-db7de102f69f.png`
- Source dimensions: 582 × 314 pixels at supplied density; CSS size and device density are unknown.
- Implementation screenshot: `C:\Users\kdv06\Downloads\atlas-circular-provider-icons.jpg`
- Implementation viewport and dimensions: 960 × 856 CSS pixels at 1×; screenshot is 960 × 856 pixels.
- State: dark theme, Add account dialog open, E-wallet selected, and GCash selected for the live preview.
- Normalization: the source is a focused crop of the same provider grid before this change. The comparison focused on logo silhouette, whitespace, scale, alignment, tile density, and the selected card preview.

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: unchanged from the approved ATLAS design; provider labels retain their size, weight, baseline, and truncation behavior.
- Spacing and layout rhythm: circular masks occupy the same 36px grid slot, preserving tile height and alignment while removing the square white corners that made the logos feel smaller.
- Colors and visual tokens: original provider colors remain intact. The circular crop integrates more cleanly with the dark tile surface without adding new decorative colors or gradients.
- Image quality and asset fidelity: the existing official/provider PNG files remain the source of truth. `object-cover` fills each circular mask without stretching; logos remain sharp at their rendered size.
- Copy and content: no labels or account details changed.
- Icons: all provider logo wells, the Custom fallback well, and the live card-preview well now use the same circular silhouette.
- Accessibility and behavior: decorative logo images remain hidden from assistive technology, accessible provider button names are unchanged, and selection/focus behavior still works.
- Browser console: no errors were present in the verified state.

## Comparison history

### Pass 1

- [P2] The source showed square white logo wells with visible corner whitespace, making several provider marks appear smaller than their available slot.
  - Fix: changed provider and preview wells to `rounded-full`, and changed provider images to fill the circular mask with `object-cover`.

### Pass 2

- Post-fix evidence shows consistently circular GCash, Maya, GrabPay, ShopeePay, Coins.ph, PalawanPay, Bayad, and Wise marks. Square corner whitespace is removed and the three-column tile rhythm is preserved.

## Full-view comparison evidence

- The source and rendered implementation were opened together in one comparison input. The provider grid remains structurally identical, making the circular-mask improvement directly comparable.

## Focused comparison evidence

- The source is already a focused provider-grid crop. The implementation capture keeps every affected provider logo and the GCash live preview clearly readable, so no smaller crop was needed.

## Verification

- Primary interaction: selected GCash and confirmed the same circular treatment appears in the live card preview.
- Focused tests: 11 passed across the account-create and visible-label suites.
- Next.js route generation and TypeScript: passed.
- ESLint: passed.
- Changed-file Prettier check and `git diff --check`: passed.

## Follow-up polish

- None required for this change.

final result: passed
