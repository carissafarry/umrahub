import { isUuid } from "@/lib/trips/checklist";
import { loadOwnedTrip } from "@/lib/trips/queries";
import { createClient } from "@/lib/supabase/server";

export type ServiceKind = "umrah_guidance" | "city_tour" | "ziarah";
export type LegCity = "Makkah" | "Madinah";

const serviceKinds: ServiceKind[] = ["umrah_guidance", "city_tour", "ziarah"];

export type OptionCapacity = {
  confirmed: number;
  fix: number;
  interested: number;
};

export type OptionResult = {
  id: string;
  vehicleFormat: string;
  minimumParticipants: number;
  capacity: number;
  priceSar: number;
  sortOrder: number;
  counts: OptionCapacity;
};

export type ScheduleResult = {
  id: string;
  city: "Makkah" | "Thaif" | "Madinah";
  scheduleDate: string;
  kind: string;
  provider: { id: string; name: string; providerType: string };
  deadlines: { attendance: string; option: string; payment: string };
  options: OptionResult[];
};

export type CityResult = {
  city: LegCity;
  schedules: ScheduleResult[];
  dayTrips: ScheduleResult[];
};

export type SearchResult = { cities: CityResult[] };

export type TripLeg = {
  city: LegCity;
  start_date: string;
  end_date: string;
  sort_order: number;
};

// Only what the search shows; never the group urls, the provider's contact
// or bank details, or anything about participations.
type ScheduleRow = {
  id: string;
  city: ScheduleResult["city"];
  schedule_date: string;
  attendance_deadline: string;
  option_deadline: string;
  payment_deadline: string;
  service_types: { key: string };
  providers: { id: string; name: string; provider_type: string };
  schedule_options: {
    id: string;
    vehicle_format: string;
    minimum_participants: number;
    capacity: number;
    price_sar: number | string;
    sort_order: number;
  }[];
};

type CapacityRow = {
  option_id: string;
  schedule_id: string;
  confirmed: number;
  fix: number;
  interested: number;
};

const scheduleColumns = `id, city, schedule_date, attendance_deadline, option_deadline, payment_deadline,
  service_types!inner(key),
  providers!inner(id, name, provider_type),
  schedule_options(id, vehicle_format, minimum_participants, capacity, price_sar, sort_order)`;

type Client = Awaited<ReturnType<typeof createClient>>;

const noCapacity: OptionCapacity = { confirmed: 0, fix: 0, interested: 0 };

async function fetchCapacity(client: Client, scheduleIds: string[]) {
  const counts = new Map<string, OptionCapacity>();
  const ids = scheduleIds.filter(isUuid);
  if (ids.length === 0) return counts;

  const { data, error } = await client.rpc("schedule_option_capacity", {
    p_schedule_ids: ids,
  });
  if (error) throw new Error("Failed to load capacity", { cause: error });

  // untyped rpc result: there is no generated database.types.ts
  for (const row of (data ?? []) as CapacityRow[]) {
    counts.set(row.option_id, {
      confirmed: row.confirmed,
      fix: row.fix,
      interested: row.interested,
    });
  }
  return counts;
}

// Seat totals per option (optionId → counts), without who the people are.
export async function loadScheduleCapacity(scheduleIds: string[]) {
  return fetchCapacity(await createClient(), scheduleIds);
}

function toResult(
  row: ScheduleRow,
  capacity: Map<string, OptionCapacity>,
): ScheduleResult {
  return {
    id: row.id,
    city: row.city,
    scheduleDate: row.schedule_date,
    kind: row.service_types.key,
    provider: {
      id: row.providers.id,
      name: row.providers.name,
      providerType: row.providers.provider_type,
    },
    deadlines: {
      attendance: row.attendance_deadline,
      option: row.option_deadline,
      payment: row.payment_deadline,
    },
    options: [...row.schedule_options]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((option) => ({
        id: option.id,
        vehicleFormat: option.vehicle_format,
        minimumParticipants: option.minimum_participants,
        capacity: option.capacity,
        priceSar: Number(option.price_sar),
        sortOrder: option.sort_order,
        counts: capacity.get(option.id) ?? noCapacity,
      })),
  };
}

function bySchedule(a: ScheduleResult, b: ScheduleResult) {
  if (a.scheduleDate !== b.scheduleDate) {
    return a.scheduleDate < b.scheduleDate ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Pure: one entry per leg city in leg order (a city in two legs is merged),
// schedules inside a leg's dates (both ends inclusive). Thaif day trips go
// under Makkah, never as a city of their own.
export function groupSchedulesByCity(
  legs: TripLeg[],
  schedules: ScheduleResult[],
): SearchResult {
  const cities = new Map<
    LegCity,
    { schedules: Map<string, ScheduleResult>; dayTrips: Map<string, ScheduleResult> }
  >();

  for (const leg of [...legs].sort((a, b) => a.sort_order - b.sort_order)) {
    const entry = cities.get(leg.city) ?? {
      schedules: new Map(),
      dayTrips: new Map(),
    };
    cities.set(leg.city, entry);

    for (const schedule of schedules) {
      if (
        schedule.scheduleDate < leg.start_date ||
        schedule.scheduleDate > leg.end_date
      ) {
        continue;
      }
      if (schedule.city === leg.city) {
        entry.schedules.set(schedule.id, schedule);
      } else if (leg.city === "Makkah" && schedule.city === "Thaif") {
        entry.dayTrips.set(schedule.id, schedule);
      }
    }
  }

  return {
    cities: [...cities].map(([city, entry]) => ({
      city,
      schedules: [...entry.schedules.values()].sort(bySchedule),
      dayTrips: [...entry.dayTrips.values()].sort(bySchedule),
    })),
  };
}

// Schedules for a trip's legs, grouped per city. Empty or omitted `kinds`
// means all kinds; unknown kinds are ignored.
export async function searchSchedules(tripId: string, kinds?: ServiceKind[]) {
  const { supabase, trip } = await loadOwnedTrip(tripId);

  const { data: legs, error: legsError } = await supabase
    .from("trip_legs")
    .select("city, start_date, end_date, sort_order")
    .eq("trip_id", trip.id)
    .order("sort_order")
    .overrideTypes<TripLeg[], { merge: false }>();
  if (legsError) throw new Error("Failed to load legs", { cause: legsError });
  if (!legs || legs.length === 0) return { cities: [] } satisfies SearchResult;

  const wanted = (kinds ?? []).filter((kind) => serviceKinds.includes(kind));
  const cityNames = legs.some((leg) => leg.city === "Makkah")
    ? [...new Set<string>([...legs.map((leg) => leg.city), "Thaif"])]
    : [...new Set<string>(legs.map((leg) => leg.city))];
  const from = legs.map((leg) => leg.start_date).sort()[0];
  const to = legs.map((leg) => leg.end_date).sort().reverse()[0];

  let query = supabase
    .from("schedules")
    .select(scheduleColumns)
    .eq("is_published", true)
    .eq("providers.is_published", true)
    .in("city", cityNames)
    .gte("schedule_date", from)
    .lte("schedule_date", to);
  if (wanted.length > 0) query = query.in("service_types.key", wanted);
  const { data: rows, error: schedulesError } = await query
    .order("schedule_date")
    .order("id")
    .overrideTypes<ScheduleRow[], { merge: false }>();
  if (schedulesError) {
    throw new Error("Failed to load schedules", { cause: schedulesError });
  }

  const matched = rows ?? [];
  const capacity = await fetchCapacity(
    supabase,
    matched.map((row) => row.id),
  );
  return groupSchedulesByCity(
    legs,
    matched.map((row) => toResult(row, capacity)),
  );
}
