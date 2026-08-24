begin;

create or replace function private.derive_goal_progress_from_milestones()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select coalesce(
    round(
      100.0 * count(*) filter (where milestone.completed_at is not null)
      / nullif(count(*), 0)
    ),
    0
  )::smallint
  into new.progress_percent
  from public.goal_milestones as milestone
  where milestone.goal_id = new.id
    and milestone.user_id = new.user_id;

  return new;
end;
$$;

create trigger goals_derive_progress_from_milestones
before insert or update of progress_percent on public.goals
for each row execute function private.derive_goal_progress_from_milestones();

create or replace function private.refresh_goal_progress_after_milestone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.goals
    set progress_percent = progress_percent
    where id = old.goal_id
      and user_id = old.user_id;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and (old.goal_id, old.user_id) is distinct from (new.goal_id, new.user_id) then
    update public.goals
    set progress_percent = progress_percent
    where id = old.goal_id
      and user_id = old.user_id;
  end if;

  update public.goals
  set progress_percent = progress_percent
  where id = new.goal_id
    and user_id = new.user_id;

  return new;
end;
$$;

create trigger goal_milestones_refresh_goal_progress
after insert or update of goal_id, user_id, completed_at or delete
on public.goal_milestones
for each row execute function private.refresh_goal_progress_after_milestone();

-- Backfill existing goals without making historical progress look newly updated.
alter table public.goals disable trigger goals_set_updated_at;
update public.goals set progress_percent = progress_percent;
alter table public.goals enable trigger goals_set_updated_at;

revoke all on function private.derive_goal_progress_from_milestones()
  from public, anon, authenticated;
revoke all on function private.refresh_goal_progress_after_milestone()
  from public, anon, authenticated;

commit;
