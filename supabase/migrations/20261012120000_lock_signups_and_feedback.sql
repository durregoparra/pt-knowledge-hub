-- Registration is now open to anyone, so "signed in" no longer means "admin".
-- Signed-in users lose all direct access to the landing form tables: the admin panel reads
-- them through /api/admin/* (secret key, after the ADMIN_EMAILS check) and the landing
-- forms write through /api/signups and /api/feedback (secret key).
-- RLS stays enabled with no policies, so only the secret key can reach these tables.

drop policy "Signed-in users can read"   on public.signups;
drop policy "Signed-in users can insert" on public.signups;
drop policy "Signed-in users can read"   on public.feedback;
drop policy "Signed-in users can insert" on public.feedback;

revoke select, insert on public.signups, public.feedback from authenticated;
