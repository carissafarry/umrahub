-- RLS and constraint tests for the MVP schema. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

insert into public.preparation_steps (id, phase_key, category_key, title_id, title_en, sort_order, is_published) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '3_6_months_before', 'documents', 'Paspor', 'Passport', 1, true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '3_6_months_before', 'documents', 'Draf', 'Draft', 2, false);

insert into public.city_cost_overrides (step_id, city, cost_min, cost_max) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Jakarta', 350000, 650000);

-- User A creates and reads their own rows

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$insert into public.trips (id, name, departure_city) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Umroh A', 'Jakarta')$$,
  'A inserts own trip (user_id defaults to auth.uid())'
);
select lives_ok(
  $$insert into public.travelers (id, trip_id, name) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Traveler A')$$,
  'A inserts traveler into own trip'
);
select lives_ok(
  $$insert into public.trip_step_config (trip_id, step_id, tracking_mode) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'individual')$$,
  'A inserts step config into own trip'
);
select lives_ok(
  $$insert into public.trip_step_progress (trip_id, step_id) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'A inserts shared progress row into own trip'
);
select lives_ok(
  $$insert into public.trip_step_progress (trip_id, step_id, traveler_id) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001')$$,
  'A inserts per-traveler progress row into own trip'
);
select throws_ok(
  $$insert into public.trip_step_progress (trip_id, step_id) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '23505', null,
  'a second shared progress row for the same step is rejected (nulls not distinct)'
);

select is((select count(*)::int from public.trips), 1, 'A reads own trip');
select is((select user_id from public.trips), '11111111-1111-1111-1111-111111111111'::uuid, 'A trip is owned by A');
select is((select count(*)::int from public.travelers), 1, 'A reads own traveler');
select is((select count(*)::int from public.trip_step_config), 1, 'A reads own step config');
select is((select count(*)::int from public.trip_step_progress), 2, 'A reads own progress rows');

-- Content tables for a signed-in user

select is((select count(*)::int from public.preparation_steps), 1, 'authenticated reads published steps only');
select is_empty(
  $$select 1 from public.preparation_steps where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'authenticated does not see an unpublished step'
);
select is((select count(*)::int from public.city_cost_overrides), 1, 'authenticated reads all city cost overrides');
select throws_ok(
  $$insert into public.preparation_steps (phase_key, category_key, title_id, title_en, sort_order) values ('x', 'x', 'x', 'x', 9)$$,
  '42501', null,
  'authenticated cannot insert into preparation_steps'
);
select throws_ok(
  $$insert into public.city_cost_overrides (step_id, city, cost_min, cost_max) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Surabaya', 1, 2)$$,
  '42501', null,
  'authenticated cannot insert into city_cost_overrides'
);

-- User B cannot see or change A's rows

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$insert into public.trips (id, name, departure_city) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Umroh B', 'Surabaya')$$,
  'B inserts own trip'
);
select lives_ok(
  $$insert into public.travelers (id, trip_id, name) values ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Traveler B')$$,
  'B inserts traveler into own trip'
);

select is((select count(*)::int from public.trips where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'B sees none of A''s trips');
select is((select count(*)::int from public.travelers where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'B sees none of A''s travelers');
select is((select count(*)::int from public.trip_step_config where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'B sees none of A''s step config');
select is((select count(*)::int from public.trip_step_progress where trip_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'B sees none of A''s progress rows');

update public.trips set name = 'Hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
delete from public.trips where id = 'bbbbbbbb-0000-0000-0000-000000000001';

select throws_ok(
  $$insert into public.travelers (trip_id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Intruder')$$,
  '42501', null,
  'B cannot insert a traveler into A''s trip'
);
select throws_ok(
  $$insert into public.trip_step_progress (trip_id, step_id) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '42501', null,
  'B cannot insert a progress row into A''s trip'
);
select throws_ok(
  $$insert into public.trips (user_id, name, departure_city) values ('11111111-1111-1111-1111-111111111111', 'Fake', 'Jakarta')$$,
  '42501', null,
  'B cannot insert a trip owned by A'
);
select throws_ok(
  $$insert into public.trip_step_progress (trip_id, step_id, traveler_id) values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001')$$,
  '23503', null,
  'progress row with a traveler from another trip is rejected'
);

-- Signed-out users see nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.preparation_steps), 0, 'anon reads no preparation_steps');
select is((select count(*)::int from public.city_cost_overrides), 0, 'anon reads no city_cost_overrides');
select is((select count(*)::int from public.trips), 0, 'anon reads no trips');
select is((select count(*)::int from public.travelers), 0, 'anon reads no travelers');
select is((select count(*)::int from public.trip_step_config), 0, 'anon reads no trip_step_config');
select is((select count(*)::int from public.trip_step_progress), 0, 'anon reads no trip_step_progress');

-- B's update and delete of A's trip affected zero rows

reset role;

select is(
  (select name from public.trips where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'Umroh A',
  'B''s update and delete left A''s trip untouched'
);

-- updated_at is set on update in every table that has it

update public.preparation_steps set updated_at = '2000-01-01';
update public.city_cost_overrides set updated_at = '2000-01-01';
update public.trips set updated_at = '2000-01-01';
update public.travelers set updated_at = '2000-01-01';
update public.trip_step_config set updated_at = '2000-01-01';
update public.trip_step_progress set updated_at = '2000-01-01';

select is(
  (select count(*)::int from public.preparation_steps where updated_at = now()),
  (select count(*)::int from public.preparation_steps),
  'preparation_steps.updated_at is set by the trigger'
);
select is(
  (select count(*)::int from public.city_cost_overrides where updated_at = now()),
  (select count(*)::int from public.city_cost_overrides),
  'city_cost_overrides.updated_at is set by the trigger'
);
select is(
  (select count(*)::int from public.trips where updated_at = now()),
  (select count(*)::int from public.trips),
  'trips.updated_at is set by the trigger'
);
select is(
  (select count(*)::int from public.travelers where updated_at = now()),
  (select count(*)::int from public.travelers),
  'travelers.updated_at is set by the trigger'
);
select is(
  (select count(*)::int from public.trip_step_config where updated_at = now()),
  (select count(*)::int from public.trip_step_config),
  'trip_step_config.updated_at is set by the trigger'
);
select is(
  (select count(*)::int from public.trip_step_progress where updated_at = now()),
  (select count(*)::int from public.trip_step_progress),
  'trip_step_progress.updated_at is set by the trigger'
);

select * from finish();
rollback;
