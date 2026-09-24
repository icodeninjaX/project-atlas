-- Keep AI request limits durable across server instances. The table stores no prompts.
create table public.ai_capture_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_capture_requests_user_created_idx
  on public.ai_capture_requests (user_id, created_at desc);
create index ai_capture_requests_created_idx
  on public.ai_capture_requests (created_at desc);

alter table public.ai_capture_requests enable row level security;
revoke all on table public.ai_capture_requests from anon, authenticated;

create or replace function public.reserve_ai_capture_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  reservation_time timestamptz := now();
begin
  if requesting_user is null then
    return false;
  end if;

  -- Serialize reservations across workers before checking user and site caps.
  perform pg_catalog.pg_advisory_xact_lock(6106, 1);

  if (select count(*) from public.ai_capture_requests
      where created_at >= reservation_time - interval '1 day') >= 300
     or (select count(*) from public.ai_capture_requests
      where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= 10
     or (select count(*) from public.ai_capture_requests
      where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= 30 then
    return false;
  end if;

  insert into public.ai_capture_requests(user_id) values (requesting_user);
  return true;
end;
$$;

revoke all on function public.reserve_ai_capture_request() from public, anon;
grant execute on function public.reserve_ai_capture_request() to authenticated;

-- Task creation did not previously appear in the activity timeline. Capture
-- confirmations use the normal task action, so record all task creations there.
create or replace function private.record_task_creation_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform private.upsert_timeline_activity(
      new.user_id, 'task_added', 'tasks', new.id,
      timezone('Asia/Manila', new.created_at)::date, new.created_at,
      'timestamp', 'tasks', new.title,
      coalesce(new.description, 'Task added'), null, null, null, null,
      '/tasks?highlight=' || new.id, 'task:' || new.id, '{}'::jsonb
    );
  exception when others then
    raise warning 'Could not record task creation activity for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger tasks_creation_activity
after insert on public.tasks
for each row execute function private.record_task_creation_activity();

revoke all on function private.record_task_creation_activity() from public, anon, authenticated;
