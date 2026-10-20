-- Knowledge versions: the history of a knowledge document. When a document is replaced,
-- the current row of public.knowledge is copied here first (with the next version number
-- and the user's description of what changes), then the knowledge row is overwritten.
--
-- A document is identified by its name (trimmed, case-insensitive), knowledge type and
-- source type, so that combination is now unique in public.knowledge.
--
-- Writes happen only inside replace_knowledge(), which checks that the caller owns the
-- document, or is the secret key (the admin routes, after the ADMIN_EMAILS check).
-- Signed-in users read the versions of their own documents through /api/knowledge-versions
-- (publishable key + session, so RLS applies); the admin reads every row through
-- /api/admin/knowledge-versions (secret key).

create unique index knowledge_name_type_source_key
  on public.knowledge (lower(btrim(name)), knowledge_type, source_type);

create table public.knowledge_versions (
  id bigint generated always as identity primary key,
  knowledge_id bigint not null references public.knowledge(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_name text not null check (char_length(btrim(document_name)) between 1 and 200),
  path text not null check (char_length(btrim(path)) between 1 and 1000),
  knowledge_type text not null check (knowledge_type in ('formal_rule', 'operational_guide')),
  source_type text not null check (source_type in ('sop', 'email', 'meeting')),
  -- When the copied version was registered (the knowledge row's created_at).
  created_at timestamptz not null,
  version_number integer not null check (version_number >= 1),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  replaced_at timestamptz not null default now(),
  unique (knowledge_id, version_number)
);

create index knowledge_versions_user_id_created_at_idx on public.knowledge_versions (user_id, created_at desc);

alter table public.knowledge_versions enable row level security;

-- Supabase grants everything on new public tables by default; start from nothing.
-- No insert, update or delete: rows are written only by replace_knowledge().
revoke all on public.knowledge_versions from anon, authenticated;
grant select on public.knowledge_versions to authenticated;

create policy "Users can read the versions of their own documents"
  on public.knowledge_versions for select to authenticated
  using (user_id = (select auth.uid()));

-- Finds the document a new registration collides with, across every user (RLS would hide
-- other users' rows). Returns only its id and whether the caller owns it.
create function public.knowledge_duplicate(p_name text, p_knowledge_type text, p_source_type text)
returns table (id bigint, is_owner boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.user_id = (select auth.uid())
  from public.knowledge k
  where lower(btrim(k.name)) = lower(btrim(p_name))
    and k.knowledge_type = p_knowledge_type
    and k.source_type = p_source_type;
$$;

-- Copies the document into knowledge_versions with the next version number, then replaces
-- its path and sends it back to review. Only the owner may call it, or the secret key.
create function public.replace_knowledge(p_knowledge_id bigint, p_path text, p_description text)
returns table (id bigint, name text, path text, knowledge_type text, source_type text, status text, created_at timestamptz, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc public.knowledge;
  next_version integer;
begin
  select * into doc from public.knowledge k where k.id = p_knowledge_id for update;
  if not found then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if doc.user_id is distinct from (select auth.uid())
     and coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'Only the owner of this document can replace it' using errcode = '42501';
  end if;

  select coalesce(max(v.version_number), 0) + 1 into next_version
  from public.knowledge_versions v where v.knowledge_id = doc.id;

  insert into public.knowledge_versions
    (knowledge_id, user_id, document_name, path, knowledge_type, source_type, created_at, version_number, description)
  values
    (doc.id, doc.user_id, doc.name, doc.path, doc.knowledge_type, doc.source_type, doc.created_at, next_version, btrim(p_description));

  return query
    update public.knowledge k
    set path = btrim(p_path), status = 'pending_review', created_at = now()
    where k.id = doc.id
    returning k.id, k.name, k.path, k.knowledge_type, k.source_type, k.status, k.created_at, next_version;
end;
$$;

-- Supabase grants execute on new functions to anon by default; keep them for signed-in callers.
revoke execute on function public.knowledge_duplicate(text, text, text) from public, anon;
revoke execute on function public.replace_knowledge(bigint, text, text) from public, anon;
grant execute on function public.knowledge_duplicate(text, text, text) to authenticated;
grant execute on function public.replace_knowledge(bigint, text, text) to authenticated, service_role;
