-- MVP data model: content (preparation_steps, city_cost_overrides) and
-- trip-owned tables (trips, travelers, trip_step_config, trip_step_progress).

-- Enums

create type public.trip_status as enum ('planning', 'in_progress', 'completed');
create type public.step_status as enum ('not_started', 'in_progress', 'completed');
create type public.tracking_mode as enum ('shared', 'individual');

-- updated_at trigger function

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Content tables (edited in Supabase Studio)

create table public.preparation_steps (
  id uuid primary key default gen_random_uuid(),
  phase_key text not null,
  category_key text not null,
  title_id text not null,
  title_en text not null,
  summary_id text,
  summary_en text,
  detail_content_id text,
  detail_content_en text,
  estimated_cost_min integer,
  estimated_cost_max integer,
  cost_varies_by_city boolean not null default false,
  is_shared_step boolean not null default true,
  dependency_step_ids uuid[],
  sort_order integer not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preparation_steps_cost_range check (
    estimated_cost_min is null
    or estimated_cost_max is null
    or estimated_cost_min <= estimated_cost_max
  )
);

create index preparation_steps_phase_category_sort_idx
  on public.preparation_steps (phase_key, category_key, sort_order);

create table public.city_cost_overrides (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.preparation_steps (id) on delete cascade,
  city text not null,
  cost_min integer not null,
  cost_max integer not null,
  updated_at timestamptz not null default now(),
  constraint city_cost_overrides_cost_range check (cost_min <= cost_max),
  constraint city_cost_overrides_step_city_key unique (step_id, city)
);

-- Trip-owned tables

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  planned_departure_date date,
  departure_city text not null,
  has_disabilities boolean not null default false,
  has_minors boolean not null default false,
  disability_notes text,
  status public.trip_status not null default 'planning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_user_id_idx on public.trips (user_id);

create table public.travelers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  is_minor boolean not null default false,
  has_disability boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travelers_id_trip_id_key unique (id, trip_id)
);

create index travelers_trip_id_idx on public.travelers (trip_id);

create table public.trip_step_config (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  step_id uuid not null references public.preparation_steps (id) on delete cascade,
  tracking_mode public.tracking_mode not null,
  updated_at timestamptz not null default now(),
  constraint trip_step_config_trip_step_key unique (trip_id, step_id)
);

create index trip_step_config_step_id_idx on public.trip_step_config (step_id);

create table public.trip_step_progress (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  step_id uuid not null references public.preparation_steps (id) on delete cascade,
  -- null = shared step for the whole trip
  traveler_id uuid,
  status public.step_status not null default 'not_started',
  completed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now(),
  -- the traveler must belong to the same trip
  constraint trip_step_progress_traveler_fkey foreign key (traveler_id, trip_id)
    references public.travelers (id, trip_id) on delete cascade,
  constraint trip_step_progress_trip_step_traveler_key
    unique nulls not distinct (trip_id, step_id, traveler_id)
);

create index trip_step_progress_step_id_idx on public.trip_step_progress (step_id);
create index trip_step_progress_traveler_id_idx on public.trip_step_progress (traveler_id);

-- updated_at triggers

create trigger set_updated_at before update on public.preparation_steps
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.city_cost_overrides
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.travelers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trip_step_config
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trip_step_progress
  for each row execute function public.set_updated_at();

-- Row level security

alter table public.preparation_steps enable row level security;
alter table public.city_cost_overrides enable row level security;
alter table public.trips enable row level security;
alter table public.travelers enable row level security;
alter table public.trip_step_config enable row level security;
alter table public.trip_step_progress enable row level security;

-- Content: signed-in users read; writes only through Studio (bypasses RLS)

create policy "Signed-in users read published steps"
  on public.preparation_steps for select to authenticated
  using (is_published = true);

create policy "Signed-in users read city cost overrides"
  on public.city_cost_overrides for select to authenticated
  using (true);

-- trips: owner only

create policy "Users read own trips"
  on public.trips for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own trips"
  on public.trips for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update own trips"
  on public.trips for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own trips"
  on public.trips for delete to authenticated
  using (user_id = (select auth.uid()));

-- travelers: rows of the user's own trips

create policy "Users read travelers of own trips"
  on public.travelers for select to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users insert travelers into own trips"
  on public.travelers for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users update travelers of own trips"
  on public.travelers for update to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users delete travelers of own trips"
  on public.travelers for delete to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

-- trip_step_config: rows of the user's own trips

create policy "Users read step config of own trips"
  on public.trip_step_config for select to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users insert step config into own trips"
  on public.trip_step_config for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users update step config of own trips"
  on public.trip_step_config for update to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users delete step config of own trips"
  on public.trip_step_config for delete to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

-- trip_step_progress: rows of the user's own trips

create policy "Users read step progress of own trips"
  on public.trip_step_progress for select to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users insert step progress into own trips"
  on public.trip_step_progress for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users update step progress of own trips"
  on public.trip_step_progress for update to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users delete step progress of own trips"
  on public.trip_step_progress for delete to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));
