-- Close direct writes from the browser: anonymous visitors can no longer insert.
-- The landing forms now go through the server routes (/api/signups, /api/feedback),
-- which write with the secret key. Signed-in users keep their existing access.

revoke insert on public.signups, public.feedback from anon;

alter policy "Anyone can sign up" on public.signups to authenticated;
alter policy "Anyone can sign up" on public.signups rename to "Signed-in users can insert";

alter policy "Anyone can send feedback" on public.feedback to authenticated;
alter policy "Anyone can send feedback" on public.feedback rename to "Signed-in users can insert";
