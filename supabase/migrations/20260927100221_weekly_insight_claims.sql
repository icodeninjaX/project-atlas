-- Claim each owner's weekly insight before any quota or provider call, so
-- concurrent first visits cannot both send data and a provider attempt is
-- final for that week. Only a pending claim can be completed; finished rows
-- stay read-only.
alter table public.weekly_insights
  drop constraint weekly_insights_status_check;
alter table public.weekly_insights
  add constraint weekly_insights_status_check
  check (status in ('pending', 'answered', 'insufficient', 'failed'));
alter table public.weekly_insights
  alter column evidence set default '[]'::jsonb;

create policy "Owner completes a pending weekly insight"
  on public.weekly_insights for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status <> 'pending');

grant update (status, claims, evidence, limitations)
  on public.weekly_insights to authenticated;
