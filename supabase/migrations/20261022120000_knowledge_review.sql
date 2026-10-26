-- Knowledge review: each company's administrator (company_members.is_admin) reads every
-- document registered by the company's members and approves the pending ones with a comment.
-- /api/knowledge/review does this with the publishable key + session, so RLS applies.
-- Regular users keep reading only their own documents. The platform admin (ADMIN_EMAILS)
-- only reads documents, through /api/admin/knowledge.

alter table public.knowledge
  add column review_comment text check (review_comment is null or char_length(btrim(review_comment)) between 1 and 1000),
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz;

-- Whether the signed-in user administers the company that `owner` belongs to.
-- security definer because RLS shows a user only their own company_members row.
create function public.is_company_admin_of(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members me
    join public.company_members m on m.company_id = me.company_id
    where me.user_id = (select auth.uid()) and me.is_admin and m.user_id = owner
  );
$$;

revoke execute on function public.is_company_admin_of(uuid) from public, anon;
grant execute on function public.is_company_admin_of(uuid) to authenticated;

create policy "Company administrators can read their company's documents"
  on public.knowledge for select to authenticated
  using (public.is_company_admin_of(user_id));

-- The only change anyone can make: a company administrator approves a pending document of
-- their company, with a comment.
grant update (status, review_comment) on public.knowledge to authenticated;

create policy "Company administrators can approve their company's documents"
  on public.knowledge for update to authenticated
  using (status = 'pending_review' and public.is_company_admin_of(user_id))
  with check (status = 'approved' and review_comment is not null and public.is_company_admin_of(user_id));

-- The reviewer and the review time come from the session, never from the request.
create function public.stamp_knowledge_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status or new.review_comment is distinct from old.review_comment then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_knowledge_review() from public, anon, authenticated;

create trigger knowledge_stamp_review
  before update on public.knowledge
  for each row execute function public.stamp_knowledge_review();

-- Emails of the members of the caller's company, so the review page can show who registered
-- each document. Returns rows only when the caller is that company's administrator.
create function public.company_member_emails()
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text
  from public.company_members me
  join public.company_members m on m.company_id = me.company_id
  join auth.users u on u.id = m.user_id
  where me.user_id = (select auth.uid()) and me.is_admin;
$$;

revoke execute on function public.company_member_emails() from public, anon;
grant execute on function public.company_member_emails() to authenticated;
