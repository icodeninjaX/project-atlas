# Hosted Graph and Freeform Analyst rollout — 2026-09-25

Environment: ProjectAtlas Supabase project `pcdrusgiwhezfodabchp` and
`https://atlas.kdvwebsiteservices.com` (production). This record uses Asia/Manila
dates. The live Vercel deployment is `dpl_CdnVSjsJj4mfqEH5QxmTiEnuLoTh`,
`READY`, with the production alias and commit
`d5cbed2987fd34b94c2820e9950a7aa3d43bdf2a` (Phase 11).

## Migration history

The Supabase connector applied the committed Graph SQL first, then the
freeform quota SQL. It assigned new online version numbers. The stored SQL and
repository files have matching MD5 hashes after whitespace normalization:

| Repository migration                           | Online version   | Normalized SQL MD5                 |
| ---------------------------------------------- | ---------------- | ---------------------------------- |
| `20260924100951_atlas_graph_relationships.sql` | `20260924161626` | `cf52053be905e99dc0ad5a2d3c81f94b` |
| `20260924154545_analyst_freeform_quota.sql`    | `20260924161640` | `487df8193133553810d4d0b6a3b8546d` |

Two older migration filename/version differences were also checked against
the online history. `20260906104326_index_knowledge_review_owner_fk.sql`
corresponds to online `20260906104334` (normalized SQL MD5
`0d7e318cc7da89a82d5fbf43e093b3df`), and
`20260906104433_normalize_knowledge_activity.sql` corresponds to online
`20260906134905` (normalized SQL MD5
`f3417446bb2004823e4fe91baa419e2e`). Their SQL was already applied;
neither was replayed. The repository filenames were left in place while other
local migration work is in progress. Before a future CLI push, reconcile these
four version mappings in a coordinated migration-history cleanup rather than
reapplying their SQL.

## Hosted checks

- Graph table exists with RLS and three policies. Signed-in users have
  select/insert/delete grants; update and anonymous access are denied. The
  count RPC is executable only by signed-in users. All seven endpoint cleanup
  triggers exist.
- A transaction-only, two-owner Graph check created a link, counted it through
  the RPC, confirmed the other owner saw zero links, and confirmed endpoint
  deletion removed the link. The transaction was rolled back and the temporary
  users and rows were confirmed absent.
- The Analyst ledger constraint and typed reservation function accept
  `freeform`. The reservation RPC is available to signed-in users and denied
  to anonymous users. A transaction-only test reserved seven freeform requests
  and one preset request; the ninth returned `hourly_quota`. The temporary user
  and ledger rows were confirmed absent after rollback.
- Production `/api/health` returned 200, unsigned `/analyst` redirected to
  `/login`, and unsigned `POST /api/analyst/freeform` returned 401. A refreshed
  signed-in production page displayed the Phase 11 freeform question box and
  consent control. No question was submitted from the existing personal account.

The hosted Supabase security advisor reports existing warnings on several
signed-in `SECURITY DEFINER` RPCs and disabled leaked-password protection, plus
informational RLS-without-policy notices on private ledger/delivery tables. It
reported no new Graph RLS warning. See Supabase's
[security advisor guidance](https://supabase.com/docs/guides/database/database-linter)
and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Open release check

A complete authenticated hosted Analyst and Graph browser flow with a
disposable login remains unverified. The available Supabase connector has no
Auth user creation operation. Creating a password through the hosted console
requires a user handoff under the computer-use credential rule. Use a confirmed
disposable account to test freeform consent, a real answer or grounded fallback,
citations, Graph linking, and mobile layout; delete that account afterward.
The local authenticated browser checks and synthetic live model evaluation are
recorded in the Phase 8 and Phase 11 contracts.
