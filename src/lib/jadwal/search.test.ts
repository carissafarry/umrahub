import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import {
  groupSchedulesByCity,
  loadScheduleCapacity,
  searchSchedules,
  type ScheduleResult,
  type TripLeg,
} from "./search";

const tripId = "11111111-1111-4111-8111-111111111111";
const id = (n: number) => `22222222-2222-4222-8222-22222222222${n}`;
const optionId = (n: number) => `33333333-3333-4333-8333-33333333333${n}`;

let fake = fakeSupabase();
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ ...fake.client, rpc }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const legs: TripLeg[] = [
  { city: "Makkah", start_date: "2027-01-05", end_date: "2027-01-10", sort_order: 1 },
  { city: "Madinah", start_date: "2027-01-10", end_date: "2027-01-14", sort_order: 2 },
];

function row(n: number, city: string, date: string, kind = "ziarah") {
  return {
    id: id(n),
    city,
    schedule_date: date,
    attendance_deadline: "2027-01-01T00:00:00Z",
    option_deadline: "2027-01-02T00:00:00Z",
    payment_deadline: "2027-01-03T00:00:00Z",
    service_types: { key: kind },
    providers: { id: "p1", name: "Ustadz A", provider_type: "muthawif" },
    schedule_options: [
      { id: optionId(2), vehicle_format: "Bus", minimum_participants: 20, capacity: 45, price_sar: "80.00", sort_order: 2 },
      { id: optionId(1), vehicle_format: "Hiace", minimum_participants: 4, capacity: 12, price_sar: "150.00", sort_order: 1 },
    ],
  };
}

function setup(user: { id: string } | null = { id: "user-1" }, schedules: unknown[] = []) {
  fake = fakeSupabase({
    user,
    tables: {
      trips: { data: { id: tripId, name: "T", departure_city: "Jakarta" }, error: null },
      trip_legs: { data: legs, error: null },
      schedules: { data: schedules, error: null },
    },
  });
  rpc.mockReset();
  rpc.mockResolvedValue({
    data: [
      { option_id: optionId(1), schedule_id: id(1), confirmed: 4, fix: 6, interested: 5 },
    ],
    error: null,
  });
}

function scheduleBuilder() {
  return fake.builders.find(({ table }) => table === "schedules")!.builder;
}

beforeEach(() => setup());

describe("searchSchedules", () => {
  it("groups per leg, puts Thaif under Makkah and drops schedules outside the dates", async () => {
    setup(undefined, [
      row(1, "Makkah", "2027-01-06"),
      row(2, "Thaif", "2027-01-07"),
      row(3, "Madinah", "2027-01-12"),
      row(4, "Makkah", "2027-01-20"),
      row(5, "Madinah", "2027-01-04"),
    ]);
    const result = await searchSchedules(tripId);

    expect(result.cities.map((c) => c.city)).toEqual(["Makkah", "Madinah"]);
    expect(result.cities[0].schedules.map((s) => s.id)).toEqual([id(1)]);
    expect(result.cities[0].dayTrips.map((s) => s.id)).toEqual([id(2)]);
    expect(result.cities[1].schedules.map((s) => s.id)).toEqual([id(3)]);
    expect(result.cities[1].dayTrips).toEqual([]);
  });

  it("maps fields, orders options and fills capacity with zero defaults", async () => {
    setup(undefined, [row(1, "Makkah", "2027-01-06")]);
    const [schedule] = (await searchSchedules(tripId)).cities[0].schedules;

    expect(schedule).toMatchObject({
      kind: "ziarah",
      scheduleDate: "2027-01-06",
      provider: { id: "p1", name: "Ustadz A", providerType: "muthawif" },
      deadlines: {
        attendance: "2027-01-01T00:00:00Z",
        option: "2027-01-02T00:00:00Z",
        payment: "2027-01-03T00:00:00Z",
      },
    });
    expect(schedule.options.map((o) => o.id)).toEqual([optionId(1), optionId(2)]);
    expect(schedule.options[0].priceSar).toBe(150);
    expect(schedule.options[0].counts).toEqual({ confirmed: 4, fix: 6, interested: 5 });
    expect(schedule.options[1].counts).toEqual({ confirmed: 0, fix: 0, interested: 0 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("schedule_option_capacity", { p_schedule_ids: [id(1)] });
  });

  it("filters by the requested kinds, all kinds when empty, ignoring unknown ones", async () => {
    await searchSchedules(tripId, ["city_tour"]);
    expect(scheduleBuilder().in).toHaveBeenCalledWith("service_types.key", ["city_tour"]);

    for (const kinds of [undefined, [], ["nope" as never]]) {
      setup();
      await searchSchedules(tripId, kinds);
      const calls = (scheduleBuilder().in.mock.calls as unknown[][]).map(
        ([column]) => column,
      );
      expect(calls).not.toContain("service_types.key");
    }
  });

  it("skips the capacity call when nothing matches", async () => {
    await searchSchedules(tripId);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns no cities for a trip without legs", async () => {
    fake = fakeSupabase({
      tables: {
        trips: { data: { id: tripId }, error: null },
        trip_legs: { data: [], error: null },
      },
    });
    expect(await searchSchedules(tripId)).toEqual({ cities: [] });
    expect(fake.from).not.toHaveBeenCalledWith("schedules");
  });

  it("redirects when signed out and 404s on a non-UUID id", async () => {
    setup(null);
    await expect(searchSchedules(tripId)).rejects.toThrow("NEXT_REDIRECT /");
    setup();
    await expect(searchSchedules("nope")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("throws with the cause on a Supabase error", async () => {
    const cause = { code: "42501", message: "boom" };
    fake = fakeSupabase({
      tables: {
        trips: { data: { id: tripId }, error: null },
        trip_legs: { data: legs, error: null },
        schedules: { data: null, error: cause },
      },
    });
    await expect(searchSchedules(tripId)).rejects.toMatchObject({ cause });

    setup(undefined, [row(1, "Makkah", "2027-01-06")]);
    rpc.mockResolvedValue({ data: null, error: cause });
    await expect(searchSchedules(tripId)).rejects.toMatchObject({ cause });
  });

  it("has no identifying keys anywhere in the result", async () => {
    setup(undefined, [row(1, "Makkah", "2027-01-06"), row(2, "Thaif", "2027-01-07")]);
    const keys: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [key, inner] of Object.entries(value)) {
          keys.push(key);
          walk(inner);
        }
      }
    };
    walk(await searchSchedules(tripId));
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key) => /user|trip_id|participation|traveler/i.test(key))).toEqual([]);
  });
});

describe("groupSchedulesByCity", () => {
  const make = (n: number, city: ScheduleResult["city"], date: string) =>
    ({ id: id(n), city, scheduleDate: date }) as ScheduleResult;

  it("keeps a city without matches, with empty arrays", () => {
    expect(groupSchedulesByCity(legs, [])).toEqual({
      cities: [
        { city: "Makkah", schedules: [], dayTrips: [] },
        { city: "Madinah", schedules: [], dayTrips: [] },
      ],
    });
  });

  it("merges a city that appears in two legs and deduplicates by id", () => {
    const twice: TripLeg[] = [
      { city: "Makkah", start_date: "2027-01-05", end_date: "2027-01-08", sort_order: 1 },
      { city: "Madinah", start_date: "2027-01-09", end_date: "2027-01-10", sort_order: 2 },
      { city: "Makkah", start_date: "2027-01-07", end_date: "2027-01-12", sort_order: 3 },
    ];
    const result = groupSchedulesByCity(twice, [
      make(2, "Makkah", "2027-01-11"),
      make(1, "Makkah", "2027-01-08"),
    ]);
    expect(result.cities.map((c) => c.city)).toEqual(["Makkah", "Madinah"]);
    expect(result.cities[0].schedules.map((s) => s.id)).toEqual([id(1), id(2)]);
  });

  it("includes both leg boundary dates and orders by date then id", () => {
    const result = groupSchedulesByCity(legs, [
      make(3, "Makkah", "2027-01-10"),
      make(2, "Makkah", "2027-01-05"),
      make(1, "Makkah", "2027-01-05"),
    ]);
    expect(result.cities[0].schedules.map((s) => s.id)).toEqual([id(1), id(2), id(3)]);
  });

  it("does not show Thaif without a Makkah leg", () => {
    const result = groupSchedulesByCity([legs[1]], [make(1, "Thaif", "2027-01-12")]);
    expect(result).toEqual({
      cities: [{ city: "Madinah", schedules: [], dayTrips: [] }],
    });
  });

  it("returns no cities without legs", () => {
    expect(groupSchedulesByCity([], [make(1, "Makkah", "2027-01-06")])).toEqual({ cities: [] });
  });
});

describe("loadScheduleCapacity", () => {
  it("returns an empty map without valid ids and skips the rpc", async () => {
    expect((await loadScheduleCapacity(["nope"])).size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps optionId to counts for the valid ids only", async () => {
    const map = await loadScheduleCapacity([id(1), "nope"]);
    expect(rpc).toHaveBeenCalledWith("schedule_option_capacity", { p_schedule_ids: [id(1)] });
    expect(map.get(optionId(1))).toEqual({ confirmed: 4, fix: 6, interested: 5 });
  });
});
