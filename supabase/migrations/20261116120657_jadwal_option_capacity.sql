-- Option capacity for Jadwal search (be-067).
--
-- participations are readable only for the user's own trips, so the totals
-- other people add up to need a security definer function. It returns
-- aggregates only: seat counts per option, never who joined.
--
-- participations belong to a schedule, not an option, so every option of a
-- schedule shows the same three counts (seats, not rows):
--   confirmed = confirmed
--   fix       = fix, awaiting_payment, paid_claimed (committed, not confirmed)
--   interested = interested
-- declined, lapsed and cancelled count nowhere.

create function public.schedule_option_capacity(p_schedule_ids uuid[])
returns table (
  option_id uuid,
  schedule_id uuid,
  confirmed integer,
  fix integer,
  interested integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.schedule_id,
    coalesce(sum(p.seats) filter (where p.status = 'confirmed'), 0)::integer,
    coalesce(sum(p.seats) filter (
      where p.status in ('fix', 'awaiting_payment', 'paid_claimed')
    ), 0)::integer,
    coalesce(sum(p.seats) filter (where p.status = 'interested'), 0)::integer
  from public.schedule_options o
  join public.schedules s on s.id = o.schedule_id
  join public.providers pr on pr.id = s.provider_id
  left join public.participations p on p.schedule_id = s.id
  where o.schedule_id = any (p_schedule_ids)
    and s.is_published = true
    and pr.is_published = true
  group by o.id, o.schedule_id;
$$;

revoke execute on function public.schedule_option_capacity(uuid[]) from public, anon;
grant execute on function public.schedule_option_capacity(uuid[]) to authenticated;
