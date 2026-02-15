-- Add missing columns to public.subscriptions if they don't exist.
-- Run this in Supabase SQL Editor if you get "Could not find the 'X' column" errors.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).

-- status (required for app)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'status'
  ) then
    alter table public.subscriptions
      add column status text not null default 'active'
      check (status in ('active', 'past_due', 'canceled', 'trialing'));
  end if;
end $$;

-- current_period_end (optional)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'current_period_end'
  ) then
    alter table public.subscriptions add column current_period_end timestamptz;
  end if;
end $$;

-- created_at (optional, for auditing)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'created_at'
  ) then
    alter table public.subscriptions add column created_at timestamptz not null default now();
  end if;
end $$;

-- updated_at (optional; app no longer writes it, but you can add it for auditing)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'updated_at'
  ) then
    alter table public.subscriptions add column updated_at timestamptz not null default now();
  end if;
end $$;
