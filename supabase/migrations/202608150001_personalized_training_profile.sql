alter table public.profiles
  add column if not exists training_profile jsonb;
