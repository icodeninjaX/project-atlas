-- The latest "this month so far" summary per owner, so Analyst works it out
-- at most once a day rather than on every page view. One row per owner,
-- replaced when a new day's summary is made. The body is the checked
-- answer the owner was shown (its figures and the owner's own category
-- labels); `consent_key` records the consent it was made under, so a
-- summary is never shown under a different consent. A run first claims the
-- day's slot (`claim_analyst_digest`), so two views at once cannot both run
-- and be charged; `state` is 'running' until the run's answer is saved.
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
  state text not null default 'ready' check (state in ('running', 'ready')),
  claimed_at timestamptz not null default now(),
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

-- Claims today's summary for the signed-in owner under this consent, in one
-- statement: it succeeds only when the kept summary is from another day or
-- consent, or a claimed run was abandoned (running for over two minutes;
-- a run is bounded at one minute). A concurrent claim waits on the row lock
-- and then sees the claim, so exactly one of them runs.
create function public.claim_analyst_digest(p_day date, p_consent_key text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claimed boolean;
begin
  insert into public.analyst_digests as d
    (user_id, day, consent_key, body, state, claimed_at)
  values
    ((select auth.uid()), p_day, p_consent_key, '{}'::jsonb, 'running', now())
  on conflict (user_id) do update
    set day = excluded.day,
        consent_key = excluded.consent_key,
        body = '{}'::jsonb,
        state = 'running',
        claimed_at = now()
    where d.day <> excluded.day
       or d.consent_key <> excluded.consent_key
       or (d.state = 'running' and d.claimed_at < now() - interval '2 minutes')
  returning true into v_claimed;
  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_analyst_digest(date, text) from public, anon;
grant execute on function public.claim_analyst_digest(date, text) to authenticated;
