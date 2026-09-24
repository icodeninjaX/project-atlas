# Repository formatting debt

Status: Resolved in the local working tree on 2026-09-24.

Current baseline: **0 remaining formatting failures**. The original audit and
classification below are retained as evidence, separate from Graph acceptance.

## Baseline and attribution

The Phase 8 acceptance audit on 2026-09-24 found exactly **45** failures from
`npm run format:check`. None intersects the Graph change set. Every failing
file matches pre-Graph HEAD `3767187b15fa0fe11c9b6b66d3a6cfe47a460dfa` after
normalizing checkout line endings. Formatting checks against those HEAD
contents, using the current checkout line endings and project configuration,
reproduce all 45 failures. This includes existing checkout line-ending drift;
it is not evidence that every committed blob has a style violation.

Classification before formatting changes:

- Graph-related files changed during Phase 8: **0 failures**.
- Other files changed during Phase 8: **0 failures**.
- Pre-existing unrelated source, test, and configuration files: **35 failures**.
- Pre-existing documentation files: **10 failures**.

## Exact failing files

All entries below predate Graph and are unchanged by Graph.

### Pre-existing unrelated files (35)

```text
.prettierrc.json
components.json
e2e/accessibility.spec.ts
e2e/public.spec.ts
eslint.config.mjs
next.config.ts
postcss.config.mjs
src/app/(app)/error.tsx
src/app/(app)/loading.tsx
src/app/(app)/onboarding/page.tsx
src/app/(public)/forgot-password/page.tsx
src/app/(public)/layout.tsx
src/app/(public)/page.tsx
src/app/(public)/reset-password/page.tsx
src/app/(public)/signup/page.tsx
src/app/api/health/route.ts
src/app/auth/callback/route.ts
src/app/not-found.tsx
src/components/atlas/theme-provider.tsx
src/components/auth/auth-card.tsx
src/components/reviews/review-trend.tsx
src/components/search/search-input.test.tsx
src/components/search/search-input.tsx
src/components/shared/module-empty-page.tsx
src/components/tasks/task-create-panel.test.tsx
src/lib/auth/redirects.test.ts
src/lib/auth/redirects.ts
src/lib/env.ts
src/lib/money/balances.test.ts
src/lib/money/balances.ts
src/lib/onboarding/actions.ts
src/lib/reviews/actions.ts
src/lib/utils.ts
tsconfig.json
vitest.config.ts
```

### Pre-existing documentation files (10)

```text
.superdesign/design-system.md
.superdesign/init/components.md
.superdesign/init/extractable-components.md
.superdesign/init/layouts.md
.superdesign/init/pages.md
.superdesign/init/routes.md
AGENTS.md
CLAUDE.md
docs/architecture.md
docs/mvp-status.md
```

## Impact and cleanup

These formatting findings did not affect runtime behavior or block Graph
acceptance under the roadmap baseline policy. Cleanup was applied only to the
45 enumerated files using the existing project formatter, as Change B,
separate from Change A (Graph acceptance/documentation correction).

The inspected cleanup comprised 37 line-ending-only normalizations and eight
files with Markdown spacing/table alignment or JSX line wrapping: 83 additions
and 43 deletions after ignoring line endings. There were no semantic changes,
lockfile changes, or generated artifact edits. Git normalizes the 37 line-ending
changes, so they do not create source diffs against HEAD. The eight visible
cleanup files are the six `.superdesign` Markdown files listed above,
`docs/mvp-status.md`, and `src/components/tasks/task-create-panel.test.tsx`.

Validation after cleanup: repository format check, lint, typecheck, 358
unit/component tests, production build, 131 database tests, and Graph/public/
accessibility browser checks passed. Changes remain uncommitted so Graph and
formatting cleanup can be reviewed and committed separately.

Future checkouts may reintroduce line-ending drift under local Git settings.
Check the baseline after checkout; no repository line-ending policy was changed
as part of this targeted cleanup.
