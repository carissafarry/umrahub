-- RLS, privilege and constraint tests for the Jadwal schema (is_trip_member,
-- schedules, schedule_options, participations, payment_proofs). Run with
-- `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(58);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

insert into public.trips (id, user_id, name, departure_city, planned_departure_date) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Umrah A', 'Jakarta', '2027-03-01'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Umrah B', 'Surabaya', '2027-03-01');

insert into public.service_types (id, key, name_id, name_en, sort_order) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'jadwal_test_ziarah', 'Ziarah', 'Ziyarah', 1);

insert into public.providers (id, provider_type, name, is_published) values
  ('cccccccc-0000-4000-8000-000000000001', 'muthawif', 'Published provider', true),
  ('cccccccc-0000-4000-8000-000000000002', 'travel', 'Draft provider', false);

insert into public.schedules (
  id, provider_id, service_type_id, city, schedule_date,
  attendance_deadline, option_deadline, payment_deadline, is_published
) values
  -- published schedule of a published provider
  ('dddddddd-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Makkah', '2027-03-05', '2027-03-02 12:00+03', '2027-03-03 12:00+03', '2027-03-04 12:00+03', true),
  -- unpublished schedule of a published provider
  ('dddddddd-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Thaif', '2027-03-06', '2027-03-03 12:00+03', '2027-03-04 12:00+03', '2027-03-05 12:00+03', false),
  -- published schedule of an unpublished provider
  ('dddddddd-0000-4000-8000-000000000003', 'cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Madinah', '2027-03-07', '2027-03-04 12:00+03', '2027-03-05 12:00+03', '2027-03-06 12:00+03', true);

insert into public.schedule_options (id, schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Hiace', 4, 12, 150.00, 1),
  ('eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'Bus', 20, 45, 80.00, 1),
  ('eeeeeeee-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000003', 'Bus', 20, 45, 80.00, 1);

-- Schedule and option constraints

select throws_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Makkah', '2027-03-05', '2027-03-03', '2027-03-02', '2027-03-04')$$,
  '23514', null,
  'option_deadline before attendance_deadline is rejected'
);
select throws_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Makkah', '2027-03-05', '2027-03-02', '2027-03-04', '2027-03-03')$$,
  '23514', null,
  'payment_deadline before option_deadline is rejected'
);
select throws_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Jeddah', '2027-03-05', '2027-03-02', '2027-03-03', '2027-03-04')$$,
  '23514', null,
  'an unknown city is rejected'
);
select throws_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline, discussion_group_url)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Makkah', '2027-03-05', '2027-03-02', '2027-03-03', '2027-03-04', 'http://chat.whatsapp.com/x')$$,
  '23514', null,
  'an http: discussion_group_url is rejected'
);
select throws_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline, final_group_url)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Makkah', '2027-03-05', '2027-03-02', '2027-03-03', '2027-03-04', 'javascript:alert(1)')$$,
  '23514', null,
  'a non-https final_group_url is rejected'
);
select lives_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline, discussion_group_url, final_group_url)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Thaif', '2027-03-05', '2027-03-02', '2027-03-02', '2027-03-02', 'https://chat.whatsapp.com/a', 'https://chat.whatsapp.com/b')$$,
  'equal deadlines, Thaif and https group links are accepted'
);
select throws_ok(
  $$insert into public.schedule_options (schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)
    values ('dddddddd-0000-4000-8000-000000000001', 'Bus', 10, 9, 80, 2)$$,
  '23514', null,
  'capacity below minimum_participants is rejected'
);
select throws_ok(
  $$insert into public.schedule_options (schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)
    values ('dddddddd-0000-4000-8000-000000000001', 'Bus', 0, 9, 80, 2)$$,
  '23514', null,
  'minimum_participants 0 is rejected'
);
select throws_ok(
  $$insert into public.schedule_options (schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)
    values ('dddddddd-0000-4000-8000-000000000001', 'Bus', 1, 9, -1, 2)$$,
  '23514', null,
  'a negative price is rejected'
);
select throws_ok(
  $$insert into public.schedule_options (schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)
    values ('dddddddd-0000-4000-8000-000000000001', E' \t ', 1, 9, 80, 2)$$,
  '23514', null,
  'a blank vehicle_format is rejected'
);
select throws_ok(
  $$insert into public.schedule_options (schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)
    values ('dddddddd-0000-4000-8000-000000000001', 'Bus', 1, 9, 80, 1)$$,
  '23505', null,
  'a duplicate (schedule_id, sort_order) is rejected'
);

-- is_trip_member

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select ok(public.is_trip_member('bbbbbbbb-0000-0000-0000-000000000001'), 'is_trip_member is true for the owner');
select ok(not public.is_trip_member('bbbbbbbb-0000-0000-0000-000000000002'), 'is_trip_member is false for another user''s trip');
select ok(not public.is_trip_member('bbbbbbbb-0000-0000-0000-0000000000ff'), 'is_trip_member is false for a missing trip');

-- Published schedules and options are readable; drafts are not

select is(
  (select array_agg(id order by id) from public.schedules),
  array['dddddddd-0000-4000-8000-000000000001']::uuid[],
  'A reads only the published schedule of a published provider'
);
select is(
  (select array_agg(id order by id) from public.schedule_options),
  array['eeeeeeee-0000-4000-8000-000000000001']::uuid[],
  'A reads only options of that schedule'
);

-- No client writes on schedules and options

select throws_ok(
  $$insert into public.schedules (provider_id, service_type_id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline)
    values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Makkah', '2027-03-05', '2027-03-02', '2027-03-03', '2027-03-04')$$,
  '42501', null,
  'insert into schedules is denied'
);
select throws_ok($$update public.schedules set city = 'Madinah'$$, '42501', null, 'update of schedules is denied');
select throws_ok($$delete from public.schedules$$, '42501', null, 'delete from schedules is denied');
select throws_ok(
  $$insert into public.schedule_options (schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)
    values ('dddddddd-0000-4000-8000-000000000001', 'Bus', 1, 9, 80, 5)$$,
  '42501', null,
  'insert into schedule_options is denied'
);
select throws_ok($$update public.schedule_options set price_sar = 1$$, '42501', null, 'update of schedule_options is denied');
select throws_ok($$delete from public.schedule_options$$, '42501', null, 'delete from schedule_options is denied');

-- Owner joins a published schedule

select lives_ok(
  $$insert into public.participations (trip_id, schedule_id, seats) values ('bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 2)$$,
  'A joins a published schedule with own trip'
);
select is(
  (select status from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'interested',
  'a new participation defaults to interested'
);
select is(
  (select created_by from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'created_by defaults to the signed-in user'
);

select throws_ok(
  $$insert into public.participations (trip_id, schedule_id, seats) values ('bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 1)$$,
  '23505', null,
  'a second participation of the same trip in the same schedule is rejected'
);
select throws_ok(
  $$insert into public.participations (trip_id, schedule_id, seats, status) values ('bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-4000-8000-000000000002', 1, 'confirmed')$$,
  '42501', null,
  'inserting with status confirmed is rejected'
);
select throws_ok(
  $$insert into public.participations (trip_id, schedule_id, seats, created_by) values ('bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-4000-8000-000000000002', 1, '22222222-2222-2222-2222-222222222222')$$,
  '42501', null,
  'a client cannot set created_by on insert'
);
select throws_ok(
  $$insert into public.participations (trip_id, schedule_id, seats) values ('bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-4000-8000-000000000002', 1)$$,
  '42501', null,
  'an unpublished schedule cannot be joined'
);
select throws_ok(
  $$insert into public.participations (trip_id, schedule_id, seats) values ('bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-4000-8000-000000000003', 1)$$,
  '42501', null,
  'a schedule of an unpublished provider cannot be joined'
);
select throws_ok(
  $$insert into public.participations (trip_id, schedule_id, seats) values ('bbbbbbbb-0000-0000-0000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 1)$$,
  '42501', null,
  'A cannot join with another user''s trip'
);

-- Seats are 1 to 10

select throws_ok(
  $$update public.participations set seats = 0 where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '23514', null,
  'seats 0 is rejected'
);
select throws_ok(
  $$update public.participations set seats = 11 where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '23514', null,
  'seats 11 is rejected'
);

-- Statuses users may set

select lives_ok(
  $$update public.participations set status = 'fix' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'A sets fix'
);
select lives_ok(
  $$update public.participations set status = 'declined' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'A sets declined'
);
select lives_ok(
  $$update public.participations set status = 'cancelled' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'A sets cancelled'
);
select lives_ok(
  $$update public.participations set status = 'paid_claimed' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'A sets paid_claimed'
);
select is(
  (select status from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'paid_claimed',
  'A''s status changes are stored'
);

-- Statuses only Studio sets

select throws_ok(
  $$update public.participations set status = 'confirmed' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501', null,
  'A cannot set confirmed'
);
select throws_ok(
  $$update public.participations set status = 'lapsed' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501', null,
  'A cannot set lapsed'
);
select throws_ok(
  $$update public.participations set status = 'awaiting_payment' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501', null,
  'A cannot set awaiting_payment'
);
select throws_ok(
  $$update public.participations set created_by = '22222222-2222-2222-2222-222222222222' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501', null,
  'a client cannot change created_by'
);

-- Owner adds and reads a payment proof

select lives_ok(
  $$insert into public.payment_proofs (participation_id, storage_path)
    select id, 'proofs/a/1.jpg' from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'A adds a payment proof to own participation'
);
select is((select count(*)::int from public.payment_proofs), 1, 'A reads own payment proof');
select is(
  (select created_by from public.payment_proofs),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'payment proof created_by defaults to the signed-in user'
);
select throws_ok(
  $$insert into public.payment_proofs (participation_id, storage_path, created_by)
    select id, 'proofs/a/2.jpg', '22222222-2222-2222-2222-222222222222' from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501', null,
  'a client cannot set payment proof created_by'
);

-- Another user cannot read, change or add to A's participation

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is((select count(*)::int from public.participations), 0, 'B sees none of A''s participations');
select is((select count(*)::int from public.payment_proofs), 0, 'B sees none of A''s payment proofs');

update public.participations set status = 'cancelled';

reset role;

select is(
  (select status from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'paid_claimed',
  'B''s update left A''s participation untouched'
);

-- B tries to add a proof to A's participation (id read as postgres)

do $$
begin
  perform set_config('test.a_participation', id::text, true)
  from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001';
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$insert into public.payment_proofs (participation_id, storage_path) values (current_setting('test.a_participation')::uuid, 'proofs/b/1.jpg')$$,
  '42501', null,
  'B cannot add a payment proof to A''s participation'
);

-- Lapsed rows may be paid late; confirmed rows are final for users

reset role;
update public.participations set status = 'lapsed' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$update public.participations set status = 'paid_claimed' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'A moves a lapsed participation to paid_claimed'
);
select is(
  (select status from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'paid_claimed',
  'the late payment claim is stored'
);

reset role;
update public.participations set status = 'confirmed' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

update public.participations set status = 'cancelled' where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001';
update public.participations set seats = 3 where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001';

select is(
  (select status || '/' || seats from public.participations where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'confirmed/2',
  'A cannot change a confirmed participation'
);

-- Signed-out users read nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$select id from public.schedules$$, '42501', null, 'anon cannot read schedules');
select throws_ok($$select id from public.schedule_options$$, '42501', null, 'anon cannot read schedule_options');
select throws_ok($$select id from public.participations$$, '42501', null, 'anon cannot read participations');
select throws_ok($$select id from public.payment_proofs$$, '42501', null, 'anon cannot read payment_proofs');

-- updated_at is set on update (as postgres)

reset role;

update public.participations set updated_at = '2000-01-01';

select is(
  (select count(*)::int from public.participations where updated_at = now()),
  (select count(*)::int from public.participations),
  'participations.updated_at is set by the trigger'
);

select * from finish();
rollback;
