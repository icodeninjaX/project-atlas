-- Opt-in for preparing last week's evidence-checked insight automatically
-- when the owner opens Weekly reviews, and owner-only storage for it.
alter table public.user_preferences
  add column weekly_insight_auto boolean not null default false;

create table public.weekly_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  status text not null check (status in ('answered', 'insufficient')),
  claims jsonb not null default '[]'::jsonb check (jsonb_typeof(claims) = 'array'),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  created_at timestamptz not null default now(),
  unique (user_id, week_start),
  check (
    pg_catalog.pg_column_size(claims)
      + pg_catalog.pg_column_size(evidence)
      + pg_catalog.pg_column_size(limitations) <= 65536
  )
);

alter table public.weekly_insights enable row level security;
alter table public.weekly_insights force row level security;

create policy "Owner reads weekly insights"
  on public.weekly_insights for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owner stores weekly insights"
  on public.weekly_insights for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owner deletes weekly insights"
  on public.weekly_insights for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.weekly_insights from anon, authenticated;
grant select, insert, delete on public.weekly_insights to authenticated;
