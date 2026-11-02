-- RLS, column privilege, counter trigger and constraint tests for
-- step_comment_votes. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- Fixtures (as postgres, the table owner, so RLS does not apply)

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

insert into public.preparation_steps (id, phase_key, category_key, title_id, title_en, sort_order, is_published) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '3_6_months_before', 'documents', 'Paspor', 'Passport', 1, true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '3_6_months_before', 'documents', 'Draf', 'Draft', 2, false);

insert into public.step_comments (id, step_id, user_id, content, is_hidden) values
  -- A's own tip
  ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tips A', false),
  -- B's visible tips
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Tips B1', false),
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Tips B2', false),
  ('eeeeeeee-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Tips B3', false),
  -- Hidden by a moderator in Studio
  ('eeeeeeee-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Tersembunyi', true),
  -- On an unpublished step
  ('eeeeeeee-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Di draf', false);

-- User A rates B's tips

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000001', 1)$$,
  'A votes +1 on B''s visible tip with only comment_id and value'
);
select is(
  (select user_id from public.step_comment_votes where comment_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to A'
);
select is(
  (select helpful_count || '/' || unhelpful_count from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  '1/0',
  'a +1 vote increments helpful_count'
);
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000001', -1)$$,
  '23505', null,
  'a second vote on the same tip by the same user is rejected'
);
select lives_ok(
  $$update public.step_comment_votes set value = -1 where comment_id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  'A changes the vote to -1'
);
select is(
  (select helpful_count || '/' || unhelpful_count from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  '0/1',
  'changing the value moves the count'
);
select is(
  (select helpful_score from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  -1,
  'helpful_score is helpful_count minus unhelpful_count'
);
select lives_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000002', -1)$$,
  'A votes -1 on another of B''s tips'
);
select is(
  (select helpful_count || '/' || unhelpful_count from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  '0/1',
  'a -1 vote increments unhelpful_count'
);
select lives_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000002', 1)
    on conflict (comment_id, user_id) do update set comment_id = excluded.comment_id, value = excluded.value$$,
  'A changes the vote with an upsert, as PostgREST sends it'
);
select is(
  (select helpful_count || '/' || unhelpful_count from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  '1/0',
  'the upsert moves the count'
);
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-00000000000a', 1)$$,
  '42501', null,
  'voting on one''s own tip is denied'
);
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000004', 1)$$,
  '42501', null,
  'voting on a hidden tip is denied'
);
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000005', 1)$$,
  '42501', null,
  'voting on a tip of an unpublished step is denied'
);
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000003', 2)$$,
  '23514', null,
  'a value other than 1 or -1 is rejected'
);
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, user_id, value) values ('eeeeeeee-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1)$$,
  '42501', null,
  'setting user_id explicitly is denied'
);
select throws_ok(
  $$update public.step_comment_votes set comment_id = 'eeeeeeee-0000-0000-0000-00000000000a' where comment_id = 'eeeeeeee-0000-0000-0000-000000000002'$$,
  '42501', null,
  'moving a vote to one''s own tip is denied'
);
select throws_ok(
  $$update public.step_comments set helpful_count = 100 where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  '42501', null,
  'helpful_count cannot be updated directly'
);
select throws_ok(
  $$update public.step_comments set unhelpful_count = 0 where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  '42501', null,
  'unhelpful_count cannot be updated directly'
);
select lives_ok(
  $$delete from public.step_comment_votes where comment_id = 'eeeeeeee-0000-0000-0000-000000000002'$$,
  'A clears a vote'
);
select is(
  (select helpful_count || '/' || unhelpful_count from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  '0/0',
  'clearing the vote decrements the count'
);

-- User B rates A's tip and cannot touch A's votes

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-00000000000a', 1)$$,
  'B votes on A''s tip'
);
select is(
  (select count(*)::int from public.step_comment_votes),
  1,
  'B reads only own vote'
);
update public.step_comment_votes set value = 1
  where user_id = '11111111-1111-1111-1111-111111111111';
delete from public.step_comment_votes
  where user_id = '11111111-1111-1111-1111-111111111111';

reset role;

select is(
  (select value::int from public.step_comment_votes
    where comment_id = 'eeeeeeee-0000-0000-0000-000000000001'
      and user_id = '11111111-1111-1111-1111-111111111111'),
  -1,
  'B''s update and delete left A''s vote untouched'
);

-- B deletes own tip; its votes go with it

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$delete from public.step_comments where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  'B deletes own tip that A voted on'
);

reset role;

select is(
  (select count(*)::int from public.step_comment_votes where comment_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  0,
  'deleting a tip deletes its votes'
);

-- Signed-out users see and write nothing

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.step_comment_votes), 0, 'anon reads no votes');
select throws_ok(
  $$insert into public.step_comment_votes (comment_id, value) values ('eeeeeeee-0000-0000-0000-000000000003', 1)$$,
  '42501', null,
  'anon cannot vote'
);

reset role;

select is(
  (select count(*)::int from public.step_comment_votes),
  1,
  'only B''s vote on A''s tip remains'
);
select is(
  (select helpful_count || '/' || unhelpful_count from public.step_comments where id = 'eeeeeeee-0000-0000-0000-00000000000a'),
  '1/0',
  'A''s tip counts B''s vote'
);
select is(
  (select count(*)::int from public.step_comments c
    where c.helpful_count <> (select count(*) from public.step_comment_votes v where v.comment_id = c.id and v.value = 1)
       or c.unhelpful_count <> (select count(*) from public.step_comment_votes v where v.comment_id = c.id and v.value = -1)),
  0,
  'every tip''s counters equal its vote rows'
);
select is(
  (select count(*)::int from public.step_comments where helpful_count <> 0 or unhelpful_count <> 0),
  1,
  'no other tip has counts'
);

select * from finish();
rollback;
