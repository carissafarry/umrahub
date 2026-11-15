-- Jadwal: schedules offered by providers, their vehicle options, the trips
-- that join them and the payment proofs of those participations. Schedules
-- and options are edited in Studio (table owner bypasses RLS) and readable
-- by signed-in users only when published; anon gets nothing.
--
-- - schedules: one provider's service in a city on a date, with three
--   deadlines (attendance, option, payment) and the discussion and final
--   group links.
-- - schedule_options: vehicle format with minimum participants, capacity
--   and price per person in SAR.
-- - participations: a trip in a schedule (not in one option), with seats,
--   status and who created it. One row per trip per schedule; cancelling
--   and re-joining updates the same row.
-- - payment_proofs: storage path of an uploaded proof (the bucket comes
--   later); no file contents or numbers.
--
-- Trip access always goes through is_trip_member, so shared trips only
-- change that function. Users set interested, fix, declined, cancelled and
-- paid_claimed; awaiting_payment, confirmed and lapsed are set in Studio.

-- Trip membership: owner only for now

create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_trip_member(uuid) from public, anon;
grant execute on function public.is_trip_member(uuid) to authenticated;

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  service_type_id uuid not null references public.service_types (id),
  city text not null,
  schedule_date date not null,
  attendance_deadline timestamptz not null,
  option_deadline timestamptz not null,
  payment_deadline timestamptz not null,
  discussion_group_url text,
  final_group_url text,
  is_dummy boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a check constraint, not an enum, so a later city is a constraint change
  constraint schedules_city_check check (city in ('Makkah', 'Thaif', 'Madinah')),
  constraint schedules_deadline_order check (
    attendance_deadline <= option_deadline and option_deadline <= payment_deadline
  ),
  constraint schedules_discussion_group_url_https check (
    discussion_group_url is null or discussion_group_url ~ '^https://'
  ),
  constraint schedules_final_group_url_https check (
    final_group_url is null or final_group_url ~ '^https://'
  )
);

create index schedules_provider_id_idx on public.schedules (provider_id);
create index schedules_city_schedule_date_idx on public.schedules (city, schedule_date);

create table public.schedule_options (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  vehicle_format text not null,
  minimum_participants integer not null,
  capacity integer not null,
  price_sar numeric(10, 2) not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- btrim with explicit whitespace: plain btrim only strips spaces
  constraint schedule_options_vehicle_format_length check (
    char_length(btrim(vehicle_format, E' \t\r\n')) between 1 and 80
  ),
  constraint schedule_options_minimum_participants_check check (minimum_participants >= 1),
  constraint schedule_options_capacity_check check (capacity >= minimum_participants),
  constraint schedule_options_price_sar_check check (price_sar >= 0),
  -- also serves as the schedule_id index
  constraint schedule_options_schedule_sort_order_key unique (schedule_id, sort_order)
);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  seats integer not null,
  status text not null default 'interested',
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participations_seats_check check (seats between 1 and 10),
  constraint participations_status_check check (
    status in (
      'interested', 'fix', 'awaiting_payment', 'paid_claimed',
      'confirmed', 'declined', 'lapsed', 'cancelled'
    )
  ),
  -- also serves as the trip_id index
  constraint participations_trip_schedule_key unique (trip_id, schedule_id)
);

create index participations_schedule_id_idx on public.participations (schedule_id);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations (id) on delete cascade,
  storage_path text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_proofs_participation_id_idx on public.payment_proofs (participation_id);

create trigger set_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.schedule_options
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.participations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payment_proofs
  for each row execute function public.set_updated_at();

-- Row level security

alter table public.schedules enable row level security;
alter table public.schedule_options enable row level security;
alter table public.participations enable row level security;
alter table public.payment_proofs enable row level security;

create policy "Signed-in users read published schedules"
  on public.schedules for select to authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_published = true
    )
  );

create policy "Signed-in users read options of published schedules"
  on public.schedule_options for select to authenticated
  using (
    exists (
      select 1
      from public.schedules s
      join public.providers p on p.id = s.provider_id
      where s.id = schedule_id and s.is_published = true and p.is_published = true
    )
  );

create policy "Trip members read participations"
  on public.participations for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Trip members join published schedules"
  on public.participations for insert to authenticated
  with check (
    public.is_trip_member(trip_id)
    and status = 'interested'
    and exists (
      select 1
      from public.schedules s
      join public.providers p on p.id = s.provider_id
      where s.id = schedule_id and s.is_published = true and p.is_published = true
    )
  );

-- A confirmed row is final for users; awaiting_payment, confirmed and
-- lapsed are set in Studio only. Which move makes sense (e.g. no cancel
-- after a proof) is checked by the Server Actions, not here.
create policy "Trip members update participations"
  on public.participations for update to authenticated
  using (public.is_trip_member(trip_id) and status <> 'confirmed')
  with check (
    public.is_trip_member(trip_id)
    and status in ('interested', 'fix', 'declined', 'cancelled', 'paid_claimed')
  );

create policy "Trip members read payment proofs"
  on public.payment_proofs for select to authenticated
  using (
    exists (
      select 1 from public.participations pa
      where pa.id = participation_id and public.is_trip_member(pa.trip_id)
    )
  );

create policy "Trip members add payment proofs"
  on public.payment_proofs for insert to authenticated
  with check (
    exists (
      select 1 from public.participations pa
      where pa.id = participation_id and public.is_trip_member(pa.trip_id)
    )
  );

-- Privileges: anon gets nothing; schedules and options are read-only;
-- users choose only the trip, schedule, seats and status of a participation
-- and the participation and path of a proof. created_by is never set by a
-- client.

revoke all on public.schedules from anon;
revoke all on public.schedule_options from anon;
revoke all on public.participations from anon;
revoke all on public.payment_proofs from anon;

revoke insert, update, delete, truncate on public.schedules from authenticated;
revoke insert, update, delete, truncate on public.schedule_options from authenticated;

-- final_group_url is only for confirmed members; a later ticket serves it to them
revoke select on public.schedules from authenticated;
grant select (
  id, provider_id, service_type_id, city, schedule_date,
  attendance_deadline, option_deadline, payment_deadline,
  discussion_group_url, is_dummy, is_published, created_at, updated_at
) on public.schedules to authenticated;

revoke insert, update, delete, truncate on public.participations from authenticated;
grant insert (trip_id, schedule_id, seats) on public.participations to authenticated;
grant update (seats, status) on public.participations to authenticated;

revoke insert, update, delete, truncate on public.payment_proofs from authenticated;
grant insert (participation_id, storage_path) on public.payment_proofs to authenticated;
