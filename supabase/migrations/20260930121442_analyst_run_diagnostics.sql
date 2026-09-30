-- How each Analyst answer went, in codes only (steps, outcomes, rule codes,
-- counts and timings): never the question, a figure, a record name or model
-- text. Owner-only; the application deletes rows older than 14 days.
create table public.analyst_run_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null check (status ~ '^[a-z_]{1,40}$'),
  outcome text not null check (outcome ~ '^[a-z_]{1,40}$'),
  duration_ms integer check (duration_ms between 0 and 600000),
  detail jsonb not null check (
    jsonb_typeof(detail) = 'object'
    and pg_catalog.pg_column_size(detail) <= 16384
  )
);

create index analyst_run_diagnostics_owner_recent
  on public.analyst_run_diagnostics (user_id, created_at desc);

alter table public.analyst_run_diagnostics enable row level security;
alter table public.analyst_run_diagnostics force row level security;

create policy "Owner reads Analyst diagnostics"
  on public.analyst_run_diagnostics for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owner stores Analyst diagnostics"
  on public.analyst_run_diagnostics for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owner deletes Analyst diagnostics"
  on public.analyst_run_diagnostics for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.analyst_run_diagnostics from anon, authenticated;
grant select, insert, delete on public.analyst_run_diagnostics to authenticated;
