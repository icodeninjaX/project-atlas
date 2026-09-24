# Hosted Graph and Freeform Analyst rollout — 2026-09-25

Environment: ProjectAtlas Supabase project `pcdrusgiwhezfodabchp` and
`https://atlas.kdvwebsiteservices.com` (production). This record uses Asia/Manila
dates. Phase 11 app code was deployed as
`d5cbed2987fd34b94c2820e9950a7aa3d43bdf2a`. The documentation-only
follow-up `fd4599a34319638822316f825860024e9642b935` reached `READY` on
Vercel with the production alias.

## Migration history

The Supabase connector applied the committed Graph SQL first, then the
freeform quota SQL. It assigned new online version numbers. Two earlier
migrations also had different repository and online version numbers. On
2026-09-25, the four repository files were renamed to match the hosted history:

| Original repository version | Repository and online version | Migration                         | Normalized SQL MD5                 |
| --------------------------- | ----------------------------- | --------------------------------- | ---------------------------------- |
| `20260906104326`            | `20260906104334`              | `index_knowledge_review_owner_fk` | `0d7e318cc7da89a82d5fbf43e093b3df` |
| `20260906104433`            | `20260906134905`              | `normalize_knowledge_activity`    | `f3417446bb2004823e4fe91baa419e2e` |
| `20260924100951`            | `20260924161626`              | `atlas_graph_relationships`       | `cf52053be905e99dc0ad5a2d3c81f94b` |
| `20260924154545`            | `20260924161640`              | `analyst_freeform_quota`          | `487df8193133553810d4d0b6a3b8546d` |

The SQL in each renamed file is unchanged. Each matches its hosted copy after
trimming trailing whitespace. Local migration history was updated to the same
versions while retaining its recorded SQL statements. No migration SQL was
replayed.

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
  `/login`, and unsigned `POST /api/analyst/freeform` returned 401.
- With explicit user approval, one freeform question about current goal progress
  was submitted from the user's main account. The hosted route reserved one
  `freeform` request and returned grounded claims citing four ATLAS facts. A
  citation opened its calculated evidence, date, completeness label, and source
  record link. The answer stated its historical-data limits. At a 390px test
  viewport, the evidence view had no horizontal overflow.
- The signed-in Graph page loaded the goal's native milestone relationships and
  searched Knowledge records. With explicit approval, one manual Knowledge to
  goal link was added, displayed as `Added manually`, and then removed through
  the confirmation control. The page returned to its original relationships.
  The link and unlink activity entries remain in the main account as agreed.
  The Graph page had no horizontal overflow at a 390px test viewport.

The hosted Supabase security advisor reports existing warnings on several
signed-in `SECURITY DEFINER` RPCs and disabled leaked-password protection, plus
informational RLS-without-policy notices on private ledger/delivery tables. It
reported no new Graph RLS warning. See Supabase's
[security advisor guidance](https://supabase.com/docs/guides/database/database-linter)
and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Release outcome and follow-up

The authenticated Analyst and Graph flows passed in production using the main
account after the user explicitly approved the data sharing and temporary link.
No temporary Graph link remains. This used one real Analyst allowance and left
the agreed link and unlink entries in activity history. The originally planned
disposable login was unavailable through the connected Supabase tooling; the
main-account run provided the hosted browser evidence instead. The local
authenticated browser checks and synthetic live model evaluation remain
recorded in the Phase 8 and Phase 11 contracts.

The four equivalent migration versions now match the hosted history. The later
Phase 12 migration and application release are separate from this Phase 8/11
closeout.
