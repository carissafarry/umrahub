import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { deleteTrip, renameTrip } from "./actions";

const tripId = "11111111-1111-4111-8111-111111111111";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const ownedTrip = { trips: { data: { id: tripId }, error: null } };
const notOwned = { trips: { data: null, error: null } };

function writes() {
  return fake.builders.flatMap(({ builder }) => [
    ...builder.upsert.mock.calls,
    ...builder.insert.mock.calls,
    ...builder.update.mock.calls,
    ...builder.delete.mock.calls,
  ]);
}

// The builder of the write call, so its filters can be checked.
function writeBuilder(op: "update" | "delete") {
  return fake.builders.find(({ builder }) => builder[op].mock.calls.length)!
    .builder;
}

beforeEach(() => {
  revalidatePath.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renameTrip", () => {
  it.each([
    ["not-a-uuid", "Umrah keluarga"],
    [tripId, ""],
    [tripId, "   "],
    [tripId, "a".repeat(81)],
    [tripId, 42 as unknown as string],
  ])("rejects invalid input %s %j without touching the DB", async (id, name) => {
    fake = fakeSupabase({ tables: ownedTrip });
    expect(await renameTrip(id, name)).toEqual({ ok: false, error: "invalid" });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null, tables: ownedTrip });
    expect(await renameTrip(tripId, "Umrah keluarga")).toEqual({
      ok: false,
      error: "failed",
    });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a trip the user doesn't own without writing", async () => {
    fake = fakeSupabase({ tables: notOwned });
    expect(await renameTrip(tripId, "Umrah keluarga")).toEqual({
      ok: false,
      error: "failed",
    });
    const lookup = fake.builders[0].builder;
    expect(lookup.eq).toHaveBeenCalledWith("id", tripId);
    expect(lookup.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(writes()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("updates the trimmed name filtered by id and user_id", async () => {
    fake = fakeSupabase({ tables: ownedTrip });
    expect(await renameTrip(tripId, "  Umrah keluarga  ")).toEqual({
      ok: true,
    });

    expect(writes()).toEqual([[{ name: "Umrah keluarga" }]]);
    const update = writeBuilder("update");
    expect(update.eq).toHaveBeenCalledWith("id", tripId);
    expect(update.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("returns failed and logs only the error code when the update fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fake = fakeSupabase({ tables: ownedTrip });
    // The ownership lookup (first `from`) succeeds; the update (second) fails.
    const failing = fakeSupabase({
      tables: {
        trips: { data: null, error: { code: "42501", message: "Umrah rahasia" } },
      },
    });
    fake.from
      .mockImplementationOnce(fakeSupabase({ tables: ownedTrip }).from)
      .mockImplementationOnce(failing.from);
    expect(await renameTrip(tripId, "Umrah rahasia")).toEqual({
      ok: false,
      error: "failed",
    });
    expect(log.mock.calls).toEqual([["Dashboard: trip rename failed", "42501"]]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteTrip", () => {
  it("rejects an invalid id without touching the DB", async () => {
    fake = fakeSupabase({ tables: ownedTrip });
    expect(await deleteTrip("not-a-uuid")).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null, tables: ownedTrip });
    expect(await deleteTrip(tripId)).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a trip the user doesn't own without deleting", async () => {
    fake = fakeSupabase({ tables: notOwned });
    expect(await deleteTrip(tripId)).toEqual({ ok: false });
    expect(writes()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes the trip filtered by id and user_id", async () => {
    fake = fakeSupabase({ tables: ownedTrip });
    expect(await deleteTrip(tripId)).toEqual({ ok: true });

    expect(writes()).toEqual([[]]);
    const remove = writeBuilder("delete");
    expect(remove.eq).toHaveBeenCalledWith("id", tripId);
    expect(remove.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(fake.builders.map(({ table }) => table)).toEqual(["trips", "trips"]);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
