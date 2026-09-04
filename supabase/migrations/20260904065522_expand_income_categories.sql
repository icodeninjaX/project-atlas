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
    (new.id, 'Bonus', 'income', 'gift', true),
    (new.id, 'Commission', 'income', 'badge-percent', true),
    (new.id, 'Business Income', 'income', 'building', true),
    (new.id, 'Investment Income', 'income', 'trending-up', true),
    (new.id, 'Rental Income', 'income', 'house', true),
    (new.id, 'Allowance', 'income', 'wallet-cards', true),
    (new.id, 'Gifts', 'income', 'hand-heart', true),
    (new.id, 'Other Income', 'income', 'circle-ellipsis', true),
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

insert into public.transaction_categories(user_id, name, category_type, icon, is_system)
select users.id, category.name, 'income', category.icon, true
from auth.users as users
cross join (
  values
    ('Bonus', 'gift'),
    ('Commission', 'badge-percent'),
    ('Business Income', 'building'),
    ('Investment Income', 'trending-up'),
    ('Rental Income', 'house'),
    ('Allowance', 'wallet-cards'),
    ('Gifts', 'hand-heart'),
    ('Other Income', 'circle-ellipsis')
) as category(name, icon)
on conflict (user_id, name, category_type) do nothing;
