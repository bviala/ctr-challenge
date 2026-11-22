-- ============================================================
-- H3: force every consultation write through the RPCs.
--
-- Previously `authenticated` had INSERT/UPDATE on consultations, so a
-- client holding the publishable key + session could write directly and
-- bypass the RPC transition/date checks (and, for field edits, the
-- audit trigger). Revoke those grants, drop the now-unreachable
-- insert/update policies, and move all writes behind SECURITY DEFINER
-- RPCs that enforce ownership and rules explicitly.
--
-- Reads are unaffected (consultations_select / consultation_events_select
-- still apply to the API roles).
-- ============================================================

revoke insert, update on public.consultations from authenticated;

drop policy if exists consultations_insert on public.consultations;
drop policy if exists consultations_update on public.consultations;

-- ------------------------------------------------------------
-- create_consultation: replaces the direct INSERT in POST /api/consultations.
-- ------------------------------------------------------------
create or replace function public.create_consultation(
  p_first_name   text,
  p_last_name    text,
  p_reason       text,
  p_scheduled_at timestamptz
)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.consultations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'Consultation time must be in the future';
  end if;

  if p_first_name is null or btrim(p_first_name) = ''
     or p_last_name is null or btrim(p_last_name) = ''
     or p_reason is null or btrim(p_reason) = '' then
    raise exception 'first_name, last_name and reason are required';
  end if;

  insert into public.consultations
    (student_id, first_name, last_name, reason, scheduled_at)
  values
    (auth.uid(), btrim(p_first_name), btrim(p_last_name), btrim(p_reason),
     p_scheduled_at)
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.create_consultation(text, text, text, timestamptz) from public;
grant execute on function public.create_consultation(text, text, text, timestamptz) to authenticated, service_role;

-- ------------------------------------------------------------
-- State-change RPCs: the caller no longer has UPDATE, so these must run
-- as the definer and enforce ownership explicitly (a definer function
-- bypasses RLS). `create or replace` keeps their existing execute grants.
-- ------------------------------------------------------------
create or replace function public.reschedule_consultation(
  p_consultation_id uuid,
  p_scheduled_at    timestamptz,
  p_note            text default null
)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.consultations;
begin
  if p_scheduled_at <= now() then
    raise exception 'New time must be in the future';
  end if;

  perform set_config('app.consultation_note', coalesce(p_note, ''), true);

  update public.consultations
     set scheduled_at = p_scheduled_at
   where id = p_consultation_id
     and status = 'scheduled'
     and (student_id = auth.uid() or public.is_admin())
  returning * into v_row;

  perform set_config('app.consultation_note', '', true);

  if v_row.id is null then
    raise exception 'Consultation not found or cannot be rescheduled';
  end if;

  return v_row;
end;
$$;

create or replace function public.cancel_consultation(
  p_consultation_id uuid,
  p_note            text default null
)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.consultations;
begin
  perform set_config('app.consultation_note', coalesce(p_note, ''), true);

  update public.consultations
     set status = 'cancelled'
   where id = p_consultation_id
     and status = 'scheduled'
     and (student_id = auth.uid() or public.is_admin())
  returning * into v_row;

  perform set_config('app.consultation_note', '', true);

  if v_row.id is null then
    raise exception 'Consultation not found or cannot be cancelled';
  end if;

  return v_row;
end;
$$;

create or replace function public.complete_consultation(
  p_consultation_id uuid,
  p_note            text default null
)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.consultations;
begin
  perform set_config('app.consultation_note', coalesce(p_note, ''), true);

  update public.consultations
     set status = 'completed'
   where id = p_consultation_id
     and status = 'scheduled'
     and (student_id = auth.uid() or public.is_admin())
  returning * into v_row;

  perform set_config('app.consultation_note', '', true);

  if v_row.id is null then
    raise exception 'Consultation not found or cannot be completed';
  end if;

  return v_row;
end;
$$;

create or replace function public.reopen_consultation(
  p_consultation_id uuid,
  p_note            text default null
)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.consultations;
begin
  perform set_config('app.consultation_note', coalesce(p_note, ''), true);

  update public.consultations
     set status = 'scheduled'
   where id = p_consultation_id
     and status = 'completed'
     and (student_id = auth.uid() or public.is_admin())
  returning * into v_row;

  perform set_config('app.consultation_note', '', true);

  if v_row.id is null then
    raise exception 'Consultation not found or cannot be reopened';
  end if;

  return v_row;
end;
$$;
