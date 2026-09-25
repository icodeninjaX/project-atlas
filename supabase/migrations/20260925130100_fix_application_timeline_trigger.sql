-- Application inserts reach task-only fields in the shared timeline trigger.
-- Keep the existing application events while isolating their row shape.
create or replace function private.record_application_timeline_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.upsert_timeline_activity(
    new.user_id, 'career_application_added', 'job_applications', new.id,
    timezone('Asia/Manila', new.created_at)::date, new.created_at, 'timestamp', 'career',
    new.company_name || ' · ' || new.role_title, 'Stage: ' || replace(new.stage, '_', ' '),
    null, null, null, null, '/career?view=table&highlight=' || new.id,
    'application:' || new.id, jsonb_build_object('stage', new.stage)
  );
  if tg_op = 'UPDATE' and new.stage <> old.stage then
    perform private.upsert_timeline_activity(
      new.user_id, 'job_stage_changed', 'job_applications', new.id,
      timezone('Asia/Manila', timezone('utc', now()))::date, timezone('utc', now()), 'timestamp', 'career',
      new.company_name || ' · ' || new.role_title,
      'Stage: ' || replace(old.stage, '_', ' ') || ' → ' || replace(new.stage, '_', ' '),
      null, null, null, null, '/career?view=table&highlight=' || new.id,
      null, jsonb_build_object('from', old.stage, 'to', new.stage)
    );
  end if;
  return new;
end;
$$;

drop trigger applications_timeline_activity on public.job_applications;
create trigger applications_timeline_activity
after insert or update of company_name, role_title, stage
on public.job_applications for each row
execute function private.record_application_timeline_activity();

revoke all on function private.record_application_timeline_activity()
  from public, anon, authenticated;
