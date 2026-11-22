-- ============================================================
-- consultations: current state of a booking (one row per booking)
-- consultation_events: append-only audit trail
--
-- Design:
--   * reschedule = update scheduled_at in place; the audit trigger
--     records the old/new value.
--   * completion / cancellation = update status; the audit trigger
--     records the transition and the actor.
--   * no completed_at / cancelled_at columns: the event log is the
--     source of truth for *when* something happened.
--   * mutations go through the RPCs below so a free-text note can be
--     passed to the audit trigger via a transaction-local GUC.
-- ============================================================

-- Reusable updated_at trigger function (not created by earlier migrations).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- consultations
-- ------------------------------------------------------------
create table public.consultations (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,

  first_name   text not null,
  last_name    text not null,
  reason       text not null,
  scheduled_at timestamptz not null,

  status       text not null default 'scheduled'
                 check (status in ('scheduled', 'completed', 'cancelled')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.consultations is
  'Current state of a consultation booking; history lives in consultation_events';

create index consultations_student_idx
  on public.consultations (student_id, scheduled_at desc);

create index consultations_status_idx
  on public.consultations (status, scheduled_at);

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- consultation_events: append-only audit trail
-- ------------------------------------------------------------
create table public.consultation_events (
  id               bigint generated always as identity primary key,
  consultation_id  uuid not null
                     references public.consultations (id) on delete cascade,
  event_type       text not null
                     check (event_type in
                       ('created', 'rescheduled', 'cancelled', 'completed', 'reopened',
                        'status_changed')),
  actor_id         uuid references public.profiles (id) on delete set null,

  old_scheduled_at timestamptz,
  new_scheduled_at timestamptz,
  old_status       text,
  new_status       text,
  note             text,

  created_at       timestamptz not null default now()
);

comment on table public.consultation_events is
  'Append-only audit log; written only by the consultations audit trigger';

create index consultation_events_consultation_idx
  on public.consultation_events (consultation_id, created_at);

-- ------------------------------------------------------------
-- Audit trigger: writes one event per meaningful insert/update.
-- security definer: clients only have SELECT on the event table,
-- so the trigger (running as the table owner) is what writes.
--
-- The note comes from the transaction-local GUC set by the RPCs
-- below (`app.consultation_note`); direct updates get null.
-- ------------------------------------------------------------
create or replace function public.log_consultation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_note  text := nullif(current_setting('app.consultation_note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.consultation_events
      (consultation_id, event_type, actor_id, new_scheduled_at, new_status, note)
    values
      (new.id, 'created', auth.uid(), new.scheduled_at, new.status, v_note);
    return new;
  end if;

  -- UPDATE: only log meaningful changes.
  if new.status is distinct from old.status then
    v_event := case new.status
      when 'completed' then 'completed'
      when 'cancelled' then 'cancelled'
      when 'scheduled' then 'reopened'
      else 'status_changed'
    end;
  elsif new.scheduled_at is distinct from old.scheduled_at then
    v_event := 'rescheduled';
  else
    return new;
  end if;

  insert into public.consultation_events
    (consultation_id, event_type, actor_id,
     old_scheduled_at, new_scheduled_at, old_status, new_status, note)
  values
    (new.id, v_event, auth.uid(),
     old.scheduled_at, new.scheduled_at, old.status, new.status, v_note);

  return new;
end;
$$;

create trigger consultations_audit
  after insert or update on public.consultations
  for each row
  execute function public.log_consultation_change();

-- ------------------------------------------------------------
-- RLS: admins see/manage all; students see/manage their own.
-- Same scope for reading the audit history.
-- ------------------------------------------------------------
alter table public.consultations enable row level security;
alter table public.consultation_events enable row level security;

create policy consultations_select
  on public.consultations for select
  using (student_id = auth.uid() or public.is_admin());

create policy consultations_insert
  on public.consultations for insert
  with check (student_id = auth.uid() or public.is_admin());

create policy consultations_update
  on public.consultations for update
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

-- no delete policy: cancel instead of delete

create policy consultation_events_select
  on public.consultation_events for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.consultations c
      where c.id = consultation_id
        and c.student_id = auth.uid()
    )
  );

-- no insert/update/delete policies on events: only the audit trigger writes

-- ------------------------------------------------------------
-- Grants: RLS filters rows, but the API roles still need table
-- privileges (same gotcha as the profiles table).
-- ------------------------------------------------------------
grant select, insert, update on public.consultations to authenticated;
grant select on public.consultation_events to authenticated;

grant select, insert, update, delete on public.consultations to service_role;
grant select on public.consultation_events to service_role;

-- ============================================================
-- Mutation RPCs
--
-- Why RPCs: supabase-js cannot run the UPDATE and the audit INSERT
-- in one transaction, and the client cannot pass a note to the
-- trigger. Each RPC sets a transaction-local GUC that the trigger
-- reads, then performs the UPDATE; the trigger writes the event
-- with the note, atomically.
--
-- security invoker => RLS still applies (students: own rows,
-- admins: all). The `where status = ...` predicate rejects illegal
-- transitions; 0 rows affected => exception.
-- ============================================================

create or replace function public.reschedule_consultation(
  p_consultation_id uuid,
  p_scheduled_at    timestamptz,
  p_note            text default null
)
returns public.consultations
language plpgsql
security invoker
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
security invoker
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
security invoker
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
security invoker
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
  returning * into v_row;

  perform set_config('app.consultation_note', '', true);

  if v_row.id is null then
    raise exception 'Consultation not found or cannot be reopened';
  end if;

  return v_row;
end;
$$;

-- Restrict execute to the intended API roles only.
revoke execute on function public.reschedule_consultation(uuid, timestamptz, text) from public;
revoke execute on function public.cancel_consultation(uuid, text) from public;
revoke execute on function public.complete_consultation(uuid, text) from public;
revoke execute on function public.reopen_consultation(uuid, text) from public;

grant execute on function public.reschedule_consultation(uuid, timestamptz, text) to authenticated, service_role;
grant execute on function public.cancel_consultation(uuid, text) to authenticated, service_role;
grant execute on function public.complete_consultation(uuid, text) to authenticated, service_role;
grant execute on function public.reopen_consultation(uuid, text) to authenticated, service_role;
