import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import {
  cancelInterest,
  confirmAttendance,
  expressInterest,
  respondToOption,
  setSeats,
} from "./actions";

const tripId = "11111111-1111-4111-8111-111111111111";
const scheduleId = "22222222-2222-4222-8222-222222222222";
const participationId = "33333333-3333-4333-8333-333333333333";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const ok = { data: null, error: null };

function row(status: string, seats = 2) {
  return {
    data: {
      id: participationId,
      trip_id: tripId,
      schedule_id: scheduleId,
      status,
      seats,
    },
    error: null,
  };
}

function writes() {
  return fake.builders.flatMap(({ builder }) => [
    ...builder.upsert.mock.calls,
    ...builder.insert.mock.calls,
    ...builder.update.mock.calls,
  ]);
}

function updates() {
  return fake.builders.flatMap(({ builder }) => builder.update.mock.calls);
}

beforeEach(() => {
  revalidatePath.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("expressInterest", () => {
  const trips = { data: { id: tripId }, error: null };

  it.each([
    ["bad trip", "nope", scheduleId, 2],
    ["bad schedule", tripId, "nope", 2],
    ["seats 0", tripId, scheduleId, 0],
    ["seats 11", tripId, scheduleId, 11],
    ["seats 2.5", tripId, scheduleId, 2.5],
  ])("rejects invalid input (%s) without database access", async (_n, t, s, n) => {
    fake = fakeSupabase();
    expect(await expressInterest(t, s, n)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("fails when signed out, writing nothing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await expressInterest(tripId, scheduleId, 2)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(writes()).toEqual([]);
  });

  it("returns notFound when the trip is not visible", async () => {
    fake = fakeSupabase({ tables: { trips: ok } });
    expect(await expressInterest(tripId, scheduleId, 2)).toEqual({
      ok: false,
      error: "notFound",
    });
    expect(writes()).toEqual([]);
  });

  it("inserts only trip_id, schedule_id and seats when there is no row", async () => {
    fake = fakeSupabase({ tables: { trips, participations: [ok, ok] } });
    expect(await expressInterest(tripId, scheduleId, 3)).toEqual({ ok: true });
    expect(writes()).toEqual([
      [{ trip_id: tripId, schedule_id: scheduleId, seats: 3 }],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/jadwal/${scheduleId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/jadwal");
  });

  it("updates a cancelled row instead of inserting", async () => {
    fake = fakeSupabase({
      tables: { trips, participations: [row("cancelled"), ok] },
    });
    expect(await expressInterest(tripId, scheduleId, 4)).toEqual({ ok: true });
    expect(updates()).toEqual([[{ status: "interested", seats: 4 }]]);
    expect(
      fake.builders.flatMap(({ builder }) => builder.insert.mock.calls),
    ).toEqual([]);
    const update = fake.builders.find(
      ({ builder }) => builder.update.mock.calls.length,
    )!.builder;
    expect(update.eq).toHaveBeenCalledWith("id", participationId);
    expect(update.eq).toHaveBeenCalledWith("status", "cancelled");
  });

  it.each(["interested", "fix", "paid_claimed"])(
    "refuses an existing %s row without a write",
    async (status) => {
      fake = fakeSupabase({ tables: { trips, participations: row(status) } });
      expect(await expressInterest(tripId, scheduleId, 2)).toEqual({
        ok: false,
        error: "notAllowed",
      });
      expect(writes()).toEqual([]);
    },
  );

  it("maps a unique violation race to notAllowed", async () => {
    fake = fakeSupabase({
      tables: { trips, participations: [ok, { data: null, error: { code: "23505" } }] },
    });
    expect(await expressInterest(tripId, scheduleId, 2)).toEqual({
      ok: false,
      error: "notAllowed",
    });
  });

  it("returns failed when RLS rejects the insert", async () => {
    fake = fakeSupabase({
      tables: { trips, participations: [ok, { data: null, error: { code: "42501" } }] },
    });
    expect(await expressInterest(tripId, scheduleId, 2)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(console.error).toHaveBeenCalledWith(
      "Participation: participation insert failed",
      "42501",
    );
  });
});

describe.each([
  ["setSeats", (id: string) => setSeats(id, 3)],
  ["confirmAttendance", (id: string) => confirmAttendance(id)],
  ["respondToOption", (id: string) => respondToOption(id, "decline")],
  ["cancelInterest", (id: string) => cancelInterest(id)],
])("%s common checks", (_name, call) => {
  it("rejects a malformed id without database access", async () => {
    fake = fakeSupabase();
    expect(await call("nope")).toEqual({ ok: false, error: "invalid" });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("fails when signed out, writing nothing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await call(participationId)).toEqual({ ok: false, error: "failed" });
    expect(writes()).toEqual([]);
  });

  it("returns notFound when the participation is not visible", async () => {
    fake = fakeSupabase({ tables: { participations: ok } });
    expect(await call(participationId)).toEqual({
      ok: false,
      error: "notFound",
    });
    expect(writes()).toEqual([]);
  });
});

describe("setSeats", () => {
  it.each([0, 11, 2.5])("rejects seats %s without database access", async (n) => {
    fake = fakeSupabase();
    expect(await setSeats(participationId, n)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it.each(["awaiting_payment", "paid_claimed", "cancelled"])(
    "refuses from %s without a write",
    async (status) => {
      fake = fakeSupabase({ tables: { participations: row(status) } });
      expect(await setSeats(participationId, 3)).toEqual({
        ok: false,
        error: "notAllowed",
      });
      expect(writes()).toEqual([]);
    },
  );

  it.each(["interested", "fix"])("writes only seats from %s", async (status) => {
    fake = fakeSupabase({ tables: { participations: [row(status), ok] } });
    expect(await setSeats(participationId, 3)).toEqual({ ok: true });
    expect(updates()).toEqual([[{ seats: 3 }]]);
  });
});

describe("confirmAttendance", () => {
  it("moves interested to fix, writing only status", async () => {
    fake = fakeSupabase({ tables: { participations: [row("interested"), ok] } });
    expect(await confirmAttendance(participationId)).toEqual({ ok: true });
    expect(updates()).toEqual([[{ status: "fix" }]]);
    expect(revalidatePath).toHaveBeenCalledWith(`/jadwal/${scheduleId}`);
  });

  it("refuses from fix without a write", async () => {
    fake = fakeSupabase({ tables: { participations: row("fix") } });
    expect(await confirmAttendance(participationId)).toEqual({
      ok: false,
      error: "notAllowed",
    });
    expect(writes()).toEqual([]);
  });
});

describe("respondToOption", () => {
  it("rejects an unknown response without database access", async () => {
    fake = fakeSupabase();
    expect(
      await respondToOption(participationId, "maybe" as unknown as "accept"),
    ).toEqual({ ok: false, error: "invalid" });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("declines from fix, writing only status", async () => {
    fake = fakeSupabase({ tables: { participations: [row("fix"), ok] } });
    expect(await respondToOption(participationId, "decline")).toEqual({
      ok: true,
    });
    expect(updates()).toEqual([[{ status: "declined" }]]);
  });

  it("accepts from fix without a write", async () => {
    fake = fakeSupabase({ tables: { participations: row("fix") } });
    expect(await respondToOption(participationId, "accept")).toEqual({
      ok: true,
    });
    expect(writes()).toEqual([]);
  });

  it("refuses from interested without a write", async () => {
    fake = fakeSupabase({ tables: { participations: row("interested") } });
    expect(await respondToOption(participationId, "decline")).toEqual({
      ok: false,
      error: "notAllowed",
    });
    expect(writes()).toEqual([]);
  });
});

describe("cancelInterest", () => {
  it.each(["interested", "fix", "awaiting_payment"])(
    "cancels from %s with no proof",
    async (status) => {
      fake = fakeSupabase({
        tables: {
          participations: [row(status), ok],
          payment_proofs: { data: [], error: null },
        },
      });
      expect(await cancelInterest(participationId)).toEqual({ ok: true });
      expect(updates()).toEqual([[{ status: "cancelled" }]]);
    },
  );

  it.each(["paid_claimed", "confirmed", "lapsed", "declined", "cancelled"])(
    "refuses from %s without a write",
    async (status) => {
      fake = fakeSupabase({ tables: { participations: row(status) } });
      expect(await cancelInterest(participationId)).toEqual({
        ok: false,
        error: "notAllowed",
      });
      expect(writes()).toEqual([]);
    },
  );

  it("refuses when a payment proof exists, with no update", async () => {
    fake = fakeSupabase({
      tables: {
        participations: row("awaiting_payment"),
        payment_proofs: { data: [{ id: "p" }], error: null },
      },
    });
    expect(await cancelInterest(participationId)).toEqual({
      ok: false,
      error: "notAllowed",
    });
    expect(writes()).toEqual([]);
  });

  it("fails when the proof lookup fails, with no update", async () => {
    fake = fakeSupabase({
      tables: {
        participations: row("interested"),
        payment_proofs: { data: null, error: { code: "XX000" } },
      },
    });
    expect(await cancelInterest(participationId)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(writes()).toEqual([]);
  });
});
