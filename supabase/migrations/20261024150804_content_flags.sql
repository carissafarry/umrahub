-- Content flags: a signed-in user reports outdated information on a
-- published step. Users insert and read only their own flags; reviewing
-- (changing status) is a Studio (table owner) action.

create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.preparation_steps (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- btrim with explicit whitespace: plain btrim only strips spaces
  constraint content_flags_reason_length check (
    char_length(btrim(reason, E' \t\r\n')) between 1 and 500
  ),
  constraint content_flags_status_check check (
    status in ('pending', 'reviewed', 'resolved')
  )
);

create index content_flags_user_id_created_at_idx
  on public.content_flags (user_id, created_at desc);

create trigger set_updated_at before update on public.content_flags
  for each row execute function public.set_updated_at();

-- Row level security: own rows for select and insert, no update or delete

alter table public.content_flags enable row level security;

create policy "Users read own content flags"
  on public.content_flags for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own content flags"
  on public.content_flags for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.preparation_steps s
      where s.id = step_id and s.is_published = true
    )
  );

-- Users only choose the step and the reason; nothing is editable

revoke insert, update on public.content_flags from authenticated;
grant insert (step_id, reason) on public.content_flags to authenticated;
