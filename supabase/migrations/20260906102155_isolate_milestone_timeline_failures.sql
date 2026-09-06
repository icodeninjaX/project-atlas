-- Timeline recording is observational and must never prevent a user from
-- completing a milestone. Keep the shared timeline writer, but isolate any
-- audit failure from the source-table update.
create or replace function private.record_milestone_timeline_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  goal_name text;
begin
  if new.completed_at is null or old.completed_at is not null then
    return new;
  end if;

  begin
    select goal.title
      into goal_name
      from public.goals as goal
      where goal.id = new.goal_id
        and goal.user_id = new.user_id;

    perform private.upsert_timeline_activity(
      new.user_id,
      'goal_milestone_completed',
      'goal_milestones',
      new.id,
      timezone('Asia/Manila', new.completed_at)::date,
      new.completed_at,
      'timestamp',
      'goals',
      new.title,
      'Milestone for ' || coalesce(goal_name, 'goal'),
      null,
      null,
      null,
      null,
      '/goals?highlight=' || new.goal_id || '&milestone=' || new.id,
      'milestone:' || new.id || ':' || extract(epoch from new.completed_at)::text,
      jsonb_build_object('goal_id', new.goal_id)
    );
  exception
    when others then
      raise warning 'Could not record timeline activity for milestone %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists milestones_timeline_activity on public.goal_milestones;

create trigger milestones_timeline_activity
after update of completed_at on public.goal_milestones
for each row execute function private.record_milestone_timeline_activity();

revoke all on function private.record_milestone_timeline_activity()
  from public, anon, authenticated;
