# Route Map

Framework: Next.js 16 App Router with file-based routes under `src/app`.

## Public routes

| URL | Page file | Layout | Summary |
| --- | --- | --- | --- |
| `/` | `src/app/(public)/page.tsx` | Root → Public | Marketing landing page with hero, product route preview, metrics, and signup/login CTAs. |
| `/login` | `src/app/(public)/login/page.tsx` | Root → Public | Email/password login card. |
| `/signup` | `src/app/(public)/signup/page.tsx` | Root → Public | Account registration card. |
| `/forgot-password` | `src/app/(public)/forgot-password/page.tsx` | Root → Public | Password-reset request form. |
| `/reset-password` | `src/app/(public)/reset-password/page.tsx` | Root → Public | New-password form. |

## Authenticated application routes

All routes use `src/app/layout.tsx` → `src/app/(app)/layout.tsx` → `AppShell` + `AppHeader`.

| URL | Page file | Summary |
| --- | --- | --- |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Today dashboard with ranked priorities, week status, financial snapshot, and module summaries. |
| `/money/accounts` | `src/app/(app)/money/accounts/page.tsx` | Active accounts, aggregate balance, create-account form, and responsive account cards. |
| `/money/accounts/archived` | `src/app/(app)/money/accounts/archived/page.tsx` | Archived financial accounts. |
| `/money/transactions` | `src/app/(app)/money/transactions/page.tsx` | Transaction capture, filtering, and transaction history. |
| `/money/transfers` | `src/app/(app)/money/transfers/page.tsx` | Account-to-account transfer form and transfer records. |
| `/money/budget` | `src/app/(app)/money/budget/page.tsx` | Monthly budget setup and category progress. |
| `/debts` | `src/app/(app)/debts/page.tsx` | Debt overview, payoff strategy tabs, debt entry, and ranked debt cards. |
| `/debts/[id]` | `src/app/(app)/debts/[id]/page.tsx` | Individual debt detail and payment history. |
| `/tasks` | `src/app/(app)/tasks/page.tsx` | Quick capture, horizontal task-view tabs, task cards, editing, and focus mode. |
| `/goals` | `src/app/(app)/goals/page.tsx` | Goal entry, progress summaries, and milestones. |
| `/career` | `src/app/(app)/career/page.tsx` | Job search metrics, kanban stages, application creation and editing. |
| `/reviews` | `src/app/(app)/reviews/page.tsx` | Weekly review form, metrics, notes, and trend chart. |
| `/search` | `src/app/(app)/search/page.tsx` | Cross-module search and grouped results. |
| `/settings` | `src/app/(app)/settings/page.tsx` | Profile, preferences, appearance, exports, and data controls. |
| `/settings/activity` | `src/app/(app)/settings/activity/page.tsx` | Account activity history. |
| `/onboarding` | `src/app/(app)/onboarding/page.tsx` | Initial profile and setup flow. |

## Supporting route handlers

| URL | File | Purpose |
| --- | --- | --- |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Supabase authentication callback. |
| `/api/health` | `src/app/api/health/route.ts` | Health check. |
| `/api/offline-sync` | `src/app/api/offline-sync/route.ts` | Offline mutation synchronization. |
| `/api/export/[format]` | `src/app/api/export/[format]/route.ts` | User-data export. |
| `/icons/[size]` | `src/app/icons/[size]/route.tsx` | Generated PWA icons. |

## Layout hierarchy

```text
src/app/layout.tsx
├── src/app/(public)/layout.tsx
│   ├── /
│   ├── /login
│   ├── /signup
│   ├── /forgot-password
│   └── /reset-password
└── src/app/(app)/layout.tsx
    └── AppShell
        ├── AppHeader
        ├── /dashboard
        ├── /money/*
        ├── /debts/*
        ├── /tasks
        ├── /goals
        ├── /career
        ├── /reviews
        ├── /search
        ├── /settings/*
        └── /onboarding
```
