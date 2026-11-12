-- RLS and constraint tests for trips.planned_return_date and trip_legs. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

insert into public.trips (id, user_id, name, departure_city, planned_departure_date) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Umrah A', 'Jakarta', '2027-03-01');

-- Owner inserts, reads and updates legs of their own trip

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$insert into public.trip_legs (id, trip_id, city, start_date, end_date, sort_order) values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Makkah', '2027-03-02', '2027-03-06', 1)$$,
  'A inserts a Makkah leg into own trip'
);
select lives_ok(
  $$insert into public.trip_legs (id, trip_id, city, start_date, end_date, sort_order) values ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Madinah', '2027-03-06', '2027-03-09', 2)$$,
  'A inserts a Madinah leg into own trip (may start the day leg 1 ends)'
);
select is((select count(*)::int from public.trip_legs), 2, 'A reads own legs');

select lives_ok(
  $$update public.trip_legs set end_date = '2027-03-07' where id = 'dddddddd-0000-0000-0000-000000000002'$$,
  'A updates a leg of own trip'
);
select is(
  (select end_date from public.trip_legs where id = 'dddddddd-0000-0000-0000-000000000002'),
  '2027-03-07'::date,
  'A''s update is stored'
);

-- Constraints

select throws_ok(
  $$insert into public.trip_legs (trip_id, city, start_date, end_date, sort_order) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Thaif', '2027-03-02', '2027-03-03', 3)$$,
  '23514', null,
  'an unknown city is rejected'
);
select throws_ok(
  $$insert into public.trip_legs (trip_id, city, start_date, end_date, sort_order) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Makkah', '2027-03-05', '2027-03-04', 3)$$,
  '23514', null,
  'end_date before start_date is rejected'
);
select throws_ok(
  $$insert into public.trip_legs (trip_id, city, start_date, end_date, sort_order) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Makkah', '2027-03-02', '2027-03-03', 0)$$,
  '23514', null,
  'sort_order 0 is rejected'
);
select throws_ok(
  $$insert into public.trip_legs (trip_id, city, start_date, end_date, sort_order) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Makkah', '2027-03-02', '2027-03-03', 1)$$,
  '23505', null,
  'a second leg with the same (trip_id, sort_order) is rejected'
);
select throws_ok(
  $$update public.trips set planned_return_date = '2027-02-28' where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '23514', null,
  'planned_return_date before planned_departure_date is rejected'
);
select lives_ok(
  $$update public.trips set planned_return_date = '2027-03-10' where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'planned_return_date on or after planned_departure_date is accepted'
);

-- Another user cannot read, insert, update or delete A's legs

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from public.trip_legs where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'B sees none of A''s legs'
);
select throws_ok(
  $$insert into public.trip_legs (trip_id, city, start_date, end_date, sort_order) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Makkah', '2027-03-02', '2027-03-03', 3)$$,
  '42501', null,
  'B cannot insert a leg into A''s trip'
);

update public.trip_legs set end_date = '2027-03-08' where id = 'dddddddd-0000-0000-0000-000000000002';
delete from public.trip_legs where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- Signed-out users see nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.trip_legs), 0, 'anon reads no trip_legs');

-- B's update and delete affected zero rows

reset role;

select is(
  (select end_date from public.trip_legs where id = 'dddddddd-0000-0000-0000-000000000002'),
  '2027-03-07'::date,
  'B''s update left A''s leg untouched'
);
select is(
  (select count(*)::int from public.trip_legs where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  2,
  'B''s delete left A''s legs in place'
);

-- updated_at is set on update

update public.trip_legs set updated_at = '2000-01-01';

select is(
  (select count(*)::int from public.trip_legs where updated_at = now()),
  (select count(*)::int from public.trip_legs),
  'trip_legs.updated_at is set by the trigger'
);

-- Owner deletes a leg of their own trip

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$delete from public.trip_legs where id = 'dddddddd-0000-0000-0000-000000000002'$$,
  'A deletes a leg of own trip'
);
select is((select count(*)::int from public.trip_legs), 1, 'A''s delete removed the leg');

-- Deleting the trip deletes its legs

delete from public.trips where id = 'bbbbbbbb-0000-0000-0000-000000000001';

reset role;

select is(
  (select count(*)::int from public.trip_legs where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'legs are deleted with their trip'
);

select * from finish();
rollback;
