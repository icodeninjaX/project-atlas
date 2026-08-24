-- Fictional, idempotent development data.
-- Run only against a dedicated local or test Supabase project after creating a test user.
do $$
declare
  seed_user uuid := (select id from public.profiles order by created_at limit 1);
  food_category uuid;
  utilities_category uuid;
begin
  if seed_user is null then
    raise notice 'ATLAS seed skipped: create a development auth user first.';
    return;
  end if;

  update public.profiles
  set display_name = coalesce(display_name, 'ATLAS Demo'),
      monthly_net_income_centavos = 1900000,
      next_payday = current_date + 7,
      onboarding_completed = true
  where id = seed_user;

  insert into public.financial_accounts(id, user_id, name, account_type, opening_balance_centavos)
  values
    ('10000000-0000-4000-8000-000000000001', seed_user, 'Cash', 'cash', 250000),
    ('10000000-0000-4000-8000-000000000002', seed_user, 'GCash', 'e_wallet', 180000)
  on conflict (id) do update set
    name = excluded.name,
    account_type = excluded.account_type,
    opening_balance_centavos = excluded.opening_balance_centavos;

  select id into food_category from public.transaction_categories
  where user_id = seed_user and name = 'Food' and category_type = 'expense';
  select id into utilities_category from public.transaction_categories
  where user_id = seed_user and name = 'Utilities' and category_type = 'expense';

  insert into public.transactions(id, user_id, account_id, category_id, transaction_type, amount_centavos, transaction_date, merchant_or_source, description)
  values
    ('20000000-0000-4000-8000-000000000001', seed_user, '10000000-0000-4000-8000-000000000001', food_category, 'expense', 18500, current_date - 2, 'Fictional canteen', 'Lunch'),
    ('20000000-0000-4000-8000-000000000002', seed_user, '10000000-0000-4000-8000-000000000002', utilities_category, 'expense', 79900, current_date - 5, 'Sample internet provider', 'Monthly connection')
  on conflict (id) do update set amount_centavos = excluded.amount_centavos;

  insert into public.debts(id, user_id, creditor_name, debt_type, original_balance_centavos, current_balance_centavos, interest_rate_percent, minimum_payment_centavos, next_due_date, status, priority, notes)
  values
    ('30000000-0000-4000-8000-000000000001', seed_user, 'Sample Installment A', 'installment', 1200000, 1200000, 6.5, 110000, current_date + 5, 'active', 1, 'Fictional development data'),
    ('30000000-0000-4000-8000-000000000002', seed_user, 'Sample Family Loan', 'family', 500000, 500000, 0, 50000, current_date + 12, 'active', 2, 'Fictional development data')
  on conflict (id) do update set
    creditor_name = excluded.creditor_name,
    original_balance_centavos = excluded.original_balance_centavos,
    current_balance_centavos = excluded.current_balance_centavos;

  insert into public.goals(id, user_id, title, description, area, status, target_date, success_definition)
  values
    ('40000000-0000-4000-8000-000000000001', seed_user, 'Strengthen my developer portfolio', 'Publish three focused case studies.', 'career', 'active', current_date + 60, 'Three polished, publicly accessible case studies'),
    ('40000000-0000-4000-8000-000000000002', seed_user, 'Build a starter emergency fund', 'Set aside one month of basic expenses.', 'finance', 'active', current_date + 120, 'One month of essential expenses saved')
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    target_date = excluded.target_date,
    success_definition = excluded.success_definition;

  insert into public.goal_milestones(id, user_id, goal_id, title, target_date, completed_at, sort_order)
  values
    ('41000000-0000-4000-8000-000000000001', seed_user, '40000000-0000-4000-8000-000000000001', 'Choose the case studies', current_date + 7, timezone('utc', now()) - interval '2 days', 1),
    ('41000000-0000-4000-8000-000000000002', seed_user, '40000000-0000-4000-8000-000000000001', 'Write and polish each story', current_date + 35, null, 2),
    ('41000000-0000-4000-8000-000000000003', seed_user, '40000000-0000-4000-8000-000000000001', 'Publish the portfolio', current_date + 60, null, 3),
    ('41000000-0000-4000-8000-000000000004', seed_user, '40000000-0000-4000-8000-000000000002', 'Set the monthly savings target', current_date + 7, timezone('utc', now()) - interval '1 day', 1),
    ('41000000-0000-4000-8000-000000000005', seed_user, '40000000-0000-4000-8000-000000000002', 'Save the first quarter', current_date + 35, null, 2),
    ('41000000-0000-4000-8000-000000000006', seed_user, '40000000-0000-4000-8000-000000000002', 'Reach half of the target', current_date + 70, null, 3),
    ('41000000-0000-4000-8000-000000000007', seed_user, '40000000-0000-4000-8000-000000000002', 'Fund one month of expenses', current_date + 120, null, 4)
  on conflict (id) do update set
    title = excluded.title,
    target_date = excluded.target_date,
    completed_at = excluded.completed_at,
    sort_order = excluded.sort_order;

  insert into public.tasks(id, user_id, title, description, status, priority, due_at, scheduled_for, estimated_minutes, related_goal_id)
  values
    ('50000000-0000-4000-8000-000000000001', seed_user, 'Draft portfolio case study', 'Outline the problem, decisions, and measurable result.', 'planned', 'high', timezone('utc', now()) + interval '2 days', current_date + 1, 90, '40000000-0000-4000-8000-000000000001'),
    ('50000000-0000-4000-8000-000000000002', seed_user, 'Review monthly spending', null, 'inbox', 'medium', null, null, 30, '40000000-0000-4000-8000-000000000002')
  on conflict (id) do update set title = excluded.title;

  insert into public.job_applications(id, user_id, company_name, role_title, job_url, location, work_setup, employment_type, salary_min_centavos, salary_max_centavos, stage, applied_at, next_action, next_action_at, resume_version, notes)
  values
    ('60000000-0000-4000-8000-000000000001', seed_user, 'Northstar Labs', 'Full-stack Developer', 'https://example.com/jobs/northstar', 'Metro Manila', 'hybrid', 'full_time', 4000000, 5500000, 'interview', timezone('utc', now()) - interval '8 days', 'Prepare system design examples', timezone('utc', now()) + interval '2 days', 'portfolio-v3', 'Fictional company'),
    ('60000000-0000-4000-8000-000000000002', seed_user, 'Harbor Systems', 'PHP Engineer', 'https://example.com/jobs/harbor', 'Remote', 'remote', 'contract', 4500000, 6000000, 'applied', timezone('utc', now()) - interval '3 days', 'Send a concise follow-up', timezone('utc', now()) + interval '4 days', 'php-focused-v2', 'Fictional company')
  on conflict (id) do update set stage = excluded.stage;

  insert into public.weekly_reviews(id, user_id, week_start, wins, challenges, lessons, time_wasters, money_reflection, career_reflection, next_week_focus, energy_score, stress_score, overall_score, completed_at)
  values
    ('70000000-0000-4000-8000-000000000001', seed_user, (date_trunc('week', current_date)::date - 14), 'Finished a difficult feature.', 'Context switching.', 'Smaller daily commitments are easier to keep.', 'Unplanned scrolling.', 'Tracked every expense.', 'Improved one case study.', 'Finish and publish the case study.', 7, 6, 7, timezone('utc', now()) - interval '13 days'),
    ('70000000-0000-4000-8000-000000000002', seed_user, (date_trunc('week', current_date)::date - 7), 'Sent two applications.', 'Low energy late in the week.', 'Schedule focused work earlier.', 'Too many open tabs.', 'Stayed inside the food budget.', 'Practiced interview answers.', 'Prepare for the Northstar interview.', 6, 7, 6, timezone('utc', now()) - interval '6 days')
  on conflict (user_id, week_start) do update set overall_score = excluded.overall_score;
end;
$$;
