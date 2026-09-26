-- Phase 19: decisions are user-authored records, never inferred from activity.
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  decision_on date not null,
  intent text not null check (char_length(btrim(intent)) between 1 and 1000),
  expected_outcome text not null check (char_length(btrim(expected_outcome)) between 1 and 1000),
  rationale text check (rationale is null or char_length(rationale) <= 2000),
  assumptions text check (assumptions is null or char_length(assumptions) <= 2000),
  review_on date not null,
  goal_id uuid,
  action_task_id uuid,
  metric_key text check (metric_key is null or metric_key in
    ('income_centavos', 'expense_centavos', 'debt_payments_centavos',
     'task_completions', 'knowledge_reviews')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decisions_review_after_decision check (review_on > decision_on),
  constraint decisions_owner_key unique (id, user_id),
  constraint decisions_goal_owner foreign key (goal_id, user_id)
    references public.goals(id, user_id) on delete set null (goal_id),
  constraint decisions_action_task_owner foreign key (action_task_id, user_id)
    references public.tasks(id, user_id) on delete set null (action_task_id)
);

create index decisions_owner_date_idx on public.decisions(user_id, decision_on desc, id);
create index decisions_owner_review_idx on public.decisions(user_id, review_on)
  where review_on is not null;
create trigger decisions_set_updated_at before update on public.decisions
  for each row execute function private.set_updated_at();

alter table public.decisions enable row level security;
create policy decisions_select on public.decisions for select to authenticated
  using (user_id = (select auth.uid()));
create policy decisions_insert on public.decisions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy decisions_update on public.decisions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy decisions_delete on public.decisions for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.decisions from anon, authenticated;
grant select, insert, update, delete on public.decisions to authenticated;

-- Notes are explicit observations. They are not a claim of impact or causation.
create table public.decision_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  decision_id uuid not null,
  observed_on date not null,
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  source_task_id uuid,
  source_transaction_id uuid,
  source_application_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_observations_decision_owner foreign key (decision_id, user_id)
    references public.decisions(id, user_id) on delete cascade,
  constraint decision_observations_one_source check
    (num_nonnulls(source_task_id, source_transaction_id, source_application_id) <= 1),
  constraint decision_observations_task_owner foreign key (source_task_id, user_id)
    references public.tasks(id, user_id) on delete set null (source_task_id),
  constraint decision_observations_transaction_owner foreign key (source_transaction_id, user_id)
    references public.transactions(id, user_id) on delete set null (source_transaction_id),
  constraint decision_observations_application_owner foreign key (source_application_id, user_id)
    references public.job_applications(id, user_id) on delete set null (source_application_id)
);
create index decision_observations_owner_decision_idx
  on public.decision_observations(user_id, decision_id, observed_on desc, id);
create trigger decision_observations_set_updated_at before update on public.decision_observations
  for each row execute function private.set_updated_at();
alter table public.decision_observations enable row level security;
create policy decision_observations_select on public.decision_observations for select to authenticated
  using (user_id = (select auth.uid()));
create policy decision_observations_insert on public.decision_observations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy decision_observations_update on public.decision_observations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy decision_observations_delete on public.decision_observations for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.decision_observations from anon, authenticated;
grant select, insert, update, delete on public.decision_observations to authenticated;

-- Keep notes in sequence even when a decision date is revised later.
create function private.validate_decision_observation_date()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare decision_date date;
begin
  select d.decision_on into decision_date from public.decisions d
  where d.id = new.decision_id and d.user_id = new.user_id for key share;
  if decision_date is null then
    raise exception 'Decision unavailable' using errcode = '23503';
  end if;
  if new.observed_on < decision_date then
    raise exception 'Observation precedes decision' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Inspectable, bounded source rows for the same Phase 12 metric semantics.
create function public.decision_metric_sources(
  p_metric text, p_from date, p_through date, p_limit integer default 51
)
returns table (
  source_type text, source_id uuid, occurred_on date,
  title text, amount_centavos bigint, source_href text
)
language plpgsql stable security invoker set search_path = '' as $$
declare today_manila date := timezone('Asia/Manila', now())::date;
begin
  if (select auth.uid()) is null
    or p_metric not in ('income_centavos', 'expense_centavos',
      'debt_payments_centavos', 'task_completions', 'knowledge_reviews')
    or p_from is null or p_through is null or p_from > p_through
    or p_from < today_manila - 365 or p_through >= today_manila
    or p_through - p_from > 30 or p_limit < 1 or p_limit > 101 then
    raise exception 'Invalid decision source request' using errcode = '22023';
  end if;

  return query
  with sources as (
    select 'transaction'::text as kind, t.id as record_id,
      t.transaction_date as record_on,
      left(coalesce(nullif(t.merchant_or_source, ''), nullif(t.description, ''),
        initcap(t.transaction_type)), 160) as record_title,
      t.amount_centavos::bigint as amount,
      '/money/transactions?highlight=' || t.id as href
    from public.transactions t
    where p_metric in ('income_centavos', 'expense_centavos')
      and t.user_id = (select auth.uid())
      and t.transaction_type = case p_metric
        when 'income_centavos' then 'income' else 'expense' end
      and t.transaction_date between p_from and p_through
    union all
    select 'debt_payment', p.id, p.payment_date,
      'Debt payment'::text, p.amount_centavos::bigint,
      '/debts/' || p.debt_id || '?highlightPayment=' || p.id
    from public.debt_payments p
    where p_metric = 'debt_payments_centavos'
      and p.user_id = (select auth.uid())
      and p.payment_date between p_from and p_through
    union all
    select 'task', t.id, timezone('Asia/Manila', t.completed_at)::date,
      left(t.title, 160), null::bigint,
      '/tasks?view=completed&highlight=' || t.id
    from public.tasks t
    where p_metric = 'task_completions'
      and t.user_id = (select auth.uid())
      and t.status = 'completed' and t.completed_at is not null
      and t.completed_at >= (p_from::timestamp at time zone 'Asia/Manila')
      and t.completed_at < ((p_through + 1)::timestamp at time zone 'Asia/Manila')
    union all
    select 'knowledge_review', r.id,
      timezone('Asia/Manila', r.reviewed_at)::date,
      left('Review: ' || c.title, 160), null::bigint,
      '/knowledge?highlight=' || r.concept_id
    from public.knowledge_reviews r
    join public.knowledge_concepts c
      on c.id = r.concept_id and c.user_id = r.user_id
    where p_metric = 'knowledge_reviews'
      and r.user_id = (select auth.uid())
      and r.reviewed_at >= (p_from::timestamp at time zone 'Asia/Manila')
      and r.reviewed_at < ((p_through + 1)::timestamp at time zone 'Asia/Manila')
  )
  select kind, record_id, record_on, record_title, amount, href
  from sources order by record_on desc, record_id desc limit p_limit;
end;
$$;
revoke all on function public.decision_metric_sources(text,date,date,integer) from public, anon;
grant execute on function public.decision_metric_sources(text,date,date,integer) to authenticated;

create or replace function public.atlas_goal_relationship_counts(p_goal_ids uuid[])
returns table(goal_id uuid, entity_type text, relationship_count bigint)
language sql security invoker set search_path = '' stable as $$
  select links.goal_id, links.entity_type, count(*) from (
    select t.related_goal_id as goal_id, 'task'::text as entity_type
      from public.tasks t where t.user_id = (select auth.uid())
        and t.related_goal_id = any(p_goal_ids[1:200])
    union all
    select m.goal_id, 'goal_milestone'::text
      from public.goal_milestones m where m.user_id = (select auth.uid())
        and m.goal_id = any(p_goal_ids[1:200])
    union all
    select r.target_id, r.source_type
      from public.atlas_relationships r where r.user_id = (select auth.uid())
        and r.target_type = 'goal' and r.target_id = any(p_goal_ids[1:200])
    union all
    select d.goal_id, 'decision'::text
      from public.decisions d where d.user_id = (select auth.uid())
        and d.goal_id = any(p_goal_ids[1:200])
  ) links
  join public.goals g on g.id = links.goal_id and g.user_id = (select auth.uid())
  group by links.goal_id, links.entity_type;
$$;
revoke all on function private.validate_decision_observation_date() from public;
create trigger decision_observation_date_guard before insert or update
  on public.decision_observations for each row
  execute function private.validate_decision_observation_date();

create function private.validate_decision_date_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.decision_on > old.decision_on and exists (
    select 1 from public.decision_observations o
    where o.decision_id = old.id and o.user_id = old.user_id
      and o.observed_on < new.decision_on
  ) then
    raise exception 'Decision date follows an observation' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_decision_date_revision() from public;
create trigger decision_date_revision_guard before update of decision_on
  on public.decisions for each row
  execute function private.validate_decision_date_revision();

-- Preserve earlier user-stated plans so edits do not silently rewrite history.
create table public.decision_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision_id uuid not null,
  previous_title text not null,
  previous_decision_on date not null,
  previous_intent text not null,
  previous_expected_outcome text not null,
  previous_review_on date not null,
  previous_goal_id uuid,
  previous_action_task_id uuid,
  previous_metric_key text,
  changed_at timestamptz not null default now(),
  foreign key (decision_id, user_id)
    references public.decisions(id, user_id) on delete cascade
);
create index decision_revisions_owner_decision_idx
  on public.decision_revisions(user_id, decision_id, changed_at desc);
alter table public.decision_revisions enable row level security;
create policy decision_revisions_select on public.decision_revisions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.decision_revisions from anon, authenticated;
grant select on public.decision_revisions to authenticated;

create function private.record_decision_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.title, old.decision_on, old.intent, old.expected_outcome,
         old.review_on, old.goal_id, old.action_task_id, old.metric_key)
    is distinct from
     row(new.title, new.decision_on, new.intent, new.expected_outcome,
         new.review_on, new.goal_id, new.action_task_id, new.metric_key) then
    insert into public.decision_revisions(
      user_id, decision_id, previous_title, previous_decision_on,
      previous_intent, previous_expected_outcome, previous_review_on,
      previous_goal_id, previous_action_task_id, previous_metric_key
    ) values (
      old.user_id, old.id, old.title, old.decision_on, old.intent,
      old.expected_outcome, old.review_on, old.goal_id,
      old.action_task_id, old.metric_key
    );
  end if;
  return new;
end;
$$;
revoke all on function private.record_decision_revision() from public;
create trigger decisions_record_revision before update on public.decisions
  for each row execute function private.record_decision_revision();

-- A decision and its observations appear in Life Timeline while their source
-- exists. Deletion also removes the activity snapshot for privacy.
create function private.record_decision_timeline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare decision_title text;
begin
  if tg_op = 'DELETE' then
    delete from public.activity_log
    where user_id = old.user_id and source_key =
      case tg_table_name when 'decisions' then 'decision:' else 'decision-observation:' end || old.id;
    return old;
  end if;
  if tg_table_name = 'decisions' then
    perform private.upsert_timeline_activity(
      new.user_id, 'decision_recorded', 'decisions', new.id,
      new.decision_on, new.created_at, 'date', 'decisions',
      new.title, 'Decision recorded', null, null, null, null,
      '/decisions/' || new.id, 'decision:' || new.id, '{}'::jsonb
    );
  else
    select d.title into decision_title from public.decisions d
    where d.id = new.decision_id and d.user_id = new.user_id;
    perform private.upsert_timeline_activity(
      new.user_id, 'decision_observation', 'decision_observations', new.id,
      new.observed_on, new.created_at, 'date', 'decisions',
      'Observation for ' || coalesce(decision_title, 'decision'),
      'User-recorded observation', null, null, null, null,
      '/decisions/' || new.decision_id, 'decision-observation:' || new.id, '{}'::jsonb
    );
  end if;
  return new;
end;
$$;
revoke all on function private.record_decision_timeline() from public;
create trigger decisions_timeline after insert or update or delete on public.decisions
  for each row execute function private.record_decision_timeline();
create trigger decision_observations_timeline after insert or update or delete on public.decision_observations
  for each row execute function private.record_decision_timeline();

create or replace function public.life_timeline(
  p_query text default null,
  p_module text default null,
  p_from_date date default null,
  p_to_date date default null,
  p_before_on date default null,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 31
)
returns table (
  event_id uuid, occurred_on date, occurred_at timestamptz,
  occurred_precision text, module text, event_type text, title text,
  description text, amount_centavos bigint, amount_direction text,
  metric_label text, metric_value text, source_href text,
  source_available boolean
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_query text := nullif(btrim(p_query), '');
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_module is not null and p_module not in
    ('money', 'debt', 'tasks', 'goals', 'career', 'reviews', 'decisions') then
    raise exception 'Invalid timeline module';
  end if;
  if p_limit < 1 or p_limit > 51 then raise exception 'Invalid timeline limit'; end if;
  if normalized_query is not null and char_length(normalized_query) > 120 then
    raise exception 'Timeline search is too long';
  end if;
  if p_from_date is not null and p_to_date is not null and p_from_date > p_to_date then
    raise exception 'Timeline date range is invalid';
  end if;
  if (p_before_on is null) <> (p_before_at is null)
    or (p_before_on is null) <> (p_before_id is null) then
    raise exception 'Timeline cursor is incomplete';
  end if;

  return query
  with scoped as (
    select activity.*,
      case activity.entity_type
        when 'transactions' then exists (
          select 1 from public.transactions source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'account_transfers' then exists (
          select 1 from public.account_transfers source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'debt_payments' then exists (
          select 1 from public.debt_payments source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'tasks' then exists (
          select 1 from public.tasks source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'goals' then exists (
          select 1 from public.goals source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'goal_milestones' then exists (
          select 1 from public.goal_milestones source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'job_applications' then exists (
          select 1 from public.job_applications source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'weekly_reviews' then exists (
          select 1 from public.weekly_reviews source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'decisions' then exists (
          select 1 from public.decisions source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'decision_observations' then exists (
          select 1 from public.decision_observations source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        else false
      end as source_available
    from public.activity_log as activity
    where activity.user_id = caller_id
      and activity.module in
        ('money', 'debt', 'tasks', 'goals', 'career', 'reviews', 'decisions')
      and (p_module is null or activity.module = p_module)
      and (p_from_date is null or activity.occurred_on >= p_from_date)
      and (p_to_date is null or activity.occurred_on <= p_to_date)
      and (normalized_query is null or concat_ws(' ', activity.title, activity.description) ilike '%' || normalized_query || '%')
      and (p_before_on is null or (activity.occurred_on, activity.occurred_at, activity.id) < (p_before_on, p_before_at, p_before_id))
  )
  select id, occurred_on, occurred_at, occurred_precision, module, action,
    title, description, amount_centavos, amount_direction, metric_label,
    metric_value, case when source_available then source_href else null end,
    source_available
  from scoped
  order by occurred_on desc, occurred_at desc, id desc
  limit p_limit;
end;
$$;
