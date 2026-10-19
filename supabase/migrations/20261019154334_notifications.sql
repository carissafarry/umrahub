-- In-app notifications (deadline reminders). Rows are generated server-side
-- with the user's own session; users may only change the read state.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  type text not null,
  -- set for deadline reminders; with (trip_id, type) the dedupe key
  phase_key text,
  title_id text not null,
  title_en text not null,
  body_id text not null,
  body_en text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_trip_type_phase_key unique (trip_id, type, phase_key)
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Row level security: owner only, no delete

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own notifications"
  on public.notifications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      trip_id is null
      or exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
    )
  );

create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the read state is updatable

revoke update on public.notifications from authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;
