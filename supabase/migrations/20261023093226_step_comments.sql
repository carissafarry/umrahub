-- Step comments (tips): any signed-in user reads visible comments on
-- published steps and posts or deletes their own. The author's name and
-- avatar are snapshotted from auth.users by a trigger, since other users'
-- auth rows are not readable. Hiding is a Studio (table owner) action.

create table public.step_comments (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.preparation_steps (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  author_avatar_url text,
  content text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- btrim with explicit whitespace: plain btrim only strips spaces
  constraint step_comments_content_length check (
    char_length(btrim(content, E' \t\r\n')) between 1 and 1000
  )
);

create index step_comments_step_id_created_at_idx
  on public.step_comments (step_id, created_at desc);

create trigger set_updated_at before update on public.step_comments
  for each row execute function public.set_updated_at();

-- Author fields always come from the author's Google metadata, never from
-- the client; the email is never used as a name.

create function public.set_step_comment_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb;
  avatar text;
begin
  select u.raw_user_meta_data into meta from auth.users u where u.id = new.user_id;
  new.author_name = coalesce(
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    ''
  );
  avatar = coalesce(nullif(meta ->> 'avatar_url', ''), nullif(meta ->> 'picture', ''));
  new.author_avatar_url = case when avatar like 'https://%' then avatar end;
  return new;
end;
$$;

create trigger set_step_comment_author before insert on public.step_comments
  for each row execute function public.set_step_comment_author();

-- Row level security: visible comments for any signed-in user, own rows
-- for insert and delete, no update

alter table public.step_comments enable row level security;

create policy "Signed-in users read visible step comments"
  on public.step_comments for select to authenticated
  using (
    is_hidden = false
    and exists (select 1 from public.preparation_steps s where s.id = step_id)
  );

create policy "Users insert own step comments"
  on public.step_comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.preparation_steps s
      where s.id = step_id and s.is_published = true
    )
  );

create policy "Users delete own step comments"
  on public.step_comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Users only choose the step and the text; nothing is editable

revoke insert, update on public.step_comments from authenticated;
grant insert (step_id, content) on public.step_comments to authenticated;
