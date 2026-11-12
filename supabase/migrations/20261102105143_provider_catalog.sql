-- Provider catalog: providers (muthawif or travel) with their affiliations,
-- verification result, catalog items and reviews, plus the service_types
-- reference table. All content is edited in Studio (table owner bypasses
-- RLS): publishing, confirming affiliations, recording verifications and
-- hiding reviews. Signed-in users only read what is published; no client
-- writes anything and anon gets nothing.
--
-- - service_types: reference list of service kinds (new type = new row).
-- - providers: profile with bilingual bio, WhatsApp number (digits for
--   wa.me) and bank account text. bank_account_text is not readable by
--   authenticated; it is meant for the final payment stage only.
-- - provider_affiliations: member (e.g. muthawif) to organization (e.g.
--   travel). Readable only when active, confirmed by both sides and both
--   providers are published; ended rows stay as history.
-- - provider_verifications: one current result per provider (status,
--   criteria met, dates, reviewer). Results only, never documents.
--   Only verified rows are readable (pending, rejected and revoked stay
--   private); reviewed_by is not readable by authenticated.
-- - provider_catalog_items: information and offers written by the provider.
-- - provider_reviews: stars 1 to 5, text and a display name like "Siti R.".

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_id text not null,
  name_en text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null,
  name text not null,
  bio_id text,
  bio_en text,
  whatsapp_number text,
  bank_account_text text,
  is_dummy boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a check constraint, not an enum, so a later type is a constraint change
  constraint providers_provider_type_check check (
    provider_type in ('muthawif', 'travel')
  ),
  -- btrim with explicit whitespace: plain btrim only strips spaces
  constraint providers_name_length check (
    char_length(btrim(name, E' \t\r\n')) between 1 and 120
  ),
  -- international digits without "+", the form https://wa.me/<number> needs
  constraint providers_whatsapp_number_format check (
    whatsapp_number ~ '^[1-9][0-9]{7,14}$'
  )
);

create table public.provider_affiliations (
  id uuid primary key default gen_random_uuid(),
  member_provider_id uuid not null references public.providers (id) on delete cascade,
  organization_provider_id uuid not null references public.providers (id) on delete cascade,
  relationship_type text not null,
  status text not null default 'active',
  started_on date not null,
  ended_on date,
  confirmed_by_member boolean not null default false,
  confirmed_by_organization boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_affiliations_distinct_providers check (
    member_provider_id <> organization_provider_id
  ),
  constraint provider_affiliations_relationship_type_check check (
    relationship_type in ('works_at', 'owner', 'partner')
  ),
  constraint provider_affiliations_status_check check (
    status in ('active', 'ended')
  ),
  constraint provider_affiliations_dates_check check (
    ended_on is null or ended_on >= started_on
  )
);

create index provider_affiliations_member_provider_id_idx
  on public.provider_affiliations (member_provider_id);
create index provider_affiliations_organization_provider_id_idx
  on public.provider_affiliations (organization_provider_id);

-- Results only: no column holds documents or links to them
create table public.provider_verifications (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.providers (id) on delete cascade,
  status text not null default 'pending',
  verified_on date,
  expires_on date,
  criteria_met text[] not null default '{}',
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_verifications_status_check check (
    status in ('pending', 'verified', 'rejected', 'revoked')
  ),
  constraint provider_verifications_verified_dates check (
    status <> 'verified'
    or (verified_on is not null and expires_on is not null and expires_on > verified_on)
  ),
  constraint provider_verifications_criteria_met_check check (
    criteria_met <@ array[
      'business_license', 'active_phone', 'active_email',
      'bank_account_name_match', 'office_address', 'identity',
      'affiliated_travel_verified', 'social_media', 'muthawif_experience'
    ]::text[]
  )
);

create table public.provider_catalog_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  service_type_id uuid references public.service_types (id) on delete set null,
  title_id text not null,
  title_en text,
  description_id text,
  description_en text,
  image_url text,
  sort_order integer not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_catalog_items_title_id_length check (
    char_length(btrim(title_id, E' \t\r\n')) between 1 and 120
  ),
  constraint provider_catalog_items_image_url_https check (
    image_url is null or image_url ~ '^https://'
  )
);

create index provider_catalog_items_provider_id_sort_order_idx
  on public.provider_catalog_items (provider_id, sort_order);

create table public.provider_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  rating smallint not null,
  content text not null,
  display_name text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_reviews_rating_range check (rating between 1 and 5),
  constraint provider_reviews_content_length check (
    char_length(btrim(content, E' \t\r\n')) between 1 and 1000
  ),
  -- the "Siti R." format is the writer's job, not checked here
  constraint provider_reviews_display_name_length check (
    char_length(btrim(display_name, E' \t\r\n')) between 1 and 40
  )
);

create index provider_reviews_provider_id_created_at_idx
  on public.provider_reviews (provider_id, created_at desc);

create trigger set_updated_at before update on public.service_types
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.providers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.provider_affiliations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.provider_verifications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.provider_catalog_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.provider_reviews
  for each row execute function public.set_updated_at();

-- Row level security: read-only for signed-in users, only for published
-- providers; no insert, update or delete policies

alter table public.service_types enable row level security;
alter table public.providers enable row level security;
alter table public.provider_affiliations enable row level security;
alter table public.provider_verifications enable row level security;
alter table public.provider_catalog_items enable row level security;
alter table public.provider_reviews enable row level security;

create policy "Signed-in users read service types"
  on public.service_types for select to authenticated
  using (true);

create policy "Signed-in users read published providers"
  on public.providers for select to authenticated
  using (is_published = true);

create policy "Signed-in users read confirmed active affiliations"
  on public.provider_affiliations for select to authenticated
  using (
    confirmed_by_member
    and confirmed_by_organization
    and status = 'active'
    and exists (
      select 1 from public.providers p
      where p.id = member_provider_id and p.is_published = true
    )
    and exists (
      select 1 from public.providers p
      where p.id = organization_provider_id and p.is_published = true
    )
  );

create policy "Signed-in users read verified results of published providers"
  on public.provider_verifications for select to authenticated
  using (
    status = 'verified'
    and exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_published = true
    )
  );

create policy "Signed-in users read published catalog items"
  on public.provider_catalog_items for select to authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_published = true
    )
  );

create policy "Signed-in users read visible provider reviews"
  on public.provider_reviews for select to authenticated
  using (
    is_hidden = false
    and exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_published = true
    )
  );

-- Privileges: no client writes, anon gets nothing, private columns stay
-- private (bank account until the final payment stage, internal reviewer)

revoke all on public.service_types from anon;
revoke all on public.providers from anon;
revoke all on public.provider_affiliations from anon;
revoke all on public.provider_verifications from anon;
revoke all on public.provider_catalog_items from anon;
revoke all on public.provider_reviews from anon;

revoke insert, update, delete, truncate on public.service_types from authenticated;
revoke insert, update, delete, truncate on public.providers from authenticated;
revoke insert, update, delete, truncate on public.provider_affiliations from authenticated;
revoke insert, update, delete, truncate on public.provider_verifications from authenticated;
revoke insert, update, delete, truncate on public.provider_catalog_items from authenticated;
revoke insert, update, delete, truncate on public.provider_reviews from authenticated;

revoke select on public.providers from authenticated;
grant select (
  id, provider_type, name, bio_id, bio_en, whatsapp_number,
  is_dummy, is_published, created_at, updated_at
) on public.providers to authenticated;

revoke select on public.provider_verifications from authenticated;
grant select (
  id, provider_id, status, verified_on, expires_on, criteria_met,
  created_at, updated_at
) on public.provider_verifications to authenticated;
