-- ============================================================
-- profiles: grant table-level SELECT to authenticated only.
--
-- RLS (profiles_select_own_or_admin) only filters *rows*; the
-- PostgREST role still needs the table privilege. The app reads
-- profiles only while authenticated, so `anon` gets nothing
-- (least privilege). Anonymous requests are redirected to login
-- before any profile lookup happens.
-- ============================================================

grant select on public.profiles to authenticated;
