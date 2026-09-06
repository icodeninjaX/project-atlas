create table public.knowledge_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  notes text not null check (char_length(notes) between 1 and 10000),
  category text not null check (char_length(category) between 1 and 80),
  tags text[] not null default '{}',
  example text check (char_length(example) <= 2000),
  personal_explanation text check (char_length(personal_explanation) <= 2000),
  confidence smallint not null default 1 check (confidence between 1 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  interval_days integer not null default 0 check (interval_days >= 0),
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  check (cardinality(tags) <= 12)
);

create table public.knowledge_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null,
  outcome text not null check (outcome in ('again', 'hard', 'good', 'easy')),
  recalled_answer text check (char_length(recalled_answer) <= 5000),
  previous_interval_days integer not null check (previous_interval_days >= 0),
  next_interval_days integer not null check (next_interval_days >= 0),
  reviewed_at timestamptz not null default timezone('utc', now()),
  next_review_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (concept_id, user_id) references public.knowledge_concepts(id, user_id) on delete cascade
);

create index knowledge_concepts_user_due_idx
  on public.knowledge_concepts(user_id, next_review_at)
  where archived_at is null;
create index knowledge_concepts_user_recent_idx
  on public.knowledge_concepts(user_id, created_at desc)
  where archived_at is null;
create index knowledge_concepts_search_idx on public.knowledge_concepts using gin
  ((title || ' ' || notes || ' ' || category) extensions.gin_trgm_ops);
create index knowledge_concepts_tags_idx
  on public.knowledge_concepts using gin(tags);
create index knowledge_reviews_concept_date_idx
  on public.knowledge_reviews(concept_id, reviewed_at desc);
create index knowledge_reviews_user_date_idx
  on public.knowledge_reviews(user_id, reviewed_at desc);

create trigger knowledge_concepts_set_updated_at before update on public.knowledge_concepts
  for each row execute function private.set_updated_at();

alter table public.knowledge_concepts enable row level security;
alter table public.knowledge_reviews enable row level security;

create policy knowledge_concepts_select on public.knowledge_concepts for select to authenticated
  using (user_id = (select auth.uid()));
create policy knowledge_concepts_insert on public.knowledge_concepts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy knowledge_concepts_update on public.knowledge_concepts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy knowledge_concepts_delete on public.knowledge_concepts for delete to authenticated
  using (user_id = (select auth.uid()));
create policy knowledge_reviews_select on public.knowledge_reviews for select to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.knowledge_concepts to authenticated;
grant select on public.knowledge_reviews to authenticated;

create or replace function public.review_knowledge_concept(
  p_concept_id uuid,
  p_outcome text,
  p_recalled_answer text default null
)
returns table (next_review_at timestamptz, interval_days integer, confidence smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  concept public.knowledge_concepts%rowtype;
  reviewed_at timestamptz := timezone('utc', now());
  next_interval integer;
  next_at timestamptz;
  next_confidence smallint;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_outcome not in ('again', 'hard', 'good', 'easy') then raise exception 'Invalid review outcome'; end if;
  if char_length(coalesce(p_recalled_answer, '')) > 5000 then raise exception 'Recall answer is too long'; end if;

  select * into concept from public.knowledge_concepts
  where id = p_concept_id and user_id = caller_id and archived_at is null for update;
  if not found then raise exception 'Knowledge concept not found'; end if;

  if p_outcome = 'again' then
    next_interval := 0;
    next_at := reviewed_at + interval '10 minutes';
    next_confidence := greatest(1, concept.confidence - 1);
  elsif p_outcome = 'hard' then
    next_interval := greatest(1, round(greatest(1, concept.interval_days) * 1.2)::integer);
    next_at := reviewed_at + make_interval(days => next_interval);
    next_confidence := concept.confidence;
  elsif p_outcome = 'good' then
    next_interval := greatest(3, round(greatest(1, concept.interval_days) * 2.2)::integer);
    next_at := reviewed_at + make_interval(days => next_interval);
    next_confidence := least(5, concept.confidence + 1);
  else
    next_interval := greatest(7, round(greatest(1, concept.interval_days) * 3.5)::integer);
    next_at := reviewed_at + make_interval(days => next_interval);
    next_confidence := least(5, concept.confidence + 2);
  end if;

  insert into public.knowledge_reviews(
    user_id, concept_id, outcome, recalled_answer, previous_interval_days,
    next_interval_days, reviewed_at, next_review_at
  ) values (
    caller_id, concept.id, p_outcome, nullif(btrim(p_recalled_answer), ''),
    concept.interval_days, next_interval, reviewed_at, next_at
  );

  update public.knowledge_concepts set
    confidence = next_confidence,
    review_count = review_count + 1,
    interval_days = next_interval,
    last_reviewed_at = reviewed_at,
    next_review_at = next_at
  where id = concept.id and user_id = caller_id;

  insert into public.activity_log(
    user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at,
    occurred_precision, module, title, description, source_href
  ) values (
    caller_id, 'knowledge_reviewed', 'knowledge_concepts', concept.id,
    jsonb_build_object('outcome', p_outcome, 'next_interval_days', next_interval),
    timezone('Asia/Manila', reviewed_at)::date, reviewed_at, 'timestamp', 'knowledge',
    concept.title, 'Recall rated ' || initcap(p_outcome), '/knowledge?highlight=' || concept.id
  );

  return query select next_at, next_interval, next_confidence;
end;
$$;

revoke all on function public.review_knowledge_concept(uuid, text, text) from public, anon;
grant execute on function public.review_knowledge_concept(uuid, text, text) to authenticated;

create or replace function private.record_knowledge_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or (select auth.uid()) <> new.user_id then
    raise exception 'Knowledge activity ownership mismatch';
  end if;
  if tg_op = 'INSERT' then
    insert into public.activity_log(
      user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at,
      occurred_precision, module, title, description, source_href
    ) values (
      new.user_id, 'knowledge_created', 'knowledge_concepts', new.id,
      jsonb_build_object('category', new.category),
      timezone('Asia/Manila', new.created_at)::date, new.created_at, 'timestamp',
      'knowledge', new.title, 'Concept added to ' || new.category,
      '/knowledge?highlight=' || new.id
    );
  elsif new.archived_at is not null and old.archived_at is null then
    insert into public.activity_log(
      user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at,
      occurred_precision, module, title, description, source_href
    ) values (
      new.user_id, 'knowledge_archived', 'knowledge_concepts', new.id, '{}'::jsonb,
      timezone('Asia/Manila', new.archived_at)::date, new.archived_at, 'timestamp',
      'knowledge', new.title, 'Concept archived', '/knowledge?view=archived&highlight=' || new.id
    );
  elsif new.archived_at is null and old.archived_at is not null then
    insert into public.activity_log(
      user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at,
      occurred_precision, module, title, description, source_href
    ) values (
      new.user_id, 'knowledge_restored', 'knowledge_concepts', new.id, '{}'::jsonb,
      timezone('Asia/Manila', new.updated_at)::date, new.updated_at, 'timestamp',
      'knowledge', new.title, 'Concept restored', '/knowledge?highlight=' || new.id
    );
  end if;
  return new;
end;
$$;

create trigger knowledge_concepts_activity after insert or update of archived_at
  on public.knowledge_concepts for each row execute function private.record_knowledge_activity();

revoke all on function private.record_knowledge_activity() from public, anon, authenticated;

create or replace function public.search_atlas(
  p_query text, p_limit integer default 40, p_entity_type text default 'all',
  p_status text default 'all', p_from_date date default null, p_to_date date default null
)
returns table (entity_type text, entity_id uuid, title text, subtitle text,
  occurred_at timestamptz, entity_path text, entity_status text)
language sql stable security invoker set search_path = '' as $$
  select result.* from (
    select 'Tasks'::text, t.id, t.title, coalesce(t.description, t.status), t.updated_at,
      '/tasks?highlight=' || t.id, t.status from public.tasks t where t.user_id = (select auth.uid())
      and (t.title ilike '%' || p_query || '%' or coalesce(t.description, '') ilike '%' || p_query || '%')
    union all select 'Goals', g.id, g.title, coalesce(g.description, g.area), g.updated_at,
      '/goals?highlight=' || g.id, g.status from public.goals g where g.user_id = (select auth.uid())
      and (g.title ilike '%' || p_query || '%' or coalesce(g.description, '') ilike '%' || p_query || '%')
    union all select 'Debts', d.id, d.creditor_name, d.debt_type, d.updated_at,
      '/debts?highlight=' || d.id, d.status from public.debts d where d.user_id = (select auth.uid()) and d.creditor_name ilike '%' || p_query || '%'
    union all select 'Transactions', t.id, coalesce(t.merchant_or_source, 'Transaction'), coalesce(t.description, t.transaction_type), t.updated_at,
      '/money/transactions?highlight=' || t.id, t.transaction_type from public.transactions t where t.user_id = (select auth.uid())
      and (coalesce(t.merchant_or_source, '') ilike '%' || p_query || '%' or coalesce(t.description, '') ilike '%' || p_query || '%')
    union all select 'Career', j.id, j.company_name || ' · ' || j.role_title, coalesce(j.next_action, j.stage), j.updated_at,
      '/career?highlight=' || j.id, j.stage from public.job_applications j where j.user_id = (select auth.uid())
      and (j.company_name ilike '%' || p_query || '%' or j.role_title ilike '%' || p_query || '%' or coalesce(j.notes, '') ilike '%' || p_query || '%')
    union all select 'Reviews', w.id, 'Week of ' || w.week_start::text, coalesce(w.next_week_focus, w.wins, 'Weekly review'), w.updated_at,
      '/reviews?highlight=' || w.id, 'submitted' from public.weekly_reviews w where w.user_id = (select auth.uid())
      and concat_ws(' ', w.wins, w.challenges, w.lessons, w.next_week_focus) ilike '%' || p_query || '%'
    union all select 'Knowledge', k.id, k.title, k.category, k.updated_at,
      '/knowledge?highlight=' || k.id, case when k.archived_at is null then 'active' else 'archived' end
      from public.knowledge_concepts k where k.user_id = (select auth.uid())
      and concat_ws(' ', k.title, k.notes, k.category, array_to_string(k.tags, ' ')) ilike '%' || p_query || '%'
  ) result(entity_type, entity_id, title, subtitle, occurred_at, entity_path, entity_status)
  where (lower(p_entity_type) = 'all' or lower(result.entity_type) = lower(p_entity_type))
    and (p_from_date is null or result.occurred_at >= p_from_date::timestamptz)
    and (p_to_date is null or result.occurred_at < (p_to_date + 1)::timestamptz)
    and (lower(p_status) = 'all' or lower(result.entity_status) = lower(p_status)
      or (lower(p_status) = 'open' and lower(result.entity_status) not in ('completed','cancelled','paid','rejected','withdrawn','accepted','abandoned','archived')))
  order by result.occurred_at desc limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.search_atlas(text, integer, text, text, date, date) from public, anon;
grant execute on function public.search_atlas(text, integer, text, text, date, date) to authenticated;
