-- Suggested Graph links the owner rejected for a goal, so the same suggestion is not offered again.
-- A dismissal never creates or removes a relationship; it only hides a suggestion.
create table public.atlas_relationship_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint atlas_relationship_dismissal_type check (
    entity_type in ('knowledge_concept', 'debt', 'job_application', 'transaction')
  ),
  constraint atlas_relationship_dismissal_unique unique (user_id, goal_id, entity_type, entity_id)
);

create index atlas_relationship_dismissal_goal_idx on public.atlas_relationship_dismissals(user_id, goal_id);

alter table public.atlas_relationship_dismissals enable row level security;
create policy atlas_relationship_dismissals_select on public.atlas_relationship_dismissals for select to authenticated
  using (user_id = (select auth.uid()));
create policy atlas_relationship_dismissals_insert on public.atlas_relationship_dismissals for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
  );
create policy atlas_relationship_dismissals_delete on public.atlas_relationship_dismissals for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "Require enrolled MFA" on public.atlas_relationship_dismissals as restrictive for all to authenticated
  using ((select public.has_required_assurance())) with check ((select public.has_required_assurance()));
revoke all on public.atlas_relationship_dismissals from anon, authenticated;
grant select, insert, delete on public.atlas_relationship_dismissals to authenticated;
