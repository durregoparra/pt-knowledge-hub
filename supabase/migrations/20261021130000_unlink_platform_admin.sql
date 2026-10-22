-- diana.urrego.parra@gmail.com is the platform administrator (ADMIN_EMAILS), not a member of
-- any company. The Paraíso Tropical backfill linked it as a regular user; remove that link.
-- Data only; no schema or policy changes. Stops if the account does not exist or if it is
-- some company's administrator, since removing it would leave that company without one.

do $$
declare
  platform_admin_id uuid;
begin
  select id into platform_admin_id from auth.users where lower(email) = 'diana.urrego.parra@gmail.com';
  if platform_admin_id is null then
    raise exception 'diana.urrego.parra@gmail.com has no account.';
  end if;

  if exists (select 1 from public.company_members where user_id = platform_admin_id and is_admin) then
    raise exception 'diana.urrego.parra@gmail.com administers a company; unlink it by hand.';
  end if;

  delete from public.company_members where user_id = platform_admin_id;
end;
$$;
