# Database

## Migration

`supabase/migrations/20260726082930_initial_schema.sql` creates the complete MVP data model:

- profiles and user preferences
- financial accounts, categories, transactions, transfers, monthly budgets, and budget items
- debts and debt payments
- tasks, goals, and milestones
- job applications and stage events
- weekly reviews, pinned priorities, and activity history

All money uses signed `bigint` centavos. Timestamps use `timestamptz` and are written in UTC. User-facing date-only values use `date`.

## Accounting decisions

An account stores `opening_balance_centavos`. `financial_account_balances` is a `security_invoker` view that derives the current balance from the opening balance, income, expenses, and one-sided transfer movement. Transfers are stored once in `account_transfers`; they do not enter income or expense totals.

Debt balances are recalculated inside PostgreSQL after every payment insert, update, or delete. The debt row is locked briefly, the sum is recomputed from the original balance, overpayment is rejected, and paid/active status is reconciled.

## Ownership integrity

Child tables use composite foreign keys such as `(account_id, user_id)` so a guessed ID cannot connect one user’s child row to another user’s parent row. Foreign-key and owner/filter columns are indexed.

## Applying locally

The Supabase CLI is pinned as a development dependency. Start a dedicated
development project, then run:

```bash
npm run supabase:start
npm run supabase:reset
```

`db reset` applies migrations and attempts `supabase/seed.sql`. The seed waits for a development auth user and skips safely if none exists. To load the fictional demo records, sign up through the local application, then run `supabase/seed.sql` once in the local Supabase Studio SQL editor. Re-running it is idempotent.

## Database tests

Run the pgTAP file only in a disposable local/test database:

```bash
npm run supabase:test
```

The test creates two fictional auth users inside a transaction, proves owner and cross-user behavior, and verifies debt payment insert, edit, delete, paid, and reopen behavior before rolling back.

## Generated types

After linking a test project:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

The current application intentionally uses the SDK’s ungenerated types so a build does not require a live project. Generated types are the recommended next database hardening step after the migration is executed.
