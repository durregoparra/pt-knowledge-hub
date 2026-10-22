-- Accounts created before companies existed have no company. Create Paraíso Tropical, with
-- viviana@test.com as its administrator, and link every account that has no company yet to it
-- (viviana@test.com as administrator, everyone else as a regular user).
-- Data only; no schema or policy changes. Stops if the administrator account does not exist.

do $$
declare
  admin_id uuid;
  paraiso_id bigint;
begin
  select id into admin_id from auth.users where lower(email) = 'viviana@test.com';
  if admin_id is null then
    raise exception 'viviana@test.com has no account; cannot make it the Paraíso Tropical administrator.';
  end if;

  insert into public.companies (company_name, admin_email)
  values ('Paraíso Tropical', 'viviana@test.com')
  on conflict ((public.normalize_company_name(company_name))) do nothing
  returning company_id into paraiso_id;
  if paraiso_id is null then
    raise exception 'A company matching Paraíso Tropical already exists; link its users by hand.';
  end if;

  insert into public.company_members (user_id, company_id, is_admin)
  select u.id, paraiso_id, u.id = admin_id
  from auth.users u
  where not exists (select 1 from public.company_members m where m.user_id = u.id);
end;
$$;
