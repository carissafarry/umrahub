-- Tests for public.schedule_option_capacity (seat totals per option, no
-- identity). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'cap-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'cap-b@test.local');

-- user A owns nine trips (one participation per trip and schedule), B owns none
insert into public.trips (id, user_id, name, departure_city, planned_departure_date)
select ('bbbbbbbb-1000-4000-8000-00000000000' || n)::uuid,
       '11111111-1111-1111-1111-111111111111', 'Capacity trip ' || n, 'Jakarta', '2027-03-01'
from generate_series(1, 9) as n;

insert into public.service_types (id, key, name_id, name_en, sort_order) values
  ('aaaaaaaa-1000-4000-8000-000000000001', 'capacity_test_ziarah', 'Ziarah', 'Ziyarah', 1);

insert into public.providers (id, provider_type, name, is_published) values
  ('cccccccc-1000-4000-8000-000000000001', 'muthawif', 'Published provider', true),
  ('cccccccc-1000-4000-8000-000000000002', 'travel', 'Draft provider', false);

insert into public.schedules (
  id, provider_id, service_type_id, city, schedule_date,
  attendance_deadline, option_deadline, payment_deadline, is_published
) values
  -- with participations
  ('dddddddd-1000-4000-8000-000000000001', 'cccccccc-1000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001',
   'Makkah', '2027-03-05', '2027-03-02 12:00+03', '2027-03-03 12:00+03', '2027-03-04 12:00+03', true),
  -- without participations
  ('dddddddd-1000-4000-8000-000000000002', 'cccccccc-1000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001',
   'Madinah', '2027-03-06', '2027-03-03 12:00+03', '2027-03-04 12:00+03', '2027-03-05 12:00+03', true),
  -- unpublished schedule of a published provider
  ('dddddddd-1000-4000-8000-000000000003', 'cccccccc-1000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001',
   'Thaif', '2027-03-07', '2027-03-04 12:00+03', '2027-03-05 12:00+03', '2027-03-06 12:00+03', false),
  -- published schedule of an unpublished provider
  ('dddddddd-1000-4000-8000-000000000004', 'cccccccc-1000-4000-8000-000000000002', 'aaaaaaaa-1000-4000-8000-000000000001',
   'Madinah', '2027-03-08', '2027-03-05 12:00+03', '2027-03-06 12:00+03', '2027-03-07 12:00+03', true);

insert into public.schedule_options (id, schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order) values
  ('eeeeeeee-1000-4000-8000-000000000001', 'dddddddd-1000-4000-8000-000000000001', 'Hiace', 4, 12, 150.00, 1),
  ('eeeeeeee-1000-4000-8000-000000000002', 'dddddddd-1000-4000-8000-000000000001', 'Bus', 20, 45, 80.00, 2),
  ('eeeeeeee-1000-4000-8000-000000000003', 'dddddddd-1000-4000-8000-000000000002', 'Bus', 20, 45, 80.00, 1),
  ('eeeeeeee-1000-4000-8000-000000000004', 'dddddddd-1000-4000-8000-000000000003', 'Bus', 20, 45, 80.00, 1),
  ('eeeeeeee-1000-4000-8000-000000000005', 'dddddddd-1000-4000-8000-000000000004', 'Bus', 20, 45, 80.00, 1);

insert into public.participations (trip_id, schedule_id, seats, status, created_by) values
  ('bbbbbbbb-1000-4000-8000-000000000001', 'dddddddd-1000-4000-8000-000000000001', 2, 'interested', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000002', 'dddddddd-1000-4000-8000-000000000001', 3, 'interested', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000003', 'dddddddd-1000-4000-8000-000000000001', 3, 'fix', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000004', 'dddddddd-1000-4000-8000-000000000001', 2, 'awaiting_payment', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000005', 'dddddddd-1000-4000-8000-000000000001', 1, 'paid_claimed', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000006', 'dddddddd-1000-4000-8000-000000000001', 4, 'confirmed', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000007', 'dddddddd-1000-4000-8000-000000000001', 5, 'cancelled', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000008', 'dddddddd-1000-4000-8000-000000000001', 6, 'declined', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-1000-4000-8000-000000000009', 'dddddddd-1000-4000-8000-000000000001', 7, 'lapsed', '11111111-1111-1111-1111-111111111111');

-- Definition

select is(
  (select prosecdef from pg_proc where oid = 'public.schedule_option_capacity(uuid[])'::regprocedure),
  true,
  'the function is security definer'
);
select is(
  (select proconfig from pg_proc where oid = 'public.schedule_option_capacity(uuid[])'::regprocedure),
  array['search_path=""'],
  'the function pins an empty search_path'
);
select is(
  (select provolatile from pg_proc where oid = 'public.schedule_option_capacity(uuid[])'::regprocedure),
  's',
  'the function is stable'
);
-- argument plus result columns: nothing that identifies a trip, user or participation
select is(
  (select proargnames from pg_proc where oid = 'public.schedule_option_capacity(uuid[])'::regprocedure),
  array['p_schedule_ids', 'option_id', 'schedule_id', 'confirmed', 'fix', 'interested'],
  'the result exposes only option, schedule and the three counts'
);

-- Privileges

select is(has_function_privilege('anon', 'public.schedule_option_capacity(uuid[])', 'execute'), false, 'anon has no execute');
select is(has_function_privilege('authenticated', 'public.schedule_option_capacity(uuid[])', 'execute'), true, 'authenticated has execute');

set local role anon;
select throws_ok(
  $$select * from public.schedule_option_capacity(array['dddddddd-1000-4000-8000-000000000001']::uuid[])$$,
  '42501', null,
  'anon cannot call the function'
);
reset role;

-- As a signed-in user who owns no participation (B)

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::integer from public.participations
    where schedule_id = 'dddddddd-1000-4000-8000-000000000001'),
  0,
  'user B cannot read any participation of the schedule'
);
select is(
  (select count(*)::integer from public.schedule_option_capacity(array['dddddddd-1000-4000-8000-000000000001']::uuid[])),
  2,
  'one row per option of the schedule'
);
select results_eq(
  $$select confirmed, fix, interested
    from public.schedule_option_capacity(array['dddddddd-1000-4000-8000-000000000001']::uuid[])
    where option_id = 'eeeeeeee-1000-4000-8000-000000000001'$$,
  $$values (4, 6, 5)$$,
  'seats are summed: fix includes awaiting_payment and paid_claimed, cancelled/declined/lapsed count nowhere'
);
select results_eq(
  $$select confirmed, fix, interested
    from public.schedule_option_capacity(array['dddddddd-1000-4000-8000-000000000001']::uuid[])
    where option_id = 'eeeeeeee-1000-4000-8000-000000000002'$$,
  $$values (4, 6, 5)$$,
  'every option of a schedule shows the same counts'
);
select results_eq(
  $$select confirmed, fix, interested
    from public.schedule_option_capacity(array['dddddddd-1000-4000-8000-000000000002']::uuid[])$$,
  $$values (0, 0, 0)$$,
  'a schedule without participations shows zeros'
);
select is(
  (select count(*)::integer from public.schedule_option_capacity(array[
    'dddddddd-1000-4000-8000-000000000001', 'dddddddd-1000-4000-8000-000000000002'
  ]::uuid[])),
  3,
  'several schedules in one call'
);
select is_empty(
  $$select * from public.schedule_option_capacity(array[
    'dddddddd-1000-4000-8000-000000000003', 'dddddddd-1000-4000-8000-000000000004'
  ]::uuid[])$$,
  'unpublished schedules and schedules of unpublished providers return nothing'
);
select is_empty(
  $$select * from public.schedule_option_capacity(array[]::uuid[])$$,
  'an empty id list returns nothing'
);

select * from finish();
rollback;
