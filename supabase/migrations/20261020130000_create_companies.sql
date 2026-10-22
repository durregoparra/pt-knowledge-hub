-- Companies: every registered user belongs to one company.
-- public.companies holds the company itself; public.company_members links each auth user to
-- their company and records whether they are its administrator. The company administrator is
-- a role inside one company and has nothing to do with the platform admin (ADMIN_EMAILS).
--
-- Both tables are written only by the link_new_user_to_company() trigger on auth.users, which
-- runs inside the same transaction as the account insert: the company, the account and the
-- link are created together or not at all, so a failed sign-up never leaves an orphan company.
-- /api/auth/register passes the company name as user metadata (company_name) to signUp.
-- The first account to name a company creates it and becomes its administrator; later
-- accounts naming the same company (after normalization) join it as regular users.
--
-- Signed-in users read only their own membership and their own company (publishable key +
-- session, so RLS applies). Before signing up, /api/companies/check calls company_exists(),
-- which reveals only whether a name is taken. The admin panel reads every company through
-- /api/admin/companies (secret key, after the ADMIN_EMAILS check).

-- Matching key for company names: lower case, common Spanish/Latin accents folded, periods and
-- apostrophes dropped, any other run of non-alphanumerics turned into one space, trimmed.
-- "Paraíso Tropical S.A.", " paraiso   tropical sa" and "PARAISO-TROPICAL SA" all match.
create function public.normalize_company_name(name text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(lower(name), 'áàâäãåéèêëíìîïóòôöõúùûüñçý', 'aaaaaaeeeeiiiiooooouuuuncy'),
      '[.''’`´]', '', 'g'),
    '[^[:alnum:]]+', ' ', 'g'));
$$;

create table public.companies (
  company_id bigint generated always as identity primary key,
  company_name text not null check (
    char_length(btrim(company_name)) between 1 and 200
    and public.normalize_company_name(company_name) <> ''
  ),
  admin_email text not null check (char_length(admin_email) between 3 and 254)
);

-- One company per normalized name. Two simultaneous sign-ups for the same new name serialize
-- on this index: one creates the company, the other waits and then joins it.
create unique index companies_normalized_name_key
  on public.companies (public.normalize_company_name(company_name));

create table public.company_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id bigint not null references public.companies(company_id) on delete restrict,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index company_members_company_id_idx on public.company_members (company_id);
-- One administrator per company, matching the single admin_email on the company.
create unique index company_members_one_admin_key on public.company_members (company_id) where is_admin;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- Supabase grants everything on new public tables by default; start from nothing.
-- No role gets insert, update or delete: only the trigger below writes these tables.
revoke all on public.companies from anon, authenticated;
revoke all on public.company_members from anon, authenticated;
grant select on public.companies to authenticated;
grant select on public.company_members to authenticated;

create policy "Users can read their own membership"
  on public.company_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read their own company"
  on public.companies for select to authenticated
  using (exists (
    select 1 from public.company_members m
    where m.company_id = companies.company_id and m.user_id = (select auth.uid())
  ));

-- Whether a company with this (normalized) name exists. Returns nothing else about it.
create function public.company_exists(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
    where public.normalize_company_name(c.company_name) = public.normalize_company_name(name)
  );
$$;

revoke execute on function public.company_exists(text) from public;
grant execute on function public.company_exists(text) to anon, authenticated;

-- Creates or finds the company named at sign-up and links the new account to it.
-- Any error here aborts the account insert as well.
create function public.link_new_user_to_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := regexp_replace(btrim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '\s+', ' ', 'g');
  new_company_id bigint;
  existing_company_id bigint;
begin
  if char_length(requested_name) not between 1 and 200 or public.normalize_company_name(requested_name) = '' then
    raise exception 'A company name is required to register.' using errcode = '23514';
  end if;

  insert into public.companies (company_name, admin_email)
  values (requested_name, lower(new.email))
  on conflict ((public.normalize_company_name(company_name))) do nothing
  returning companies.company_id into new_company_id;

  if new_company_id is not null then
    insert into public.company_members (user_id, company_id, is_admin) values (new.id, new_company_id, true);
  else
    select c.company_id into strict existing_company_id
    from public.companies c
    where public.normalize_company_name(c.company_name) = public.normalize_company_name(requested_name);
    insert into public.company_members (user_id, company_id, is_admin) values (new.id, existing_company_id, false);
  end if;

  return new;
end;
$$;

revoke execute on function public.link_new_user_to_company() from public, anon, authenticated;

create trigger on_auth_user_created_link_company
  after insert on auth.users
  for each row execute function public.link_new_user_to_company();
