-- Visits: one row per user per day they open the app, for the Return metric in
-- /admin/metricas. The protected layout records today's visit with the user's session
-- (publishable key, so RLS applies); the admin reads every row with the secret key.
-- Days are UTC. Users can add only their own row for today and cannot read, change or
-- delete any row.

create table public.visits (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  visited_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, visited_on)
);

alter table public.visits enable row level security;

-- Supabase grants everything on new public tables by default; start from nothing.
revoke all on public.visits from anon, authenticated;
grant insert (user_id) on public.visits to authenticated;

create policy "Users can record their own visit for today"
  on public.visits for insert to authenticated
  with check (user_id = (select auth.uid()) and visited_on = (now() at time zone 'utc')::date);
