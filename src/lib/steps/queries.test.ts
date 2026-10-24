import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { loadStepDetail } from "./queries";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

// Like Next, both stop rendering by throwing.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const stepId = (n: number) =>
  `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const tripId = "11111111-1111-4111-8111-111111111111";
const trip = { id: tripId, name: "Umrah keluarga", departure_city: "Surabaya" };

const flights = {
  id: stepId(9),
  title_id: "Pesan tiket pesawat (Jeddah atau Madinah)",
  title_en: "Book flights (Jeddah or Madinah)",
  summary_id: null,
  summary_en: null,
  detail_content_id: "## Langkah-langkah",
  detail_content_en: "## Steps",
  estimated_cost_min: 9000000,
  estimated_cost_max: 18000000,
  cost_varies_by_city: true,
  // Step 99 is missing or unpublished, so the query doesn't return it.
  dependency_step_ids: [stepId(1), stepId(99), stepId(7)],
};

const passport = {
  id: stepId(1),
  title_id: "Buat atau perpanjang paspor",
  title_en: "Apply for or renew your passport",
  sort_order: 10,
};
const visa = {
  id: stepId(7),
  title_id: "Ajukan visa Umrah",
  title_en: "Apply for an Umrah visa",
  sort_order: 70,
};
// The rows the prerequisites query returns; `is_shared_step` is not passed on.
const passportRow = { ...passport, is_shared_step: false };
const visaRow = { ...visa, is_shared_step: false };
const ahmad = "aaaaaaaa-0000-4000-8000-000000000001";

const ok = (data: unknown) => ({ data, error: null });

// Newest first, as the query orders them; user-1 is the signed-in user.
const commentRows = [
  {
    id: "cccccccc-0000-4000-8000-000000000002",
    user_id: "user-1",
    author_name: "Aisyah Rahman",
    author_avatar_url: "https://lh3.googleusercontent.com/a/aisyah",
    content: "Bawa fotokopi paspor.",
    created_at: "2026-10-22T08:00:00+00:00",
  },
  {
    id: "cccccccc-0000-4000-8000-000000000001",
    user_id: "user-2",
    author_name: "",
    author_avatar_url: null,
    content: "Datang pagi.",
    created_at: "2026-10-21T08:00:00+00:00",
  },
];
const comments = [
  {
    id: "cccccccc-0000-4000-8000-000000000002",
    authorName: "Aisyah Rahman",
    authorAvatarUrl: "https://lh3.googleusercontent.com/a/aisyah",
    content: "Bawa fotokopi paspor.",
    createdAt: "2026-10-22T08:00:00+00:00",
    isOwn: true,
  },
  {
    id: "cccccccc-0000-4000-8000-000000000001",
    authorName: "",
    authorAvatarUrl: null,
    content: "Datang pagi.",
    createdAt: "2026-10-21T08:00:00+00:00",
    isOwn: false,
  },
];

function tables(withTrip: boolean) {
  return {
    preparation_steps: [ok(flights), ok([passportRow, visaRow])],
    trips: ok(withTrip ? trip : null),
    city_cost_overrides: ok([
      { step_id: stepId(9), city: "Surabaya", cost_min: 10000000, cost_max: 16000000 },
    ]),
    // No travelers, so the individual prerequisites use trip-level rows.
    trip_step_config: ok([]),
    travelers: ok([]),
    trip_step_progress: ok([
      { step_id: stepId(1), traveler_id: null, status: "completed" },
    ]),
    step_comments: ok(commentRows),
  };
}

const query = (table: string, call = 0) =>
  fake.builders.filter((entry) => entry.table === table)[call].builder;

const queried = () => fake.from.mock.calls.map(([table]) => table);

const noTripResult = {
  step: flights,
  trip: null,
  cost: {
    key: "range",
    values: { min: "Rp\u00a09.000.000", max: "Rp\u00a018.000.000" },
  },
  prerequisites: [
    { ...passport, status: null },
    { ...visa, status: null },
  ],
  comments,
};

describe("loadStepDetail", () => {
  it("redirects a signed-out user to /", async () => {
    fake = fakeSupabase({ user: null });
    await expect(loadStepDetail(stepId(9), tripId)).rejects.toThrow(
      "NEXT_REDIRECT /",
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("404s a non-UUID step id without querying the DB", async () => {
    fake = fakeSupabase();
    await expect(loadStepDetail("not-a-uuid", tripId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("404s when the step query returns no row", async () => {
    fake = fakeSupabase({ tables: { preparation_steps: ok(null) } });
    await expect(loadStepDetail(stepId(9), undefined)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(query("preparation_steps").eq).toHaveBeenCalledWith("id", stepId(9));
    expect(query("preparation_steps").eq).toHaveBeenCalledWith(
      "is_published",
      true,
    );
    expect(queried()).toEqual(["preparation_steps"]);
  });

  it("throws on a step query error", async () => {
    fake = fakeSupabase({
      tables: { preparation_steps: { data: null, error: { message: "boom" } } },
    });
    await expect(loadStepDetail(stepId(9), undefined)).rejects.toThrow(
      "Failed to load step",
    );
  });

  it("throws on a prerequisites query error", async () => {
    fake = fakeSupabase({
      tables: {
        ...tables(true),
        preparation_steps: [ok(flights), { data: null, error: { message: "boom" } }],
      },
    });
    await expect(loadStepDetail(stepId(9), tripId)).rejects.toThrow(
      "Failed to load step details",
    );
  });

  it.each([
    "trip_step_config",
    "travelers",
    "trip_step_progress",
    "step_comments",
  ])(
    "throws on a %s query error",
    async (table) => {
      fake = fakeSupabase({
        tables: {
          ...tables(true),
          [table]: { data: null, error: { message: "boom" } },
        },
      });
      await expect(loadStepDetail(stepId(9), tripId)).rejects.toThrow(
        "Failed to load step details",
      );
    },
  );

  it("without a trip param, uses the base cost and no statuses", async () => {
    fake = fakeSupabase({ tables: tables(true) });
    expect(await loadStepDetail(stepId(9), undefined)).toEqual(noTripResult);
    expect(queried()).toEqual([
      "preparation_steps",
      "preparation_steps",
      "step_comments",
    ]);
  });

  it("treats a non-UUID trip param as no trip without querying trips", async () => {
    fake = fakeSupabase({ tables: tables(true) });
    expect(await loadStepDetail(stepId(9), "abc")).toEqual(noTripResult);
    expect(queried()).toEqual([
      "preparation_steps",
      "preparation_steps",
      "step_comments",
    ]);
  });

  it("treats a trip that isn't the user's (no row) exactly like no trip", async () => {
    fake = fakeSupabase({ tables: tables(false) });
    expect(await loadStepDetail(stepId(9), tripId)).toEqual(noTripResult);
    expect(query("trips").eq).toHaveBeenCalledWith("id", tripId);
    expect(queried()).not.toContain("city_cost_overrides");
    expect(queried()).not.toContain("trip_step_config");
    expect(queried()).not.toContain("travelers");
    expect(queried()).not.toContain("trip_step_progress");
  });

  it("with an owned trip, uses the city's override and the trip's progress", async () => {
    fake = fakeSupabase({ tables: tables(true) });
    expect(await loadStepDetail(stepId(9), tripId)).toEqual({
      step: flights,
      trip,
      cost: {
        key: "range",
        values: { min: "Rp\u00a010.000.000", max: "Rp\u00a016.000.000" },
      },
      prerequisites: [
        { ...passport, status: "completed" },
        { ...visa, status: "not_started" },
      ],
      comments,
    });

    expect(query("city_cost_overrides").eq).toHaveBeenCalledWith(
      "step_id",
      stepId(9),
    );
    expect(query("city_cost_overrides").eq).toHaveBeenCalledWith(
      "city",
      "Surabaya",
    );
    expect(query("trip_step_config").select).toHaveBeenCalledWith(
      "step_id, tracking_mode",
    );
    expect(query("trip_step_config").eq).toHaveBeenCalledWith(
      "trip_id",
      tripId,
    );
    expect(query("travelers").select).toHaveBeenCalledWith("id");
    expect(query("travelers").eq).toHaveBeenCalledWith("trip_id", tripId);
    expect(query("trip_step_progress").select).toHaveBeenCalledWith(
      "step_id, traveler_id, status",
    );
    expect(query("trip_step_progress").eq).toHaveBeenCalledWith(
      "trip_id",
      tripId,
    );
    expect(query("trip_step_progress").is).not.toHaveBeenCalled();
    expect(query("trip_step_progress").in).toHaveBeenCalledWith(
      "step_id",
      flights.dependency_step_ids,
    );
    const prerequisites = query("preparation_steps", 1);
    expect(prerequisites.in).toHaveBeenCalledWith(
      "id",
      flights.dependency_step_ids,
    );
    expect(prerequisites.select).toHaveBeenCalledWith(
      expect.stringContaining("is_shared_step"),
    );
    expect(prerequisites.eq).toHaveBeenCalledWith("is_published", true);
    expect(prerequisites.order).toHaveBeenCalledWith("sort_order");
  });

  it("shows the aggregate status of a prerequisite tracked per traveler", async () => {
    fake = fakeSupabase({
      tables: {
        ...tables(true),
        // Visa is switched to shared; passport stays individual.
        trip_step_config: ok([{ step_id: stepId(7), tracking_mode: "shared" }]),
        travelers: ok([
          { id: ahmad },
          { id: "aaaaaaaa-0000-4000-8000-000000000002" },
        ]),
        trip_step_progress: ok([
          { step_id: stepId(1), traveler_id: null, status: "completed" },
          { step_id: stepId(1), traveler_id: ahmad, status: "completed" },
          { step_id: stepId(7), traveler_id: ahmad, status: "completed" },
        ]),
      },
    });
    const result = await loadStepDetail(stepId(9), tripId);
    expect(result.prerequisites).toEqual([
      { ...passport, status: "in_progress" },
      { ...visa, status: "not_started" },
    ]);
  });

  it("skips prerequisite and progress queries for a step without dependencies", async () => {
    fake = fakeSupabase({
      tables: {
        ...tables(true),
        preparation_steps: [ok({ ...flights, dependency_step_ids: null })],
      },
    });
    const result = await loadStepDetail(stepId(9), tripId);
    expect(result.prerequisites).toEqual([]);
    expect(queried()).toEqual([
      "preparation_steps",
      "trips",
      "city_cost_overrides",
      "step_comments",
    ]);
  });

  it("loads the step's 50 newest comments and marks the user's own", async () => {
    fake = fakeSupabase({ tables: tables(false) });
    const result = await loadStepDetail(stepId(9), undefined);
    expect(result.comments).toEqual(comments);
    expect(JSON.stringify(result.comments)).not.toContain("user-");

    const builder = query("step_comments");
    expect(builder.select).toHaveBeenCalledWith(
      "id, user_id, author_name, author_avatar_url, content, created_at",
    );
    expect(builder.eq).toHaveBeenCalledWith("step_id", stepId(9));
    expect(builder.order.mock.calls).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(builder.limit).toHaveBeenCalledWith(50);
  });

  it("returns no comments when the step has none", async () => {
    fake = fakeSupabase({
      tables: { ...tables(false), step_comments: ok([]) },
    });
    expect((await loadStepDetail(stepId(9), undefined)).comments).toEqual([]);
  });
});
