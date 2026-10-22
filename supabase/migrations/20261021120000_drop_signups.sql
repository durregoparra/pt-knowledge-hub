-- Sign-up is removed from the app: the landing waitlist form (/api/signups) and the admin
-- Signups panel (/api/admin/signups) are gone, and nothing else reads or writes this table.
-- It holds only waitlist emails; accounts live in auth.users, untouched here.
-- No cascade: if anything still depended on the table, this would fail instead of dropping it.
drop table public.signups;
