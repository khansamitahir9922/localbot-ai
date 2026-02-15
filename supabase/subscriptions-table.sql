-- Subscriptions table for LocalBot AI billing.
-- Run in Supabase SQL Editor if the table does not exist.
-- Requires auth.users to exist (Supabase Auth).

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'paid', 'premium', 'agency')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_stripe_subscription_id_idx on public.subscriptions (stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates (e.g. from Stripe webhook) use service role key and bypass RLS.

comment on table public.subscriptions is 'Stripe subscription state per user: user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end.';
