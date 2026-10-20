-- Knowledge: the documents Maria uses to guide employees.
-- Signed-in users register documents and read only their own, through /api/knowledge
-- (publishable key + session, so RLS applies). The admin panel reads every row through
-- /api/admin/knowledge (secret key, after the ADMIN_EMAILS check).
-- New documents start as pending review; users cannot set the owner or the status.

create table public.knowledge (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  path text not null check (char_length(btrim(path)) between 1 and 1000),
  knowledge_type text not null check (knowledge_type in ('formal_rule', 'operational_guide')),
  source_type text not null check (source_type in ('sop', 'email', 'meeting')),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'archived')),
  created_at timestamptz not null default now()
);

create index knowledge_user_id_created_at_idx on public.knowledge (user_id, created_at desc);

alter table public.knowledge enable row level security;

-- Supabase grants everything on new public tables by default; start from nothing.
revoke all on public.knowledge from anon, authenticated;
grant select on public.knowledge to authenticated;
grant insert (name, path, knowledge_type, source_type) on public.knowledge to authenticated;

create policy "Users can read their own documents"
  on public.knowledge for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can register their own documents"
  on public.knowledge for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending_review');
