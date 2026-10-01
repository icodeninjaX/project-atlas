-- An optional money target for a goal ("save ₱60,000 for a laptop") and the
-- amount the owner says is saved toward it so far, both in centavos. The
-- owner updates the saved amount; nothing derives it. Existing goal policies
-- cover the new columns.
alter table public.goals
  add column target_amount_centavos bigint
    check (
      target_amount_centavos is null
      or target_amount_centavos between 1 and 100000000000000
    ),
  add column saved_amount_centavos bigint
    check (
      saved_amount_centavos is null
      or saved_amount_centavos between 0 and 100000000000000
    );
