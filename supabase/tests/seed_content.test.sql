-- Checks for the seeded preparation-step content. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

create temporary view seeded as
  select * from public.preparation_steps
  where id::text like '5eed0000-0000-4000-8000-0000000000%';

select is((select count(*)::int from seeded), 22, '22 seeded steps');
select is((select count(*)::int from seeded where is_published), 22, 'all seeded steps are published');

select set_eq(
  $$select distinct phase_key from seeded$$,
  array['3_6_months_before', '2_3_months_before', '1_month_before', '1_week_before', 'departure_day'],
  'seeded steps use exactly the 5 phase keys'
);
select set_eq(
  $$select distinct category_key from seeded$$,
  array['documents', 'health', 'financial', 'booking', 'preparation', 'final_checks', 'spiritual', 'checklist'],
  'seeded steps use exactly the 8 category keys'
);

select is_empty(
  $$select id from seeded
    where coalesce(trim(title_id), '') = '' or coalesce(trim(title_en), '') = ''
       or coalesce(trim(summary_id), '') = '' or coalesce(trim(summary_en), '') = ''
       or coalesce(trim(detail_content_id), '') = '' or coalesce(trim(detail_content_en), '') = ''$$,
  'no seeded step has an empty title, summary or detail'
);

select is_empty(
  $$select s.id, dep
    from seeded s, unnest(s.dependency_step_ids) as dep
    left join seeded d on d.id = dep
    where d.id is null or d.sort_order >= s.sort_order$$,
  'every dependency is a seeded step with a lower sort_order'
);

select is((select count(*)::int from seeded where cost_varies_by_city), 1, 'exactly one seeded step varies by city');
select set_eq(
  $$select o.city from public.city_cost_overrides o join seeded s on s.id = o.step_id where s.cost_varies_by_city$$,
  array['Jakarta', 'Surabaya', 'Medan', 'Makassar', 'Yogyakarta'],
  'the city-varying step has overrides for exactly the 5 cities'
);
select is_empty(
  $$select o.id from public.city_cost_overrides o join seeded s on s.id = o.step_id
    where o.cost_min < s.estimated_cost_min or o.cost_max > s.estimated_cost_max$$,
  'every override lies within its step''s cost range'
);

select is_empty(
  $$select id from seeded
    where concat_ws(' ', title_id, title_en, summary_id, summary_en, detail_content_id, detail_content_en) ilike '%umroh%'$$,
  'seeded text spells Umrah, never Umroh'
);
select is_empty(
  $$select id from seeded
    where concat_ws(' ', title_id, title_en, summary_id, summary_en, detail_content_id, detail_content_en) ilike '%umrohhub%'$$,
  'no seeded text mentions UmrohHub'
);

select * from finish();
rollback;
