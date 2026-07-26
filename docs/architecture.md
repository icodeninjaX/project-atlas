# Project Atlas architecture

## Product boundary

Project Atlas is a private, single-user-per-account personal operating system. The MVP combines daily planning, money, debt, goals, career applications, weekly reflection, search, export, and activity history. AI, CRM, journals, knowledge, calendar sync, habits, scoring, file attachments, and automations remain future modules.

## Application shape

- Next.js 16 App Router with Server Components by default.
- Client Components only for forms, dialogs, keyboard shortcuts, charts, and direct browser interaction.
- Server Actions for authenticated first-party mutations.
- Route Handlers for auth callbacks, health checks, and server-generated exports.
- Supabase Auth with cookie-based SSR sessions.
- Supabase PostgreSQL as the source of truth, protected by Row-Level Security.
- Shared Zod schemas at all mutation boundaries.

## Financial model

Accounts store an immutable opening balance. Current balances are derived from the opening balance plus posted transactions and transfers. They are not independently edited after account creation. This avoids drift and preserves an audit trail.

Income adds to an account, expense subtracts from an account, and a transfer is represented once in `account_transfers` with source and destination accounts. Transfers never count as income or expense.

Money is stored as integer centavos. Display uses `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`.

Debt original balance is immutable. Current balance is deterministically recalculated from the original balance minus valid payments. Database mutation functions lock the debt row and recalculate after payment insert, update, or delete so balances cannot drift or become negative.

## Authentication and authorization

The server derives identity from a verified Supabase user or claims. Client-supplied user IDs are ignored. Every exposed user-owned table has RLS enabled and owner-scoped SELECT, INSERT, UPDATE, and DELETE policies. Update policies include both `USING` and `WITH CHECK`.

Service-role and OpenAI keys are server-only and optional during builds. The service role is reserved for controlled administrative tasks and is never used in browser code.

## Query and performance strategy

- Dashboard reads use bounded, server-side aggregation queries.
- Large lists use cursor or range pagination.
- PostgreSQL indexes cover ownership plus common date, status, and search filters.
- Private authenticated data is never globally cached.
- Charts receive small, pre-aggregated datasets and always have corresponding numeric summaries.

## Design system

Project Atlas uses map and navigation language as functional information architecture.

- Ink: `#070A0F`
- Charcoal: `#0E131C`
- Slate: `#182131`
- Paper: `#F4F7FB`
- Cobalt: `#3977F6`
- Signal blue: `#84AFFF`

Geist Sans carries interface text. Geist Mono carries money, dates, durations, IDs, and compact metrics. Corners are moderately rounded, borders are quiet, shadows are rare, and color never carries status alone.

The signature component is the **Dayline**: a compact route-like rail for “now, next, later” priorities. It explains why an item surfaced and turns recommendation logic into visible wayfinding instead of decoration.

Desktop uses a fixed navigation rail and content workspace. Mobile uses a bottom navigation bar and sheets for secondary actions. Keyboard focus is always visible and motion respects `prefers-reduced-motion`.

## Error model

Server boundaries return stable error codes for authentication, validation, permission, missing, duplicate, database, network, and unexpected failures. UI messages explain recovery without exposing SQL, stack traces, credentials, or internal identifiers.

## Future extension points

Future modules should add bounded tables, policies, queries, and navigation entries without sharing authorization shortcuts. AI Coach, CRM, reflections, knowledge, calendar, habits, opportunity scoring, decisions, files, and recurring automation are intentionally excluded from the MVP.
