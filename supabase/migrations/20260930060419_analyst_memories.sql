-- Priorities the owner asked Analyst to remember ("I'm saving for a
-- laptop"). Saved only after the owner confirms the exact text; never a
-- figure or amount; at most ten per owner; forgotten 90 days after they last
-- came up (the application stops reading older rows and deletes them).
create table public.analyst_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (
    char_length(text) between 3 and 160
    and text !~ '[0-9₱$€£¥]'
  ),
  created_at timestamptz not null default now(),
  last_mentioned_at timestamptz not null default now()
);

create index analyst_memories_owner_recent
  on public.analyst_memories (user_id, last_mentioned_at desc);

alter table public.analyst_memories enable row level security;
alter table public.analyst_memories force row level security;

create policy "Owner reads Analyst memories"
  on public.analyst_memories for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owner stores Analyst memories"
  on public.analyst_memories for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owner refreshes Analyst memories"
  on public.analyst_memories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owner deletes Analyst memories"
  on public.analyst_memories for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.analyst_memories from anon, authenticated;
grant select, insert, delete on public.analyst_memories to authenticated;
-- Only the last mention can change; the text is never edited in place.
grant update (last_mentioned_at) on public.analyst_memories to authenticated;

-- At most ten priorities per owner.
create function public.analyst_memories_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    select count(*) from public.analyst_memories where user_id = new.user_id
  ) >= 10 then
    raise exception 'Analyst keeps at most ten priorities'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger analyst_memories_limit
  before insert on public.analyst_memories
  for each row execute function public.analyst_memories_limit();
