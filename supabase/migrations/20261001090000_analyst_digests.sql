-- The latest "this month so far" summary per owner, so Analyst works it out
-- at most once a day rather than on every page view. One row per owner,
-- replaced when a new day's summary is made. The body is the checked
-- answer the owner was shown (its figures and the owner's own category
-- labels); `consent_key` records the consent it was made under, so a
-- summary is never shown under a different consent.
create table public.analyst_digests (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  consent_key text not null check (
    consent_key ~ '^[a-z_,:]+$' and char_length(consent_key) <= 400
  ),
  body jsonb not null check (
    jsonb_typeof(body) = 'object'
    and pg_catalog.pg_column_size(body) <= 131072
  ),
  created_at timestamptz not null default now()
);

alter table public.analyst_digests enable row level security;
alter table public.analyst_digests force row level security;

create policy "Owner reads Analyst digest"
  on public.analyst_digests for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owner stores Analyst digest"
  on public.analyst_digests for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owner replaces Analyst digest"
  on public.analyst_digests for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owner deletes Analyst digest"
  on public.analyst_digests for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.analyst_digests from anon, authenticated;
grant select, insert, update, delete on public.analyst_digests to authenticated;
