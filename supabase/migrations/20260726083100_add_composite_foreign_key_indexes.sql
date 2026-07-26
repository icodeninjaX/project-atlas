-- Cover ownership-aware composite foreign keys.
create index account_transfers_source_owner_idx
  on public.account_transfers(source_account_id, user_id);
create index account_transfers_destination_owner_idx
  on public.account_transfers(destination_account_id, user_id);

create index budget_items_budget_owner_idx
  on public.budget_items(monthly_budget_id, user_id);
create index budget_items_category_owner_idx
  on public.budget_items(category_id, user_id);
create index budget_items_user_idx
  on public.budget_items(user_id);

create index debt_payments_debt_owner_idx
  on public.debt_payments(debt_id, user_id);
create index debt_payments_transaction_owner_idx
  on public.debt_payments(transaction_id, user_id)
  where transaction_id is not null;

create index goal_milestones_goal_owner_idx
  on public.goal_milestones(goal_id, user_id);
create index goal_milestones_user_idx
  on public.goal_milestones(user_id);

create index job_application_events_application_owner_idx
  on public.job_application_events(job_application_id, user_id);
create index job_application_events_user_idx
  on public.job_application_events(user_id);

create index tasks_related_goal_owner_idx
  on public.tasks(related_goal_id, user_id)
  where related_goal_id is not null;

create index transactions_account_owner_idx
  on public.transactions(account_id, user_id);
create index transactions_category_owner_idx
  on public.transactions(category_id, user_id);
