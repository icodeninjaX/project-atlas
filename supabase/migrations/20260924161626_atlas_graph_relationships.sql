-- Explicit, user-confirmed links. Native task/goal and milestone/goal links stay in their own tables.
create table public.atlas_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  relationship_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint atlas_relationship_allowed_pair check (
    (source_type = 'knowledge_concept' and target_type = 'goal' and relationship_type = 'supports_goal') or
    (source_type = 'debt' and target_type = 'goal' and relationship_type = 'tracks_goal') or
    (source_type = 'job_application' and target_type = 'goal' and relationship_type = 'supports_goal') or
    (source_type = 'weekly_review' and target_type = 'goal' and relationship_type = 'reflects_goal') or
    (source_type = 'transaction' and target_type = 'goal' and relationship_type = 'financially_related') or
    (source_type = 'goal_milestone' and target_type = 'knowledge_concept' and relationship_type = 'related_knowledge')
  ),
  constraint atlas_relationship_unique unique (user_id, source_type, source_id, target_type, target_id, relationship_type)
);

create index atlas_relationship_source_idx on public.atlas_relationships(user_id, source_type, source_id, created_at desc);
create index atlas_relationship_target_idx on public.atlas_relationships(user_id, target_type, target_id, created_at desc);
create index atlas_relationship_kind_idx on public.atlas_relationships(user_id, relationship_type);

alter table public.atlas_relationships enable row level security;
create policy atlas_relationships_select on public.atlas_relationships for select to authenticated
  using (user_id = (select auth.uid()));
create policy atlas_relationships_insert on public.atlas_relationships for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy atlas_relationships_delete on public.atlas_relationships for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.atlas_relationships from anon, authenticated;
grant select, insert, delete on public.atlas_relationships to authenticated;

-- The invoker sees only their own endpoint rows through each table's RLS policy.
-- Locking the endpoint prevents a concurrent delete from leaving an orphan after validation.
create function private.validate_atlas_relationship()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  source_found boolean := false;
  target_found boolean := false;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Relationship endpoint unavailable' using errcode = '23503';
  end if;
  case new.source_type
    when 'knowledge_concept' then select true into source_found from public.knowledge_concepts where id = new.source_id and user_id = new.user_id for key share;
    when 'debt' then select true into source_found from public.debts where id = new.source_id and user_id = new.user_id for key share;
    when 'job_application' then select true into source_found from public.job_applications where id = new.source_id and user_id = new.user_id for key share;
    when 'weekly_review' then select true into source_found from public.weekly_reviews where id = new.source_id and user_id = new.user_id for key share;
    when 'transaction' then select true into source_found from public.transactions where id = new.source_id and user_id = new.user_id for key share;
    when 'goal_milestone' then select true into source_found from public.goal_milestones where id = new.source_id and user_id = new.user_id for key share;
    else raise exception 'Relationship endpoint unavailable' using errcode = '23503';
  end case;
  if not coalesce(source_found, false) then
    raise exception 'Relationship endpoint unavailable' using errcode = '23503';
  end if;
  case new.target_type
    when 'goal' then select true into target_found from public.goals where id = new.target_id and user_id = new.user_id for key share;
    when 'knowledge_concept' then select true into target_found from public.knowledge_concepts where id = new.target_id and user_id = new.user_id for key share;
    else raise exception 'Relationship endpoint unavailable' using errcode = '23503';
  end case;
  if not coalesce(target_found, false) then
    raise exception 'Relationship endpoint unavailable' using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_atlas_relationship() from public;
create trigger atlas_relationship_validate before insert on public.atlas_relationships
  for each row execute function private.validate_atlas_relationship();

-- A deletion from any endpoint deterministically removes explicit links in the same transaction.
-- This internal definer is needed for cascades initiated by account deletion as well as normal RLS deletes.
create function private.delete_atlas_endpoint_relationships()
returns trigger language plpgsql security definer set search_path = '' as $$
declare endpoint_type text;
begin
  endpoint_type := case tg_table_name
    when 'goals' then 'goal'
    when 'goal_milestones' then 'goal_milestone'
    when 'knowledge_concepts' then 'knowledge_concept'
    when 'debts' then 'debt'
    when 'job_applications' then 'job_application'
    when 'weekly_reviews' then 'weekly_review'
    when 'transactions' then 'transaction'
  end;
  delete from public.atlas_relationships
  where user_id = old.user_id and
    ((source_type = endpoint_type and source_id = old.id) or
     (target_type = endpoint_type and target_id = old.id));
  return old;
end;
$$;
revoke all on function private.delete_atlas_endpoint_relationships() from public;

create trigger atlas_graph_delete_goal after delete on public.goals for each row execute function private.delete_atlas_endpoint_relationships();
create trigger atlas_graph_delete_milestone after delete on public.goal_milestones for each row execute function private.delete_atlas_endpoint_relationships();
create trigger atlas_graph_delete_knowledge after delete on public.knowledge_concepts for each row execute function private.delete_atlas_endpoint_relationships();
create trigger atlas_graph_delete_debt after delete on public.debts for each row execute function private.delete_atlas_endpoint_relationships();
create trigger atlas_graph_delete_application after delete on public.job_applications for each row execute function private.delete_atlas_endpoint_relationships();
create trigger atlas_graph_delete_review after delete on public.weekly_reviews for each row execute function private.delete_atlas_endpoint_relationships();
create trigger atlas_graph_delete_transaction after delete on public.transactions for each row execute function private.delete_atlas_endpoint_relationships();

-- One aggregate call supplies counts for all visible goals without loading all edges into the page.
create function public.atlas_goal_relationship_counts(p_goal_ids uuid[])
returns table(goal_id uuid, entity_type text, relationship_count bigint)
language sql security invoker set search_path = '' stable as $$
  select links.goal_id, links.entity_type, count(*) from (
    select t.related_goal_id as goal_id, 'task'::text as entity_type
      from public.tasks t where t.user_id = (select auth.uid()) and t.related_goal_id = any(p_goal_ids[1:200])
    union all
    select m.goal_id, 'goal_milestone'::text
      from public.goal_milestones m where m.user_id = (select auth.uid()) and m.goal_id = any(p_goal_ids[1:200])
    union all
    select r.target_id, r.source_type
      from public.atlas_relationships r where r.user_id = (select auth.uid()) and r.target_type = 'goal' and r.target_id = any(p_goal_ids[1:200])
  ) links
  join public.goals g on g.id = links.goal_id and g.user_id = (select auth.uid())
  group by links.goal_id, links.entity_type;
$$;
revoke all on function public.atlas_goal_relationship_counts(uuid[]) from public, anon;
grant execute on function public.atlas_goal_relationship_counts(uuid[]) to authenticated;

-- Activity history records intent without copying titles or sensitive details.
create function private.record_atlas_relationship_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare edge public.atlas_relationships%rowtype;
begin
  edge := case when tg_op = 'DELETE' then old else new end;
  -- Endpoint and account cascades are cleanup, not user-initiated unlink events.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  insert into public.activity_log(user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at, occurred_precision, module, title, description, source_href)
  values (edge.user_id, case when tg_op = 'DELETE' then 'relationship_removed' else 'relationship_created' end,
    'atlas_relationships', edge.id,
    jsonb_build_object('source_type', edge.source_type, 'target_type', edge.target_type, 'relationship_type', edge.relationship_type),
    timezone('Asia/Manila', now())::date, now(), 'timestamp',
    'system', case when tg_op = 'DELETE' then 'Relationship removed' else 'Relationship added' end,
    null, case when edge.target_type = 'goal' then '/goals?highlight=' || edge.target_id else '/knowledge?highlight=' || edge.target_id end);
  return edge;
end;
$$;
revoke all on function private.record_atlas_relationship_activity() from public;
create trigger atlas_relationship_activity after insert or delete on public.atlas_relationships
  for each row execute function private.record_atlas_relationship_activity();
