-- RLS, column privilege, trigger and constraint tests for step_comments.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local',
   '{"full_name": "Aisyah Rahman", "name": "Aisyah", "avatar_url": "https://lh3.googleusercontent.com/a/aisyah"}'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local',
   '{"name": "Budi", "picture": "http://example.com/budi.png"}');

insert into public.preparation_steps (id, phase_key, category_key, title_id, title_en, sort_order, is_published) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '3_6_months_before', 'documents', 'Paspor', 'Passport', 1, true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '3_6_months_before', 'documents', 'Draf', 'Draft', 2, false);

-- Hidden by a moderator in Studio
insert into public.step_comments (id, step_id, user_id, content, is_hidden) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Tersembunyi', true);

-- User A posts on a published step

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Tips dari A')$$,
  'A inserts a comment with only step_id and content'
);
select is(
  (select user_id from public.step_comments where content = 'Tips dari A'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to A'
);
select is(
  (select author_name from public.step_comments where content = 'Tips dari A'),
  'Aisyah Rahman',
  'author_name comes from full_name in A''s metadata'
);
select is(
  (select author_avatar_url from public.step_comments where content = 'Tips dari A'),
  'https://lh3.googleusercontent.com/a/aisyah',
  'author_avatar_url comes from A''s https avatar_url'
);
select throws_ok(
  $$insert into public.step_comments (step_id, user_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Palsu')$$,
  '42501', null,
  'setting user_id explicitly is denied'
);
select throws_ok(
  $$insert into public.step_comments (step_id, author_name, content) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Admin', 'Palsu')$$,
  '42501', null,
  'setting author_name explicitly is denied'
);
select throws_ok(
  $$insert into public.step_comments (step_id, is_hidden, content) values ('aaaaaaaa-0000-0000-0000-000000000001', false, 'Palsu')$$,
  '42501', null,
  'setting is_hidden explicitly is denied'
);
select throws_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', '')$$,
  '23514', null,
  'empty content is rejected'
);
select throws_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', E'  \n\t ')$$,
  '23514', null,
  'whitespace-only content is rejected'
);
select throws_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', repeat('a', 1001))$$,
  '23514', null,
  '1001-character content is rejected'
);
select lives_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', repeat('b', 1000))$$,
  '1000-character content is accepted'
);
select throws_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000002', 'Di draf')$$,
  '42501', null,
  'commenting on an unpublished step is rejected'
);
select throws_ok(
  $$update public.step_comments set content = 'Diubah' where content = 'Tips dari A'$$,
  '42501', null,
  'A cannot update own comment (permission denied)'
);

-- User B reads A's comment but cannot delete it

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$insert into public.step_comments (step_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Tips dari B')$$,
  'B inserts a comment'
);
select is(
  (select author_name from public.step_comments where content = 'Tips dari B'),
  'Budi',
  'author_name falls back to name'
);
select is(
  (select author_avatar_url from public.step_comments where content = 'Tips dari B'),
  null::text,
  'a non-https avatar is stored as null'
);
select is(
  (select count(*)::int from public.step_comments where content = 'Tips dari A'),
  1,
  'B reads A''s comment'
);
select is(
  (select count(*)::int from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  0,
  'B does not read own hidden comment'
);
delete from public.step_comments where content = 'Tips dari A';

-- User A still has the comment and deletes it

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.step_comments where content = 'Tips dari A'),
  1,
  'B''s delete left A''s comment untouched'
);
select is(
  (select count(*)::int from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  0,
  'A does not read the hidden comment'
);
delete from public.step_comments where content = 'Tips dari A';
select is(
  (select count(*)::int from public.step_comments where content = 'Tips dari A'),
  0,
  'A deletes own comment'
);

-- Signed-out users see nothing

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.step_comments), 0, 'anon reads no comments');

reset role;

select is(
  (select count(*)::int from public.step_comments),
  3,
  'the hidden, B''s and A''s 1000-character comments remain'
);

select * from finish();
rollback;
