# Add `avatar_style` column to chatbots

If you see:

**"Could not find the 'avatar_style' column of 'chatbots' in the schema cache"**

then the `avatar_style` column has not been added to your database yet.

## Fix

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Click **New query**.
3. Paste and run this SQL:

```sql
-- Add avatar_style to chatbots for widget icon selection (1-10).
-- Safe to run multiple times.

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
```

4. After it runs successfully, retry creating the chatbot or loading Settings.
5. If you use Supabase’s schema cache (e.g. for types), refresh it or redeploy so the client sees the new column.
