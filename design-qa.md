# Money account edit form design QA

- Source visual truth: `C:/Users/kdv06/AppData/Local/Temp/codex-clipboard-582a2536-e286-4270-bb0f-ebb80c333c2f.png`
- Source dimensions: 939 × 393 pixels; density not provided
- Intended comparison viewport: 939 × 393 CSS pixels at device scale factor 1
- Implementation screenshot: not captured; the local authenticated route redirected to `/login` in the available in-app browser
- State: dark theme, authenticated Accounts page, two account cards with “Edit account details” expanded

## Findings

- [P2] Authenticated post-fix visual comparison is unavailable.
  - Location: `/money/accounts`, expanded account edit forms.
  - Evidence: the source screenshot was opened at its original 939 × 393 resolution, but the local route redirected to `/login?next=%2Fmoney%2Faccounts`; the user's authenticated Chrome surface was unavailable.
  - Impact: build and CSS evidence confirm the responsive rules compile, but card-level spacing and wrapping cannot be approved from a rendered screenshot.
  - Fix: sign in to the local Atlas preview, expand the edit form at the same viewport, and capture the account-card region for a final visual comparison.

## Required fidelity surfaces

- Fonts and typography: existing Atlas typography and sizes are unchanged; post-fix wrapping is not visually verified.
- Spacing and layout rhythm: the viewport-based nested grid was replaced with a card-width container query; post-fix rendering is not visually verified.
- Colors and visual tokens: the existing border, background, ring, and text tokens are preserved.
- Image quality and asset fidelity: no image assets are present in this component.
- Copy and content: labels, account values, balance copy, and action copy are unchanged.

## Full-view comparison evidence

The source shows two narrow account cards. In both expanded forms, controls are compressed and the “Save changes” button overflows beyond the form and card boundary. No authenticated implementation capture was available.

## Focused-region comparison evidence

The account edit region in the source was inspected at original resolution. Source code and compiled CSS confirm that edit mode now uses one column below a 20rem card width, two columns above it, and full-span Institution and action rows. This is implementation evidence, not a substitute for the missing rendered comparison.

## Comparison history

1. Initial finding: page-level responsive columns activated inside approximately 370px cards, creating truncated inputs and an escaped submit button.
2. Fix applied: added an inline-size container to each edit section, card-width grid variants, `min-width: 0` safeguards, a contained full-width action, and matching focus treatment for the select.
3. Post-fix evidence: lint, TypeScript, 53 unit tests, and the Next.js production build passed; compiled CSS contains the expected 20rem container rules. Visual evidence remains blocked by authentication.

## Implementation checklist

- [x] Keep edit controls within the account card.
- [x] Respond to component width instead of viewport width.
- [x] Preserve the full-width add-account form layout.
- [x] Preserve labels, values, actions, and Atlas design tokens.
- [ ] Capture and compare the authenticated post-fix state.

final result: blocked
