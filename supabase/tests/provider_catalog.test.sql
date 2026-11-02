-- RLS, privilege, constraint and cascade tests for the provider catalog.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(61);

-- Fixtures (as postgres, the table owner, so RLS does not apply)
-- Providers: 01 travel and 02 muthawif and 04 travel are published,
-- 03 muthawif is not

insert into public.service_types (id, key, name_id, name_en, sort_order) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'muthawif', 'Muthawif', 'Muthawif', 10),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'umrah_package', 'Paket Umrah', 'Umrah package', 20);

insert into public.providers (id, provider_type, name, whatsapp_number, bank_account_text, is_published) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'travel', 'Travel Amanah', '6281234567890', 'BSI 123 a.n. PT Amanah', true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'muthawif', 'Ustadz Ahmad', '6281111111111', null, true),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'muthawif', 'Ustadz Draf', null, null, false),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'travel', 'Travel Barakah', null, null, true);

insert into public.provider_affiliations (id, member_provider_id, organization_provider_id, relationship_type, status, started_on, ended_on, confirmed_by_member, confirmed_by_organization) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001', 'works_at', 'active', '2025-01-01', null, true, true),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004', 'partner', 'active', '2025-01-01', null, false, true),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004', 'partner', 'active', '2025-01-01', null, true, false),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004', 'works_at', 'ended', '2024-01-01', '2024-12-31', true, true),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000001', 'works_at', 'active', '2025-01-01', null, true, true);

insert into public.provider_verifications (id, provider_id, status, verified_on, expires_on, criteria_met, reviewed_by) values
  ('dddddddd-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'verified', '2026-01-01', '2027-01-01', array['business_license', 'active_phone'], 'Admin A'),
  ('dddddddd-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', 'pending', null, null, '{}', null);

insert into public.provider_catalog_items (id, provider_id, service_type_id, title_id, sort_order, is_published) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'Paket Ramadan', 10, true),
  ('eeeeeeee-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001', null, 'Paket draf', 20, false),
  ('eeeeeeee-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', null, 'Bimbingan', 10, true);

insert into public.provider_reviews (id, provider_id, rating, content, display_name, is_hidden) values
  ('ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 5, 'Sangat membantu', 'Siti R.', false),
  ('ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001', 1, 'Disembunyikan', 'Budi S.', true),
  ('ffffffff-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', 4, 'Baik', 'Ani W.', false);

-- Check and unique constraints (as postgres)

select throws_ok(
  $$insert into public.providers (provider_type, name) values ('agent', 'Agen')$$,
  '23514', null,
  'provider_type agent is rejected'
);
select throws_ok(
  $$insert into public.providers (provider_type, name) values ('travel', E'  \n\t ')$$,
  '23514', null,
  'blank provider name is rejected'
);
select throws_ok(
  $$insert into public.providers (provider_type, name, whatsapp_number) values ('travel', 'Travel', '+62812345678')$$,
  '23514', null,
  'whatsapp_number with + is rejected'
);
select throws_ok(
  $$insert into public.provider_reviews (provider_id, rating, content, display_name) values ('bbbbbbbb-0000-4000-8000-000000000001', 0, 'Isi', 'Siti R.')$$,
  '23514', null,
  'rating 0 is rejected'
);
select throws_ok(
  $$insert into public.provider_reviews (provider_id, rating, content, display_name) values ('bbbbbbbb-0000-4000-8000-000000000001', 6, 'Isi', 'Siti R.')$$,
  '23514', null,
  'rating 6 is rejected'
);
select throws_ok(
  $$insert into public.provider_reviews (provider_id, rating, content, display_name) values ('bbbbbbbb-0000-4000-8000-000000000001', 5, E' \n ', 'Siti R.')$$,
  '23514', null,
  'blank review content is rejected'
);
select throws_ok(
  $$insert into public.provider_affiliations (member_provider_id, organization_provider_id, relationship_type, started_on) values ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004', 'friend', '2025-01-01')$$,
  '23514', null,
  'relationship_type friend is rejected'
);
select throws_ok(
  $$insert into public.provider_affiliations (member_provider_id, organization_provider_id, relationship_type, started_on) values ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'partner', '2025-01-01')$$,
  '23514', null,
  'an affiliation with itself is rejected'
);
select throws_ok(
  $$insert into public.provider_affiliations (member_provider_id, organization_provider_id, relationship_type, status, started_on, ended_on) values ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004', 'works_at', 'ended', '2025-05-01', '2025-04-01')$$,
  '23514', null,
  'ended_on before started_on is rejected'
);
select throws_ok(
  $$insert into public.provider_verifications (provider_id, status, verified_on) values ('bbbbbbbb-0000-4000-8000-000000000002', 'verified', '2026-01-01')$$,
  '23514', null,
  'a verified verification without expires_on is rejected'
);
select throws_ok(
  $$insert into public.provider_verifications (provider_id, criteria_met) values ('bbbbbbbb-0000-4000-8000-000000000004', array['identity', 'ktp_scan'])$$,
  '23514', null,
  'an unknown criterion ktp_scan is rejected'
);
select throws_ok(
  $$insert into public.provider_catalog_items (provider_id, title_id, image_url, sort_order) values ('bbbbbbbb-0000-4000-8000-000000000001', 'Paket', 'http://example.com/a.jpg', 30)$$,
  '23514', null,
  'an http: image_url is rejected'
);
select throws_ok(
  $$insert into public.provider_verifications (provider_id) values ('bbbbbbbb-0000-4000-8000-000000000001')$$,
  '23505', null,
  'a second verification for the same provider is rejected'
);

-- A signed-in user reads only published content

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.providers where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  1,
  'a published provider is visible'
);
select is(
  (select count(*)::int from public.providers where id = 'bbbbbbbb-0000-4000-8000-000000000003'),
  0,
  'an unpublished provider is not visible'
);
select throws_ok(
  $$select bank_account_text from public.providers$$,
  '42501', null,
  'bank_account_text is not readable'
);
select lives_ok(
  $$select id, name, provider_type, whatsapp_number, is_dummy from public.providers$$,
  'public provider columns are readable'
);

select throws_ok(
  $$select reviewed_by from public.provider_verifications$$,
  '42501', null,
  'reviewed_by is not readable'
);
select lives_ok(
  $$select status, verified_on, expires_on, criteria_met from public.provider_verifications$$,
  'verification result columns are readable'
);
select is(
  (select status from public.provider_verifications where provider_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'verified',
  'the verification of a published provider is visible'
);
select is(
  (select count(*)::int from public.provider_verifications where provider_id = 'bbbbbbbb-0000-4000-8000-000000000003'),
  0,
  'the verification of an unpublished provider is not visible'
);

select is(
  (select count(*)::int from public.provider_affiliations where id = 'cccccccc-0000-4000-8000-000000000001'),
  1,
  'an active affiliation confirmed by both published sides is visible'
);
select is(
  (select count(*)::int from public.provider_affiliations where id = 'cccccccc-0000-4000-8000-000000000002'),
  0,
  'an affiliation not confirmed by the member is not visible'
);
select is(
  (select count(*)::int from public.provider_affiliations where id = 'cccccccc-0000-4000-8000-000000000003'),
  0,
  'an affiliation not confirmed by the organization is not visible'
);
select is(
  (select count(*)::int from public.provider_affiliations where id = 'cccccccc-0000-4000-8000-000000000004'),
  0,
  'an ended affiliation is not visible'
);
select is(
  (select count(*)::int from public.provider_affiliations where id = 'cccccccc-0000-4000-8000-000000000005'),
  0,
  'an affiliation with an unpublished provider is not visible'
);

select is(
  (select count(*)::int from public.provider_catalog_items where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  1,
  'a published catalog item of a published provider is visible'
);
select is(
  (select count(*)::int from public.provider_catalog_items where id = 'eeeeeeee-0000-4000-8000-000000000002'),
  0,
  'an unpublished catalog item is not visible'
);
select is(
  (select count(*)::int from public.provider_catalog_items where id = 'eeeeeeee-0000-4000-8000-000000000003'),
  0,
  'a catalog item of an unpublished provider is not visible'
);

select is(
  (select count(*)::int from public.provider_reviews where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'a visible review of a published provider is visible'
);
select is(
  (select count(*)::int from public.provider_reviews where id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'a hidden review is not visible'
);
select is(
  (select count(*)::int from public.provider_reviews where id = 'ffffffff-0000-4000-8000-000000000003'),
  0,
  'a review of an unpublished provider is not visible'
);

select is(
  (select count(*)::int from public.service_types),
  2,
  'all service types are visible'
);

-- A signed-in user writes nothing

select throws_ok(
  $$insert into public.service_types (key, name_id, name_en, sort_order) values ('x', 'X', 'X', 99)$$,
  '42501', null,
  'insert into service_types is denied'
);
select throws_ok(
  $$update public.service_types set name_id = 'X'$$,
  '42501', null,
  'update of service_types is denied'
);
select throws_ok(
  $$delete from public.service_types$$,
  '42501', null,
  'delete from service_types is denied'
);
select throws_ok(
  $$insert into public.providers (provider_type, name) values ('travel', 'Palsu')$$,
  '42501', null,
  'insert into providers is denied'
);
select throws_ok(
  $$update public.providers set name = 'Palsu'$$,
  '42501', null,
  'update of providers is denied'
);
select throws_ok(
  $$delete from public.providers$$,
  '42501', null,
  'delete from providers is denied'
);
select throws_ok(
  $$insert into public.provider_affiliations (member_provider_id, organization_provider_id, relationship_type, started_on) values ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000004', 'partner', '2025-01-01')$$,
  '42501', null,
  'insert into provider_affiliations is denied'
);
select throws_ok(
  $$update public.provider_affiliations set confirmed_by_member = true$$,
  '42501', null,
  'update of provider_affiliations is denied'
);
select throws_ok(
  $$delete from public.provider_affiliations$$,
  '42501', null,
  'delete from provider_affiliations is denied'
);
select throws_ok(
  $$insert into public.provider_verifications (provider_id) values ('bbbbbbbb-0000-4000-8000-000000000004')$$,
  '42501', null,
  'insert into provider_verifications is denied'
);
select throws_ok(
  $$update public.provider_verifications set status = 'verified'$$,
  '42501', null,
  'update of provider_verifications is denied'
);
select throws_ok(
  $$delete from public.provider_verifications$$,
  '42501', null,
  'delete from provider_verifications is denied'
);
select throws_ok(
  $$insert into public.provider_catalog_items (provider_id, title_id, sort_order) values ('bbbbbbbb-0000-4000-8000-000000000001', 'Palsu', 99)$$,
  '42501', null,
  'insert into provider_catalog_items is denied'
);
select throws_ok(
  $$update public.provider_catalog_items set is_published = true$$,
  '42501', null,
  'update of provider_catalog_items is denied'
);
select throws_ok(
  $$delete from public.provider_catalog_items$$,
  '42501', null,
  'delete from provider_catalog_items is denied'
);
select throws_ok(
  $$insert into public.provider_reviews (provider_id, rating, content, display_name) values ('bbbbbbbb-0000-4000-8000-000000000001', 5, 'Palsu', 'Palsu P.')$$,
  '42501', null,
  'insert into provider_reviews is denied'
);
select throws_ok(
  $$update public.provider_reviews set is_hidden = false$$,
  '42501', null,
  'update of provider_reviews is denied'
);
select throws_ok(
  $$delete from public.provider_reviews$$,
  '42501', null,
  'delete from provider_reviews is denied'
);

-- Signed-out users read nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$select id from public.service_types$$, '42501', null, 'anon cannot read service_types');
select throws_ok($$select id from public.providers$$, '42501', null, 'anon cannot read providers');
select throws_ok($$select id from public.provider_affiliations$$, '42501', null, 'anon cannot read provider_affiliations');
select throws_ok($$select id from public.provider_verifications$$, '42501', null, 'anon cannot read provider_verifications');
select throws_ok($$select id from public.provider_catalog_items$$, '42501', null, 'anon cannot read provider_catalog_items');
select throws_ok($$select id from public.provider_reviews$$, '42501', null, 'anon cannot read provider_reviews');

-- Deleting a provider removes its child rows (as postgres)

reset role;

delete from public.providers where id = 'bbbbbbbb-0000-4000-8000-000000000001';

select is(
  (select count(*)::int from public.provider_affiliations
   where 'bbbbbbbb-0000-4000-8000-000000000001' in (member_provider_id, organization_provider_id)),
  0,
  'deleting a provider cascades to its affiliations'
);
select is(
  (select count(*)::int from public.provider_verifications where provider_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  0,
  'deleting a provider cascades to its verification'
);
select is(
  (select count(*)::int from public.provider_catalog_items where provider_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  0,
  'deleting a provider cascades to its catalog items'
);
select is(
  (select count(*)::int from public.provider_reviews where provider_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  0,
  'deleting a provider cascades to its reviews'
);

select * from finish();
rollback;
