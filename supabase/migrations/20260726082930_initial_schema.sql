-- Project Atlas MVP schema.
begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  default_currency text not null default 'PHP' check (default_currency = 'PHP'),
  timezone text not null default 'Asia/Manila',
  monthly_net_income_centavos bigint not null default 0 check (monthly_net_income_centavos >= 0),
  next_payday date,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  debt_strategy text not null default 'avalanche' check (debt_strategy in ('snowball', 'avalanche', 'priority')),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  account_type text not null check (account_type in ('cash', 'bank', 'e_wallet', 'savings', 'investment', 'other')),
  institution text,
  opening_balance_centavos bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category_type text not null check (category_type in ('income', 'expense', 'transfer')),
  icon text,
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  unique (user_id, name, category_type)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  category_id uuid not null,
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  amount_centavos bigint not null check (amount_centavos > 0),
  transaction_date date not null,
  merchant_or_source text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.financial_accounts(id, user_id) on delete restrict,
  foreign key (category_id, user_id) references public.transaction_categories(id, user_id) on delete restrict
);

create table public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_account_id uuid not null,
  destination_account_id uuid not null,
  amount_centavos bigint not null check (amount_centavos > 0),
  transfer_date date not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (source_account_id <> destination_account_id),
  foreign key (source_account_id, user_id) references public.financial_accounts(id, user_id) on delete restrict,
  foreign key (destination_account_id, user_id) references public.financial_accounts(id, user_id) on delete restrict
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null check (month_start = date_trunc('month', month_start)::date),
  expected_income_centavos bigint not null default 0 check (expected_income_centavos >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  unique (user_id, month_start)
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_budget_id uuid not null,
  category_id uuid not null,
  planned_centavos bigint not null check (planned_centavos >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (monthly_budget_id, user_id) references public.monthly_budgets(id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.transaction_categories(id, user_id) on delete restrict,
  unique (monthly_budget_id, category_id)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creditor_name text not null check (char_length(creditor_name) between 1 and 160),
  debt_type text not null check (debt_type in ('online_lending', 'credit_card', 'personal_loan', 'family', 'installment', 'other')),
  original_balance_centavos bigint not null check (original_balance_centavos > 0),
  current_balance_centavos bigint not null check (current_balance_centavos >= 0 and current_balance_centavos <= original_balance_centavos),
  interest_rate_percent numeric(7,4) not null default 0 check (interest_rate_percent >= 0 and interest_rate_percent <= 1000),
  minimum_payment_centavos bigint not null default 0 check (minimum_payment_centavos >= 0),
  due_day smallint check (due_day between 1 and 31),
  next_due_date date,
  status text not null default 'active' check (status in ('active', 'paid', 'paused', 'defaulted')),
  priority integer not null default 1 check (priority > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  check (status <> 'paid' or current_balance_centavos = 0)
);

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null,
  amount_centavos bigint not null check (amount_centavos > 0),
  payment_date date not null,
  transaction_id uuid,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (debt_id, user_id) references public.debts(id, user_id) on delete cascade,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete set null (transaction_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  area text not null check (area in ('finance', 'career', 'health', 'relationship', 'family', 'business', 'learning', 'personal')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  target_date date,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  success_definition text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(title) between 1 and 160),
  target_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  status text not null default 'inbox' check (status in ('inbox', 'planned', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_at timestamptz,
  scheduled_for date,
  estimated_minutes integer check (estimated_minutes > 0 and estimated_minutes <= 1440),
  completed_at timestamptz,
  related_goal_id uuid,
  source_module text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (related_goal_id, user_id) references public.goals(id, user_id) on delete set null (related_goal_id),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 160),
  role_title text not null check (char_length(role_title) between 1 and 160),
  job_url text,
  location text,
  work_setup text not null default 'unspecified' check (work_setup in ('remote', 'hybrid', 'onsite', 'unspecified')),
  employment_type text not null default 'unspecified' check (employment_type in ('full_time', 'part_time', 'contract', 'freelance', 'internship', 'unspecified')),
  salary_min_centavos bigint check (salary_min_centavos >= 0),
  salary_max_centavos bigint check (salary_max_centavos >= 0),
  stage text not null default 'interested' check (stage in ('interested', 'preparing', 'applied', 'assessment', 'interview', 'final_interview', 'offer', 'rejected', 'withdrawn', 'accepted')),
  applied_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  contact_name text,
  contact_email text,
  resume_version text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  check (salary_max_centavos is null or salary_min_centavos is null or salary_max_centavos >= salary_min_centavos)
);

create table public.job_application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_application_id uuid not null,
  event_type text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (job_application_id, user_id) references public.job_applications(id, user_id) on delete cascade
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  wins text,
  challenges text,
  lessons text,
  time_wasters text,
  money_reflection text,
  career_reflection text,
  next_week_focus text,
  energy_score smallint check (energy_score between 1 and 10),
  stress_score smallint check (stress_score between 1 and 10),
  overall_score smallint check (overall_score between 1 and 10),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, week_start)
);

create table public.daily_priority_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  priority_date date not null,
  entity_type text not null check (entity_type in ('task', 'debt', 'career', 'goal')),
  entity_id uuid not null,
  sort_order smallint not null check (sort_order between 0 and 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, priority_date, sort_order),
  unique (user_id, priority_date, entity_type, entity_id)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_preferences', 'financial_accounts', 'transaction_categories',
    'transactions', 'account_transfers', 'monthly_budgets', 'budget_items',
    'debts', 'debt_payments', 'goals', 'goal_milestones', 'tasks',
    'job_applications', 'job_application_events', 'weekly_reviews',
    'daily_priority_pins', 'activity_log'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

create index user_preferences_user_idx on public.user_preferences(user_id);
create index financial_accounts_user_active_idx on public.financial_accounts(user_id, is_archived);
create index transaction_categories_user_type_idx on public.transaction_categories(user_id, category_type);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index transactions_account_date_idx on public.transactions(account_id, transaction_date desc);
create index transactions_category_date_idx on public.transactions(category_id, transaction_date desc);
create index transactions_search_idx on public.transactions using gin ((coalesce(merchant_or_source, '') || ' ' || coalesce(description, '')) extensions.gin_trgm_ops);
create index transfers_user_date_idx on public.account_transfers(user_id, transfer_date desc);
create index monthly_budgets_user_month_idx on public.monthly_budgets(user_id, month_start desc);
create index budget_items_budget_idx on public.budget_items(monthly_budget_id);
create index debts_user_active_due_idx on public.debts(user_id, next_due_date) where status = 'active';
create index debt_payments_debt_date_idx on public.debt_payments(debt_id, payment_date desc);
create index debt_payments_user_date_idx on public.debt_payments(user_id, payment_date desc);
create index goals_user_status_target_idx on public.goals(user_id, status, target_date);
create index goals_title_search_idx on public.goals using gin (title extensions.gin_trgm_ops);
create index milestones_goal_sort_idx on public.goal_milestones(goal_id, sort_order);
create index tasks_user_status_schedule_idx on public.tasks(user_id, status, scheduled_for);
create index tasks_user_due_idx on public.tasks(user_id, due_at) where status not in ('completed', 'cancelled');
create index tasks_title_search_idx on public.tasks using gin (title extensions.gin_trgm_ops);
create index applications_user_stage_idx on public.job_applications(user_id, stage);
create index applications_user_next_action_idx on public.job_applications(user_id, next_action_at) where stage not in ('rejected', 'withdrawn', 'accepted');
create index applications_search_idx on public.job_applications using gin ((company_name || ' ' || role_title || ' ' || coalesce(notes, '')) extensions.gin_trgm_ops);
create index application_events_application_date_idx on public.job_application_events(job_application_id, occurred_at desc);
create index weekly_reviews_user_week_idx on public.weekly_reviews(user_id, week_start desc);
create index daily_priority_pins_user_date_idx on public.daily_priority_pins(user_id, priority_date);
create index activity_log_user_created_idx on public.activity_log(user_id, created_at desc);

create or replace function private.validate_transaction_category()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_type text;
begin
  select category_type into selected_type
  from public.transaction_categories
  where id = new.category_id and user_id = new.user_id;

  if selected_type is null or selected_type <> new.transaction_type then
    raise exception 'Transaction category type does not match transaction type';
  end if;
  return new;
end;
$$;

create trigger transactions_validate_category
before insert or update of category_id, transaction_type, user_id on public.transactions
for each row execute function private.validate_transaction_category();

create or replace function private.recalculate_debt(p_debt_id uuid, p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  original_balance bigint;
  payment_total bigint;
  new_balance bigint;
begin
  select d.original_balance_centavos
    into original_balance
  from public.debts d
  where d.id = p_debt_id and d.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  select coalesce(sum(dp.amount_centavos), 0)
    into payment_total
  from public.debt_payments dp
  where dp.debt_id = p_debt_id and dp.user_id = p_user_id;

  new_balance := original_balance - payment_total;
  if new_balance < 0 then
    raise exception 'Payment exceeds the remaining debt balance';
  end if;

  update public.debts
  set current_balance_centavos = new_balance,
      status = case
        when new_balance = 0 then 'paid'
        when status = 'paid' then 'active'
        else status
      end
  where id = p_debt_id and user_id = p_user_id;
end;
$$;

create or replace function private.debt_payment_recalculation_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  affected_user_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
begin
  if caller_id is not null and caller_id <> affected_user_id then
    raise exception 'Debt payment ownership mismatch';
  end if;

  if tg_op = 'DELETE' then
    perform private.recalculate_debt(old.debt_id, old.user_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.debt_id, old.user_id) is distinct from (new.debt_id, new.user_id) then
    perform private.recalculate_debt(old.debt_id, old.user_id);
  end if;

  perform private.recalculate_debt(new.debt_id, new.user_id);
  return new;
end;
$$;

create constraint trigger debt_payments_recalculate
after insert or update or delete on public.debt_payments
deferrable initially immediate
for each row execute function private.debt_payment_recalculation_trigger();

create or replace function private.record_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid;
  target_id uuid;
  action_name text;
  entity_name text;
  safe_metadata jsonb := '{}'::jsonb;
  new_row jsonb := to_jsonb(new);
  old_row jsonb := to_jsonb(old);
begin
  owner_id := (new_row ->> 'user_id')::uuid;
  target_id := (new_row ->> 'id')::uuid;
  entity_name := tg_table_name;

  case
    when tg_table_name = 'tasks'
      and tg_op = 'UPDATE'
      and new_row ->> 'status' = 'completed'
      and old_row ->> 'status' <> 'completed' then
      action_name := 'task_completed';
    when tg_table_name = 'debt_payments' and tg_op = 'INSERT' then
      action_name := 'debt_payment_recorded';
      safe_metadata := jsonb_build_object(
        'amount_centavos',
        (new_row ->> 'amount_centavos')::bigint
      );
    when tg_table_name = 'job_applications'
      and tg_op = 'UPDATE'
      and new_row ->> 'stage' <> old_row ->> 'stage' then
      action_name := 'job_stage_changed';
      safe_metadata := jsonb_build_object(
        'from',
        old_row ->> 'stage',
        'to',
        new_row ->> 'stage'
      );
    when tg_table_name = 'goals'
      and tg_op = 'UPDATE'
      and new_row ->> 'status' = 'completed'
      and old_row ->> 'status' <> 'completed' then
      action_name := 'goal_completed';
    when tg_table_name = 'weekly_reviews'
      and tg_op = 'UPDATE'
      and new_row ->> 'completed_at' is not null
      and old_row ->> 'completed_at' is null then
      action_name := 'weekly_review_submitted';
    else
      return new;
  end case;

  insert into public.activity_log(user_id, action, entity_type, entity_id, metadata)
  values (owner_id, action_name, entity_name, target_id, safe_metadata);
  return new;
end;
$$;

create trigger tasks_activity after update on public.tasks for each row execute function private.record_activity();
create trigger debt_payments_activity after insert on public.debt_payments for each row execute function private.record_activity();
create trigger applications_activity after update on public.job_applications for each row execute function private.record_activity();
create trigger goals_activity after update on public.goals for each row execute function private.record_activity();
create trigger reviews_activity after update on public.weekly_reviews for each row execute function private.record_activity();

create or replace function private.record_job_application_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  case
    when tg_op = 'INSERT' then
      insert into public.job_application_events(user_id, job_application_id, event_type, notes)
      values (new.user_id, new.id, 'stage_' || new.stage, 'Application created');
    when new.stage <> old.stage then
      insert into public.job_application_events(user_id, job_application_id, event_type, notes)
      values (new.user_id, new.id, 'stage_' || new.stage, 'Moved from ' || old.stage);
    else
      null;
  end case;
  return new;
end;
$$;

create trigger job_application_stage_events
after insert or update of stage on public.job_applications
for each row execute function private.record_job_application_event();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict (user_id) do nothing;

  insert into public.transaction_categories(user_id, name, category_type, icon, is_system)
  values
    (new.id, 'Salary', 'income', 'briefcase', true),
    (new.id, 'Freelance', 'income', 'laptop', true),
    (new.id, 'Food', 'expense', 'utensils', true),
    (new.id, 'Transportation', 'expense', 'bus', true),
    (new.id, 'Utilities', 'expense', 'bolt', true),
    (new.id, 'Debt Payment', 'expense', 'landmark', true),
    (new.id, 'Family', 'expense', 'users', true),
    (new.id, 'Health', 'expense', 'heart-pulse', true),
    (new.id, 'Shopping', 'expense', 'shopping-bag', true),
    (new.id, 'Entertainment', 'expense', 'film', true),
    (new.id, 'Business', 'expense', 'building', true),
    (new.id, 'Savings', 'transfer', 'piggy-bank', true),
    (new.id, 'Other', 'expense', 'circle-ellipsis', true)
  on conflict (user_id, name, category_type) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles(id)
select id from auth.users
on conflict (id) do nothing;

insert into public.user_preferences(user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.transaction_categories(user_id, name, category_type, icon, is_system)
select u.id, category.name, category.category_type, category.icon, true
from auth.users u
cross join (
  values
    ('Salary', 'income', 'briefcase'),
    ('Freelance', 'income', 'laptop'),
    ('Food', 'expense', 'utensils'),
    ('Transportation', 'expense', 'bus'),
    ('Utilities', 'expense', 'bolt'),
    ('Debt Payment', 'expense', 'landmark'),
    ('Family', 'expense', 'users'),
    ('Health', 'expense', 'heart-pulse'),
    ('Shopping', 'expense', 'shopping-bag'),
    ('Entertainment', 'expense', 'film'),
    ('Business', 'expense', 'building'),
    ('Savings', 'transfer', 'piggy-bank'),
    ('Other', 'expense', 'circle-ellipsis')
) as category(name, category_type, icon)
on conflict (user_id, name, category_type) do nothing;

create or replace function public.complete_onboarding(
  p_display_name text,
  p_current_cash_centavos bigint,
  p_monthly_net_income_centavos bigint,
  p_next_payday date,
  p_goals text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  goal_title text;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_current_cash_centavos < 0 or p_monthly_net_income_centavos < 0 then
    raise exception 'Balances cannot be negative';
  end if;

  update public.profiles
  set display_name = nullif(trim(p_display_name), ''),
      monthly_net_income_centavos = p_monthly_net_income_centavos,
      next_payday = p_next_payday,
      onboarding_completed = true
  where id = caller_id;

  insert into public.financial_accounts(user_id, name, account_type, opening_balance_centavos)
  select caller_id, 'Cash', 'cash', p_current_cash_centavos
  where not exists (
    select 1 from public.financial_accounts
    where user_id = caller_id and name = 'Cash' and account_type = 'cash'
  );

  foreach goal_title in array coalesce(p_goals, array[]::text[])
  loop
    insert into public.goals(user_id, title, area, status)
    select caller_id, trim(goal_title), 'personal', 'active'
    where trim(goal_title) <> ''
      and not exists (
        select 1 from public.goals where user_id = caller_id and title = trim(goal_title)
      );
  end loop;
end;
$$;

create or replace view public.financial_account_balances
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.name,
  a.account_type,
  a.institution,
  a.is_archived,
  a.opening_balance_centavos
    + coalesce(sum(case when t.transaction_type = 'income' then t.amount_centavos else -t.amount_centavos end), 0)
    + coalesce((select sum(at.amount_centavos) from public.account_transfers at where at.destination_account_id = a.id), 0)
    - coalesce((select sum(at.amount_centavos) from public.account_transfers at where at.source_account_id = a.id), 0)
    as current_balance_centavos,
  a.created_at,
  a.updated_at
from public.financial_accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create or replace view public.career_application_overview
with (security_invoker = true)
as
select
  j.*,
  (
    j.next_action_at is not null
    and j.next_action_at < now()
    and j.stage not in ('rejected', 'withdrawn', 'accepted')
  ) as is_follow_up_overdue
from public.job_applications j;

create or replace function public.search_atlas(p_query text, p_limit integer default 40)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  occurred_at timestamptz,
  entity_path text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select result.entity_type, result.entity_id, result.title, result.subtitle, result.occurred_at, result.entity_path
  from (
    select
      'Tasks'::text as entity_type,
      t.id as entity_id,
      t.title as title,
      coalesce(t.description, t.status) as subtitle,
      t.updated_at as occurred_at,
      '/tasks?highlight=' || t.id as entity_path
    from public.tasks t
    where t.user_id = (select auth.uid())
      and (t.title ilike '%' || p_query || '%' or coalesce(t.description, '') ilike '%' || p_query || '%')
    union all
    select 'Goals', g.id, g.title, coalesce(g.description, g.area), g.updated_at, '/goals?highlight=' || g.id
    from public.goals g
    where g.user_id = (select auth.uid())
      and (g.title ilike '%' || p_query || '%' or coalesce(g.description, '') ilike '%' || p_query || '%')
    union all
    select 'Debts', d.id, d.creditor_name, d.debt_type, d.updated_at, '/debts?highlight=' || d.id
    from public.debts d
    where d.user_id = (select auth.uid()) and d.creditor_name ilike '%' || p_query || '%'
    union all
    select 'Transactions', t.id, coalesce(t.merchant_or_source, 'Transaction'), coalesce(t.description, t.transaction_type), t.updated_at, '/money/transactions?highlight=' || t.id
    from public.transactions t
    where t.user_id = (select auth.uid())
      and (coalesce(t.merchant_or_source, '') ilike '%' || p_query || '%' or coalesce(t.description, '') ilike '%' || p_query || '%')
    union all
    select 'Career', j.id, j.company_name || ' · ' || j.role_title, coalesce(j.next_action, j.stage), j.updated_at, '/career?highlight=' || j.id
    from public.job_applications j
    where j.user_id = (select auth.uid())
      and (j.company_name ilike '%' || p_query || '%' or j.role_title ilike '%' || p_query || '%' or coalesce(j.notes, '') ilike '%' || p_query || '%')
    union all
    select 'Reviews', w.id, 'Week of ' || w.week_start::text, coalesce(w.next_week_focus, w.wins, 'Weekly review'), w.updated_at, '/reviews?highlight=' || w.id
    from public.weekly_reviews w
    where w.user_id = (select auth.uid())
      and concat_ws(' ', w.wins, w.challenges, w.lessons, w.next_week_focus) ilike '%' || p_query || '%'
  ) as result
  order by result.occurred_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.dashboard_snapshot(
  p_today date,
  p_month_start date,
  p_week_start date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'financial', jsonb_build_object(
      'total_balance_centavos', coalesce((select sum(a.current_balance_centavos) from public.financial_account_balances a where a.user_id = (select auth.uid()) and not a.is_archived), 0),
      'income_month_centavos', coalesce((select sum(t.amount_centavos) from public.transactions t where t.user_id = (select auth.uid()) and t.transaction_type = 'income' and t.transaction_date >= p_month_start and t.transaction_date < p_month_start + interval '1 month'), 0),
      'expense_month_centavos', coalesce((select sum(t.amount_centavos) from public.transactions t where t.user_id = (select auth.uid()) and t.transaction_type = 'expense' and t.transaction_date >= p_month_start and t.transaction_date < p_month_start + interval '1 month'), 0),
      'remaining_budget_centavos', (
        select case when mb.id is null then null else
          coalesce((select sum(bi.planned_centavos) from public.budget_items bi where bi.monthly_budget_id = mb.id and bi.user_id = (select auth.uid())), 0)
          - coalesce((select sum(t.amount_centavos) from public.transactions t where t.user_id = (select auth.uid()) and t.transaction_type = 'expense' and t.transaction_date >= p_month_start and t.transaction_date < p_month_start + interval '1 month'), 0)
        end
        from (select id from public.monthly_budgets where user_id = (select auth.uid()) and month_start = p_month_start limit 1) mb
      ),
      'debt_remaining_centavos', coalesce((select sum(d.current_balance_centavos) from public.debts d where d.user_id = (select auth.uid()) and d.status in ('active', 'paused', 'defaulted')), 0),
      'next_financial_deadline', (select min(d.next_due_date) from public.debts d where d.user_id = (select auth.uid()) and d.status = 'active' and d.next_due_date >= p_today),
      'days_until_payday', (select greatest(p.next_payday - p_today, 0) from public.profiles p where p.id = (select auth.uid()) and p.next_payday is not null)
    ),
    'tasks', jsonb_build_object(
      'today', (select count(*) from public.tasks t where t.user_id = (select auth.uid()) and t.scheduled_for = p_today and t.status not in ('completed', 'cancelled')),
      'overdue', (select count(*) from public.tasks t where t.user_id = (select auth.uid()) and t.due_at < now() and t.status not in ('completed', 'cancelled')),
      'completed_today', (select count(*) from public.tasks t where t.user_id = (select auth.uid()) and t.completed_at >= p_today::timestamptz and t.completed_at < (p_today + 1)::timestamptz),
      'remaining_minutes', coalesce((select sum(t.estimated_minutes) from public.tasks t where t.user_id = (select auth.uid()) and t.scheduled_for = p_today and t.status not in ('completed', 'cancelled')), 0)
    ),
    'career', jsonb_build_object(
      'active', (select count(*) from public.job_applications j where j.user_id = (select auth.uid()) and j.stage not in ('rejected', 'withdrawn', 'accepted')),
      'follow_up', (select count(*) from public.job_applications j where j.user_id = (select auth.uid()) and j.next_action_at < now() and j.stage not in ('rejected', 'withdrawn', 'accepted')),
      'interviews', (select count(*) from public.job_applications j where j.user_id = (select auth.uid()) and j.stage in ('interview', 'final_interview')),
      'offers', (select count(*) from public.job_applications j where j.user_id = (select auth.uid()) and j.stage = 'offer'),
      'submitted_month', (select count(*) from public.job_applications j where j.user_id = (select auth.uid()) and j.applied_at >= p_month_start::timestamptz and j.applied_at < (p_month_start + interval '1 month')::timestamptz)
    ),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'progress_percent', g.progress_percent, 'area', g.area) order by g.target_date nulls last)
      from (select * from public.goals where user_id = (select auth.uid()) and status = 'active' order by target_date nulls last limit 4) g
    ), '[]'::jsonb),
    'review_complete', exists(select 1 from public.weekly_reviews w where w.user_id = (select auth.uid()) and w.week_start = p_week_start and w.completed_at is not null),
    'priorities', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'title', p.title, 'reason', p.reason, 'href', p.href) order by p.rank, p.sort_at nulls last)
      from (
        select t.id, 'task'::text as kind, t.title, 'Critical and already overdue'::text as reason, '/tasks?highlight=' || t.id as href, 1 as rank, t.due_at as sort_at
        from public.tasks t where t.user_id = (select auth.uid()) and t.priority = 'critical' and t.due_at < now() and t.status not in ('completed', 'cancelled')
        union all
        select d.id, 'debt', 'Pay ' || d.creditor_name, 'Payment due within seven days', '/debts?highlight=' || d.id, 2, d.next_due_date::timestamptz
        from public.debts d where d.user_id = (select auth.uid()) and d.status = 'active' and d.next_due_date between p_today and p_today + 7
        union all
        select j.id, 'career', coalesce(j.next_action, 'Follow up with ' || j.company_name), 'Career next action is due', '/career?highlight=' || j.id, 3, j.next_action_at
        from public.job_applications j where j.user_id = (select auth.uid()) and j.next_action_at <= now() + interval '3 days' and j.stage not in ('rejected', 'withdrawn', 'accepted')
        union all
        select t.id, 'task', t.title, 'High-priority work scheduled today', '/tasks?highlight=' || t.id, 4, t.created_at
        from public.tasks t where t.user_id = (select auth.uid()) and t.priority in ('high', 'critical') and t.scheduled_for = p_today and t.status not in ('completed', 'cancelled')
        union all
        select gm.id, 'goal', gm.title, 'Goal milestone due within seven days', '/goals?highlight=' || gm.goal_id, 5, gm.target_date::timestamptz
        from public.goal_milestones gm join public.goals g on g.id = gm.goal_id and g.user_id = gm.user_id
        where gm.user_id = (select auth.uid()) and gm.completed_at is null and gm.target_date between p_today and p_today + 7 and g.status = 'active'
        order by rank, sort_at nulls last
        limit 3
      ) p
    ), '[]'::jsonb)
  );
$$;

create or replace function public.save_monthly_budget(
  p_month_start date,
  p_expected_income_centavos bigint,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  budget_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_month_start <> date_trunc('month', p_month_start)::date or p_expected_income_centavos < 0 then
    raise exception 'Invalid monthly budget';
  end if;

  insert into public.monthly_budgets(user_id, month_start, expected_income_centavos, notes)
  values (caller_id, p_month_start, p_expected_income_centavos, p_notes)
  on conflict (user_id, month_start) do update
    set expected_income_centavos = excluded.expected_income_centavos,
        notes = excluded.notes
  returning id into budget_id;

  delete from public.budget_items where user_id = caller_id and monthly_budget_id = budget_id;
  insert into public.budget_items(user_id, monthly_budget_id, category_id, planned_centavos)
  select caller_id, budget_id, item.category_id, item.planned_centavos
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb))
    as item(category_id uuid, planned_centavos bigint)
  join public.transaction_categories category
    on category.id = item.category_id
   and category.user_id = caller_id
   and category.category_type = 'expense'
  where item.planned_centavos >= 0;

  return budget_id;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_preferences', 'financial_accounts', 'transaction_categories',
    'transactions', 'account_transfers', 'monthly_budgets', 'budget_items',
    'debts', 'debt_payments', 'goals', 'goal_milestones', 'tasks',
    'job_applications', 'job_application_events', 'weekly_reviews',
    'daily_priority_pins', 'activity_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy %I_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = id);

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.recalculate_debt(uuid, uuid) from public, anon, authenticated;
revoke all on function private.debt_payment_recalculation_trigger() from public, anon, authenticated;
revoke all on function private.record_activity() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.validate_transaction_category() from public, anon, authenticated;
revoke all on function private.record_job_application_event() from public, anon, authenticated;
revoke all on function public.complete_onboarding(text, bigint, bigint, date, text[]) from public, anon;
grant execute on function public.complete_onboarding(text, bigint, bigint, date, text[]) to authenticated;
revoke all on function public.search_atlas(text, integer) from public, anon;
grant execute on function public.search_atlas(text, integer) to authenticated;
revoke all on function public.dashboard_snapshot(date, date, date) from public, anon;
grant execute on function public.dashboard_snapshot(date, date, date) to authenticated;
revoke all on function public.save_monthly_budget(date, bigint, text, jsonb) from public, anon;
grant execute on function public.save_monthly_budget(date, bigint, text, jsonb) to authenticated;
grant select on public.financial_account_balances to authenticated;
grant select on public.career_application_overview to authenticated;

commit;
