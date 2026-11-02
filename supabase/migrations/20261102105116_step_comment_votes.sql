-- Tip ratings: a signed-in user rates another user's visible tip as helpful
-- (+1) or not helpful (-1), one vote per tip. Votes are private to their
-- owner; the totals live on step_comments, kept by a definer trigger, so
-- every reader can sort by them without seeing who voted.

alter table public.step_comments
  add column helpful_count integer not null default 0
    constraint step_comments_helpful_count_nonnegative check (helpful_count >= 0),
  add column unhelpful_count integer not null default 0
    constraint step_comments_unhelpful_count_nonnegative check (unhelpful_count >= 0),
  add column helpful_score integer generated always as (helpful_count - unhelpful_count) stored;

create index step_comments_step_id_helpful_score_idx
  on public.step_comments (step_id, helpful_score desc, created_at desc);

create table public.step_comment_votes (
  comment_id uuid not null references public.step_comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id),
  constraint step_comment_votes_value check (value in (-1, 1))
);

create trigger set_updated_at before update on public.step_comment_votes
  for each row execute function public.set_updated_at();

-- Counters always equal the number of +1 and -1 rows: the old vote is taken
-- off and the new one added, so a changed value (or comment) moves the count.
-- Relative updates lock the comment row, so concurrent votes don't race.

create function public.count_step_comment_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.step_comments
    set
      helpful_count = helpful_count - (old.value = 1)::int,
      unhelpful_count = unhelpful_count - (old.value = -1)::int
    where id = old.comment_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.step_comments
    set
      helpful_count = helpful_count + (new.value = 1)::int,
      unhelpful_count = unhelpful_count + (new.value = -1)::int
    where id = new.comment_id;
  end if;
  return null;
end;
$$;

create trigger count_step_comment_vote
  after insert or update or delete on public.step_comment_votes
  for each row execute function public.count_step_comment_vote();

-- Row level security: own rows only; a vote must be on a visible tip of a
-- published step written by someone else

alter table public.step_comment_votes enable row level security;

create policy "Users read own step comment votes"
  on public.step_comment_votes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users vote on other users' visible step comments"
  on public.step_comment_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.step_comments c
      join public.preparation_steps s on s.id = c.step_id
      where c.id = comment_id
        and c.is_hidden = false
        and s.is_published = true
        and c.user_id <> (select auth.uid())
    )
  );

create policy "Users change own step comment votes"
  on public.step_comment_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.step_comments c
      join public.preparation_steps s on s.id = c.step_id
      where c.id = comment_id
        and c.is_hidden = false
        and s.is_published = true
        and c.user_id <> (select auth.uid())
    )
  );

create policy "Users delete own step comment votes"
  on public.step_comment_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Users only choose the tip and the value. A PostgREST upsert sets every
-- payload column on conflict (`comment_id = excluded.comment_id`), which
-- needs the update privilege on comment_id as well; the update policy's
-- check keeps any comment_id on a tip the user may vote on.

revoke insert, update on public.step_comment_votes from authenticated;
grant insert (comment_id, value) on public.step_comment_votes to authenticated;
grant update (value) on public.step_comment_votes to authenticated;
grant update (comment_id) on public.step_comment_votes to authenticated;
