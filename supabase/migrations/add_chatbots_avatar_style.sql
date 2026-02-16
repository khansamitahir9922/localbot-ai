-- Add avatar_style to chatbots for widget icon selection (1-10).
-- Safe to run multiple times. Validation (1-10) is enforced in the API.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'chatbots' and column_name = 'avatar_style'
  ) then
    alter table public.chatbots
      add column avatar_style text not null default '1';
  end if;
end $$;
