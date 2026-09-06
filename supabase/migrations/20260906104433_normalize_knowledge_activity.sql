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

revoke all on function private.record_knowledge_activity() from public, anon, authenticated;
