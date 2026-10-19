-- RLS, column privilege and constraint tests for notifications. Run with
-- `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

insert into public.trips (id, user_id, name, departure_city, planned_departure_date) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Umrah A', 'Jakarta', '2027-01-01'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Umrah B', 'Surabaya', '2027-01-01');

-- User A creates and reads their own reminders

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$insert into public.notifications (id, trip_id, type, phase_key, title_id, title_en, body_id, body_en)
    values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'deadline_reminder', '2_3_months_before', 'Judul', 'Title', 'Isi', 'Body')$$,
  'A inserts a reminder for own trip (user_id defaults to auth.uid())'
);
select is((select count(*)::int from public.notifications), 1, 'A reads own notification');
select throws_ok(
  $$insert into public.notifications (trip_id, type, phase_key, title_id, title_en, body_id, body_en)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'deadline_reminder', '2_3_months_before', 'Judul', 'Title', 'Isi', 'Body')$$,
  '23505', null,
  'a duplicate reminder for the same trip and phase is rejected'
);
select throws_ok(
  $$insert into public.notifications (trip_id, type, phase_key, title_id, title_en, body_id, body_en)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 'deadline_reminder', '1_month_before', 'Judul', 'Title', 'Isi', 'Body')$$,
  '42501', null,
  'A cannot insert a reminder for B''s trip'
);

update public.notifications set is_read = true, read_at = now()
  where id = 'dddddddd-0000-0000-0000-000000000001';
select is(
  (select is_read from public.notifications where id = 'dddddddd-0000-0000-0000-000000000001'),
  true,
  'A can update is_read on own notification'
);
select throws_ok(
  $$update public.notifications set title_id = 'Diubah' where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  '42501', null,
  'A cannot update title_id (permission denied)'
);

-- User B sees and changes none of A's rows

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is((select count(*)::int from public.notifications), 0, 'B reads none of A''s notifications');
update public.notifications set is_read = false where id = 'dddddddd-0000-0000-0000-000000000001';
select throws_ok(
  $$insert into public.notifications (user_id, trip_id, type, phase_key, title_id, title_en, body_id, body_en)
    values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000001', 'deadline_reminder', '1_week_before', 'Judul', 'Title', 'Isi', 'Body')$$,
  '42501', null,
  'B cannot insert a notification owned by A'
);

-- Signed-out users see nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.notifications), 0, 'anon reads no notifications');

reset role;

select is(
  (select is_read from public.notifications where id = 'dddddddd-0000-0000-0000-000000000001'),
  true,
  'B''s update left A''s notification untouched'
);

select * from finish();
rollback;
