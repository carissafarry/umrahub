-- Checks for the dummy providers, schedules, reviews and catalog. Run with
-- `supabase test db`. Everything is scoped to the dummy id prefix.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

create temporary view dummy_providers as
  select * from public.providers where id::text like 'd0000000-0000-4000-8000-%';
create temporary view dummy_schedules as
  select * from public.schedules where id::text like 'd0000000-0000-4000-8000-%';

select is((select count(*)::int from dummy_providers), 10, '10 dummy providers');
select set_eq(
  $$select distinct provider_type from dummy_providers$$,
  array['muthawif', 'travel'],
  'dummy providers include both types'
);
select is(
  (select count(*)::int from dummy_providers where is_dummy and is_published),
  10,
  'every dummy provider is flagged is_dummy and published'
);
select is(
  (select count(*)::int from dummy_schedules where is_dummy),
  (select count(*)::int from dummy_schedules),
  'every dummy schedule is flagged is_dummy'
);
select is(
  (select count(*)::int from public.providers p
   where p.is_dummy and p.id::text not like 'd0000000-0000-4000-8000-%'),
  0,
  'no is_dummy provider outside the dummy id prefix'
);

select is(
  (select count(*)::int from dummy_providers p
   where not exists (
     select 1 from public.provider_verifications v
     where v.provider_id = p.id and v.status = 'verified'
   )),
  1,
  'exactly one dummy provider has no verified verification'
);

select cmp_ok(
  (select count(*)::int from public.provider_affiliations a
   where a.id::text like 'd0000000-0000-4000-8000-%'
     and a.confirmed_by_member and a.confirmed_by_organization and a.status = 'active'),
  '>=', 1,
  'at least one affiliation is active and confirmed by both sides'
);
select cmp_ok(
  (select count(*)::int from public.provider_affiliations a
   where a.id::text like 'd0000000-0000-4000-8000-%'
     and not (a.confirmed_by_member and a.confirmed_by_organization and a.status = 'active')),
  '>=', 1,
  'at least one affiliation is not shown to users'
);

select is(
  (select count(*)::int from dummy_schedules
   where schedule_date not between date '2027-01-01' and date '2027-01-31'),
  0,
  'every dummy schedule is in January 2027'
);
select set_eq(
  $$select distinct city from dummy_schedules$$,
  array['Makkah', 'Thaif', 'Madinah'],
  'dummy schedules cover the three cities'
);
select is(
  (select count(*)::int from dummy_schedules
   where not (attendance_deadline <= option_deadline and option_deadline <= payment_deadline)),
  0,
  'deadline order holds on every dummy schedule'
);
select is_empty(
  $$select s.id from dummy_schedules s
    where (select count(*) from public.schedule_options o where o.schedule_id = s.id) < 2$$,
  'every dummy schedule has at least 2 options'
);
select cmp_ok(
  (select count(*)::int from dummy_schedules s
   where s.city = 'Thaif'
     and (select count(*) from public.schedule_options o where o.schedule_id = s.id) = 2),
  '>=', 1,
  'at least one Thaif schedule has two options'
);
select cmp_ok(
  (select count(*)::int from dummy_schedules s
   where s.city = 'Thaif'
     and exists (select 1 from public.schedule_options o
                 where o.schedule_id = s.id and o.minimum_participants = 35 and o.price_sar = 40)
     and exists (select 1 from public.schedule_options o
                 where o.schedule_id = s.id and o.vehicle_format = 'Hiace')),
  '>=', 1,
  'a Thaif schedule has a 35-person bus at 40 SAR and a Hiace'
);
select is(
  (select count(*)::int from public.participations p
   where p.schedule_id in (select id from dummy_schedules)),
  0,
  'no participations reference dummy schedules'
);

select cmp_ok(
  (select count(*)::int from public.provider_reviews r
   where r.provider_id in (select id from dummy_providers)),
  '>=', 20,
  'at least 20 dummy reviews'
);
select cmp_ok(
  (select count(*)::int from public.provider_reviews r
   where r.provider_id in (select id from dummy_providers) and r.is_hidden),
  '>=', 1,
  'at least one dummy review is hidden'
);
select cmp_ok(
  (select count(*)::int from public.provider_catalog_items c
   where c.provider_id in (select id from dummy_providers)),
  '>=', 15,
  'at least 15 dummy catalog items'
);
select cmp_ok(
  (select count(*)::int from public.provider_catalog_items c
   where c.provider_id in (select id from dummy_providers) and not c.is_published),
  '>=', 1,
  'at least one dummy catalog item is unpublished'
);
select cmp_ok(
  (select count(*)::int from public.service_types
   where key in ('umrah_guidance', 'city_tour', 'ziarah')),
  '=', 3,
  'the three service types exist'
);

-- What a signed-in user sees (provider 5 is the unverified one)

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.providers where id = 'd0000000-0000-4000-8000-020000000005'),
  1,
  'the unverified provider is still listed'
);
select is(
  (select count(*)::int from public.provider_verifications
   where provider_id = 'd0000000-0000-4000-8000-020000000005'),
  0,
  'no verification is visible for the unverified provider'
);
select is(
  (select count(*)::int from public.provider_affiliations
   where id::text like 'd0000000-0000-4000-8000-%'),
  4,
  'only the 4 active, confirmed affiliations are visible (ended and one-sided rows are hidden)'
);

reset role;

select * from finish();
rollback;
