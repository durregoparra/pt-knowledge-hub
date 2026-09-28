-- Landing page forms: waitlist signups and visitor feedback.
-- Anyone (anon) can insert; only signed-in users can read.

create table public.signups (
  id bigint generated always as identity primary key,
  email text not null unique check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

create table public.feedback (
  id bigint generated always as identity primary key,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  email text check (email is null or char_length(email) <= 254),
  created_at timestamptz not null default now()
);

alter table public.signups  enable row level security;
alter table public.feedback enable row level security;

grant insert on public.signups, public.feedback to anon, authenticated;
grant select on public.signups, public.feedback to authenticated;

create policy "Anyone can sign up"
  on public.signups for insert to anon, authenticated with check (true);
create policy "Signed-in users can read"
  on public.signups for select to authenticated using (true);

create policy "Anyone can send feedback"
  on public.feedback for insert to anon, authenticated with check (true);
create policy "Signed-in users can read"
  on public.feedback for select to authenticated using (true);
