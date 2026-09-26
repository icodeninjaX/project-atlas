alter table public.decision_revisions
  add column previous_rationale text,
  add column previous_assumptions text;

create or replace function private.record_decision_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(old.title, old.decision_on, old.intent, old.expected_outcome,
         old.rationale, old.assumptions, old.review_on, old.goal_id,
         old.action_task_id, old.metric_key)
    is distinct from
     row(new.title, new.decision_on, new.intent, new.expected_outcome,
         new.rationale, new.assumptions, new.review_on, new.goal_id,
         new.action_task_id, new.metric_key) then
    insert into public.decision_revisions(
      user_id, decision_id, previous_title, previous_decision_on,
      previous_intent, previous_expected_outcome, previous_rationale,
      previous_assumptions, previous_review_on, previous_goal_id,
      previous_action_task_id, previous_metric_key
    ) values (
      old.user_id, old.id, old.title, old.decision_on, old.intent,
      old.expected_outcome, old.rationale, old.assumptions, old.review_on,
      old.goal_id, old.action_task_id, old.metric_key
    );
  end if;
  return new;
end;
$$;
