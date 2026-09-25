create unique index tasks_id_owner_next_best_action_idx
  on public.tasks(id, user_id);

create table public.next_best_action_choices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null,
  expected_next_action_at timestamptz not null,
  choice text not null check (choice in ('dismissed', 'confirmed')),
  task_id uuid,
  created_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.job_applications(id, user_id) on delete cascade,
  foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete set null (task_id),
  unique (user_id, application_id, expected_next_action_at)
);

create index next_best_action_choices_owner_idx
  on public.next_best_action_choices(user_id, application_id);

alter table public.next_best_action_choices enable row level security;
alter table public.next_best_action_choices force row level security;

create policy "Owner reads next best action choices"
  on public.next_best_action_choices for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.next_best_action_choices from anon, authenticated;
grant select on public.next_best_action_choices to authenticated;

create or replace function public.choose_career_followup(
  p_application_id uuid,
  p_expected_next_action_at timestamptz,
  p_expected_updated_at timestamptz,
  p_choice text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_application public.job_applications%rowtype;
  v_task_id uuid;
  v_existing text;
  v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if v_owner is null then return 'unauthorized'; end if;
  if p_choice not in ('dismissed', 'confirmed') or p_choice is null
    or p_application_id is null or p_expected_next_action_at is null
    or p_expected_updated_at is null then
    return 'invalid';
  end if;

  select * into v_application
    from public.job_applications
   where id = p_application_id and user_id = v_owner
   for update;
  if not found then return 'stale'; end if;
  if v_application.stage in ('rejected', 'withdrawn', 'accepted')
    or v_application.next_action_at is distinct from p_expected_next_action_at
    or v_application.updated_at is distinct from p_expected_updated_at
    or (v_application.next_action_at at time zone 'Asia/Manila')::date > v_today + 3 then
    return 'stale';
  end if;

  select choice into v_existing
    from public.next_best_action_choices
   where user_id = v_owner and application_id = p_application_id
     and expected_next_action_at = p_expected_next_action_at;
  if found then return 'already_' || v_existing; end if;

  if p_choice = 'dismissed' then
    insert into public.next_best_action_choices
      (user_id, application_id, expected_next_action_at, choice)
    values (v_owner, p_application_id, p_expected_next_action_at, 'dismissed');
    return 'dismissed';
  end if;

  insert into public.tasks
    (user_id, title, description, status, priority, scheduled_for, source_module)
  values (
    v_owner,
    left(coalesce(nullif(btrim(v_application.next_action), ''),
      'Follow up with ' || v_application.company_name), 160),
    'Follow-up for ' || v_application.company_name || ' application.',
    'planned', 'high',
    greatest(v_today, (v_application.next_action_at at time zone 'Asia/Manila')::date),
    'next_best_action'
  ) returning id into v_task_id;

  insert into public.next_best_action_choices
    (user_id, application_id, expected_next_action_at, choice, task_id)
  values (v_owner, p_application_id, p_expected_next_action_at,
    'confirmed', v_task_id);
  return 'confirmed';
end;
$$;

revoke all on function public.choose_career_followup(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.choose_career_followup(uuid, timestamptz, timestamptz, text)
  to authenticated;
