# Key Page Dependency Trees

Authenticated pages also render through `src/app/(app)/layout.tsx`, which depends on `AppShell`, `AppHeader`, offline infrastructure, and Supabase server auth. The trees below start at each page entry and recursively trace local imports; repeated imports remain noted where they clarify a component's visual dependencies.

## `/` — Landing page
Entry: `src/app/(public)/page.tsx`

- `src/app/(public)/page.tsx`
  - `src/components/ui/button.tsx`
    - `src/lib/utils.ts`

## `/dashboard` — Today dashboard
Entry: `src/app/(app)/dashboard/page.tsx`

- `src/app/(app)/dashboard/page.tsx`
  - `src/components/ui/button.tsx`
    - `src/lib/utils.ts`
  - `src/components/ui/card.tsx`
    - `src/lib/utils.ts`
  - `src/lib/dates/dates.ts`
  - `src/lib/money/money.ts`
  - `src/lib/supabase/server.ts`
    - `src/lib/env.ts`

## `/money/accounts` — Accounts
Entry: `src/app/(app)/money/accounts/page.tsx`

- `src/app/(app)/money/accounts/page.tsx`
  - `src/components/money/account-form.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
    - `src/components/ui/input.tsx`
      - `src/lib/utils.ts`
    - `src/lib/utils.ts`
    - `src/lib/money/actions.ts`
      - `src/lib/money/money.ts`
      - `src/lib/supabase/server.ts`
        - `src/lib/env.ts`
      - `src/lib/validation/schemas.ts`
      - `src/lib/offline/server.ts`
    - `src/components/offline/offline-mutation.tsx`
      - `src/components/offline/offline-provider.tsx`
        - `src/lib/offline/queue.ts`
          - `src/lib/offline/types.ts`
        - `src/lib/offline/types.ts`
      - `src/lib/offline/types.ts`
  - `src/components/money/account-card.tsx`
    - `src/components/money/account-form.tsx`
    - `src/components/money/balance-adjustment-form.tsx`
      - `src/components/ui/button.tsx`
      - `src/components/ui/input.tsx`
      - `src/lib/money/money.ts`
      - `src/lib/money/actions.ts`
      - `src/components/offline/offline-mutation.tsx`
    - `src/components/money/delete-archived-account-form.tsx`
      - `src/components/ui/button.tsx`
      - `src/components/ui/input.tsx`
      - `src/lib/money/actions.ts`
      - `src/components/offline/offline-mutation.tsx`
    - `src/components/ui/button.tsx`
    - `src/components/offline/offline-mutation.tsx`
    - `src/lib/money/money.ts`
    - `src/components/ui/card.tsx`
      - `src/lib/utils.ts`
  - `src/components/shared/page-heading.tsx`
  - `src/components/ui/button.tsx`
  - `src/lib/money/money.ts`
  - `src/lib/supabase/server.ts`

## `/debts` — Debts
Entry: `src/app/(app)/debts/page.tsx`

- `src/app/(app)/debts/page.tsx`
  - `src/components/debts/debt-form.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
    - `src/components/ui/input.tsx`
      - `src/lib/utils.ts`
    - `src/lib/debts/actions.ts`
      - `src/lib/money/money.ts`
      - `src/lib/supabase/server.ts`
        - `src/lib/env.ts`
      - `src/lib/validation/schemas.ts`
      - `src/lib/offline/server.ts`
    - `src/components/offline/offline-mutation.tsx`
      - `src/components/offline/offline-provider.tsx`
        - `src/lib/offline/queue.ts`
          - `src/lib/offline/types.ts`
        - `src/lib/offline/types.ts`
      - `src/lib/offline/types.ts`
  - `src/components/shared/page-heading.tsx`
  - `src/components/ui/card.tsx`
    - `src/lib/utils.ts`
  - `src/lib/debts/debt.ts`
  - `src/lib/money/money.ts`
  - `src/lib/supabase/server.ts`

## `/tasks` — Tasks
Entry: `src/app/(app)/tasks/page.tsx`

- `src/app/(app)/tasks/page.tsx`
  - `src/components/tasks/quick-task-form.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
    - `src/components/ui/input.tsx`
      - `src/lib/utils.ts`
    - `src/lib/tasks/actions.ts`
      - `src/lib/supabase/server.ts`
        - `src/lib/env.ts`
      - `src/lib/validation/schemas.ts`
      - `src/lib/offline/server.ts`
    - `src/components/offline/offline-mutation.tsx`
      - `src/components/offline/offline-provider.tsx`
        - `src/lib/offline/queue.ts`
          - `src/lib/offline/types.ts`
        - `src/lib/offline/types.ts`
      - `src/lib/offline/types.ts`
  - `src/components/tasks/task-edit-form.tsx`
    - `src/components/ui/button.tsx`
    - `src/components/ui/input.tsx`
    - `src/lib/tasks/task-time.ts`
    - `src/components/offline/offline-mutation.tsx`
  - `src/components/tasks/task-focus-mode.tsx`
    - `src/components/ui/button.tsx`
    - `src/components/offline/offline-mutation.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/card.tsx`
    - `src/lib/utils.ts`
  - `src/components/offline/offline-mutation.tsx`
  - `src/lib/dates/dates.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/tasks/task-time.ts`

## `/goals` — Goals
Entry: `src/app/(app)/goals/page.tsx`

- `src/app/(app)/goals/page.tsx`
  - `src/components/goals/goal-form.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
    - `src/components/ui/input.tsx`
      - `src/lib/utils.ts`
    - `src/lib/goals/actions.ts`
      - `src/lib/supabase/server.ts`
        - `src/lib/env.ts`
      - `src/lib/validation/schemas.ts`
      - `src/lib/offline/server.ts`
    - `src/components/offline/offline-mutation.tsx`
      - `src/components/offline/offline-provider.tsx`
        - `src/lib/offline/queue.ts`
          - `src/lib/offline/types.ts`
        - `src/lib/offline/types.ts`
      - `src/lib/offline/types.ts`
  - `src/components/goals/milestone-list.tsx`
    - `src/components/ui/button.tsx`
    - `src/components/offline/offline-mutation.tsx`
  - `src/components/shared/page-heading.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/card.tsx`
    - `src/lib/utils.ts`
  - `src/components/offline/offline-mutation.tsx`
  - `src/lib/supabase/server.ts`

## `/career` — Career pipeline
Entry: `src/app/(app)/career/page.tsx`

- `src/app/(app)/career/page.tsx`
  - `src/components/career/application-create-dialog.tsx`
    - `src/components/career/application-form.tsx`
      - `src/components/ui/button.tsx`
        - `src/lib/utils.ts`
      - `src/components/ui/input.tsx`
        - `src/lib/utils.ts`
      - `src/lib/career/actions.ts`
        - `src/lib/money/money.ts`
        - `src/lib/supabase/server.ts`
          - `src/lib/env.ts`
        - `src/lib/validation/schemas.ts`
        - `src/lib/offline/server.ts`
      - `src/components/offline/offline-mutation.tsx`
        - `src/components/offline/offline-provider.tsx`
          - `src/lib/offline/queue.ts`
            - `src/lib/offline/types.ts`
          - `src/lib/offline/types.ts`
        - `src/lib/offline/types.ts`
      - `src/lib/utils.ts`
    - `src/components/ui/button.tsx`
  - `src/components/career/application-edit-form.tsx`
    - `src/components/ui/button.tsx`
    - `src/components/ui/input.tsx`
    - `src/lib/career/actions.ts`
    - `src/components/offline/offline-mutation.tsx`
    - `src/lib/utils.ts`
  - `src/components/career/career-kanban.tsx`
    - `src/components/career/application-edit-form.tsx`
    - `src/components/career/stage-select.tsx`
      - `src/components/offline/offline-mutation.tsx`
      - `src/lib/career/actions.ts`
      - `src/lib/utils.ts`
    - `src/components/ui/card.tsx`
      - `src/lib/utils.ts`
    - `src/lib/utils.ts`
  - `src/components/career/stage-select.tsx`
  - `src/components/shared/page-heading.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/card.tsx`
  - `src/lib/money/money.ts`
  - `src/lib/supabase/server.ts`

## `/reviews` — Weekly reviews
Entry: `src/app/(app)/reviews/page.tsx`

- `src/app/(app)/reviews/page.tsx`
  - `src/components/reviews/review-form.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
    - `src/components/ui/input.tsx`
      - `src/lib/utils.ts`
    - `src/components/offline/offline-mutation.tsx`
      - `src/components/offline/offline-provider.tsx`
        - `src/lib/offline/queue.ts`
          - `src/lib/offline/types.ts`
        - `src/lib/offline/types.ts`
      - `src/lib/offline/types.ts`
  - `src/components/reviews/review-trend.tsx`
  - `src/components/shared/page-heading.tsx`
  - `src/components/ui/card.tsx`
    - `src/lib/utils.ts`
  - `src/lib/dates/dates.ts`
  - `src/lib/money/money.ts`
  - `src/lib/supabase/server.ts`
    - `src/lib/env.ts`

## `/search` — Global search
Entry: `src/app/(app)/search/page.tsx`

- `src/app/(app)/search/page.tsx`
  - `src/components/search/search-input.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
    - `src/components/ui/input.tsx`
      - `src/lib/utils.ts`
  - `src/lib/supabase/server.ts`
    - `src/lib/env.ts`

## `/settings` — Settings
Entry: `src/app/(app)/settings/page.tsx`

- `src/app/(app)/settings/page.tsx`
  - `src/components/atlas/theme-toggle.tsx`
    - `src/components/ui/button.tsx`
      - `src/lib/utils.ts`
  - `src/components/shared/page-heading.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/card.tsx`
    - `src/lib/utils.ts`
