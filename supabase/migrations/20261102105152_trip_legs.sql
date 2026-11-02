-- Trip dates per city: an overall return date on the trip, plus one row per
-- city stay (Makkah, Madinah) with its own dates and order. Owner-only, like
-- the other trip children.

alter table public.trips
  add column planned_return_date date,
  add constraint trips_return_after_departure check (
    planned_return_date is null or planned_return_date >= planned_departure_date
  );

create table public.trip_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  city text not null,
  start_date date not null,
  end_date date not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_legs_city_check check (city in ('Makkah', 'Madinah')),
  constraint trip_legs_date_range check (start_date <= end_date),
  constraint trip_legs_sort_order_check check (sort_order >= 1),
  -- also serves as the trip_id index
  constraint trip_legs_trip_sort_order_key unique (trip_id, sort_order)
);

create trigger set_updated_at before update on public.trip_legs
  for each row execute function public.set_updated_at();

-- Row level security: rows of the user's own trips

alter table public.trip_legs enable row level security;

create policy "Users read legs of own trips"
  on public.trip_legs for select to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users insert legs into own trips"
  on public.trip_legs for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users update legs of own trips"
  on public.trip_legs for update to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users delete legs of own trips"
  on public.trip_legs for delete to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));
