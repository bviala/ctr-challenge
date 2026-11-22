-- RLS / RPC ownership tests.
--
-- Run against the local stack:
--   supabase start
--   supabase db reset
--   supabase test db

begin;
select plan(4);

-- ------------------------------------------------------------------ arrange
-- The handle_new_user trigger creates the matching profiles rows.
insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', 'authenticated', 'authenticated');

update public.profiles
set role = 'admin'
where id = '33333333-3333-3333-3333-333333333333';

insert into public.consultations
  (id, student_id, first_name, last_name, reason, scheduled_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A', 'Student', 'checkup', now() + interval '1 day'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B', 'Student', 'checkup', now() + interval '1 day');

-- ------------------------------------------------------- act as student A
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111"}',
  true
);

select is(
  (select count(*)::int from public.consultations
   where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'student A can read their own consultation'
);

select is(
  (select count(*)::int from public.consultations
   where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'student A cannot read student B''s consultation'
);

select throws_ok(
  $$ select public.cancel_consultation('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  'P0001',
  'Consultation not found or cannot be cancelled',
  'student A cannot cancel student B''s consultation'
);

-- ------------------------------------------------------- act as admin
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333"}',
  true
);

select is(
  (select count(*)::int from public.consultations
   where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'admin can read any consultation'
);

select * from finish();
rollback;
