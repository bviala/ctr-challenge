-- Restrict is_admin() to the roles that can actually reach the tables it
-- guards.
--
-- `is_admin()` is evaluated inside RLS policies, which run with the caller's
-- privileges, so `authenticated` must keep EXECUTE. `anon` never reaches those
-- policies (it has no SELECT on profiles/consultations) and does not need it.
--
-- Trigger functions (handle_new_user, set_updated_at, log_consultation_change)
-- are intentionally left as-is: they are invoked by the trigger machinery, not
-- by PostgREST, and changing their execute grants risks breaking trigger
-- execution.

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;
