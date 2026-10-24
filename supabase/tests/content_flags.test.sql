-- RLS, column privilege and constraint tests for content_flags.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

insert into public.preparation_steps (id, phase_key, category_key, title_id, title_en, sort_order, is_published) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '3_6_months_before', 'documents', 'Paspor', 'Passport', 1, true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '3_6_months_before', 'documents', 'Draf', 'Draft', 2, false);

-- User A reports a published step

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Biaya sudah naik')$$,
  'A inserts a flag with only step_id and reason'
);
select is(
  (select user_id from public.content_flags where reason = 'Biaya sudah naik'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to A'
);
select is(
  (select status from public.content_flags where reason = 'Biaya sudah naik'),
  'pending',
  'status defaults to pending'
);
select throws_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000002', 'Di draf')$$,
  '42501', null,
  'flagging an unpublished step is rejected'
);
select throws_ok(
  $$insert into public.content_flags (step_id, user_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Palsu')$$,
  '42501', null,
  'setting user_id explicitly is denied'
);
select throws_ok(
  $$insert into public.content_flags (step_id, status, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', 'resolved', 'Palsu')$$,
  '42501', null,
  'setting status explicitly is denied'
);
select throws_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', '')$$,
  '23514', null,
  'empty reason is rejected'
);
select throws_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', E'  \n\t ')$$,
  '23514', null,
  'whitespace-only reason is rejected'
);
select throws_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', repeat('a', 501))$$,
  '23514', null,
  '501-character reason is rejected'
);
select lives_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', repeat('b', 500))$$,
  '500-character reason is accepted'
);
select throws_ok(
  $$update public.content_flags set reason = 'Diubah' where reason = 'Biaya sudah naik'$$,
  '42501', null,
  'A cannot update own flag (permission denied)'
);
select throws_ok(
  $$update public.content_flags set status = 'resolved' where reason = 'Biaya sudah naik'$$,
  '42501', null,
  'A cannot change the status of own flag'
);
delete from public.content_flags where reason = 'Biaya sudah naik';
select is(
  (select count(*)::int from public.content_flags where reason = 'Biaya sudah naik'),
  1,
  'A''s delete affects no rows'
);
select is(
  (select count(*)::int from public.content_flags),
  2,
  'A reads own two flags'
);

-- User B reports too, and sees only B's flag

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Info visa usang')$$,
  'B inserts a flag'
);
select is(
  (select count(*)::int from public.content_flags where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'B reads none of A''s flags'
);

-- Signed-out users see and write nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.content_flags), 0, 'anon reads no flags');
select throws_ok(
  $$insert into public.content_flags (step_id, reason) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Anonim')$$,
  '42501', null,
  'anon cannot insert a flag'
);

reset role;

select * from finish();
rollback;
