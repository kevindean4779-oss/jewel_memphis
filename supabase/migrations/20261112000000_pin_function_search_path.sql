-- Pins the search_path of the auth functions, so a same-named object in another
-- schema can't change what they run. Already applied to the project.
alter function public.audit_log_immutable() set search_path = public, pg_temp;
alter function public.rate_limit_hit(text, integer, integer) set search_path = public, pg_temp;
alter function public.update_user_access(uuid, uuid, text, text, boolean) set search_path = public, pg_temp;
