import { afterEach, describe, expect, it, vi } from "vitest";
import { currentYearMonth } from "@/lib/onboarding/validate";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { createAdditionalTrip } from "./actions";

const newTripId = "22222222-2222-4222-8222-222222222222";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const createOnboardingTrip = vi.hoisted(() => vi.fn());
const findLatestTripId = vi.hoisted(() => vi.fn());
vi.mock("@/lib/onboarding/createTrip", () => ({
  createOnboardingTrip,
  findLatestTripId,
}));

vi.mock("@/lib/onboarding/tripName", () => ({
  defaultTripName: async () => "Umrah Maret 2027",
}));

const { year, month } = currentYearMonth(new Date());
const input = {
  city: "Medan",
  year,
  month,
  passport: "none",
  travelers: [{ name: "Siti Aminah", isMinor: false, hasDisability: false }],
  disabilityNotes: null,
};

const tripCount = (count: number | null, error: unknown = null) => ({
  trips: { data: null, error, count },
});

afterEach(() => {
  createOnboardingTrip.mockReset();
  findLatestTripId.mockReset();
  vi.restoreAllMocks();
});

describe("createAdditionalTrip", () => {
  it("redirects a signed-out user to / without touching the DB", async () => {
    fake = fakeSupabase({ user: null, tables: tripCount(1) });
    await expect(createAdditionalTrip(input)).rejects.toThrow(
      "NEXT_REDIRECT /",
    );
    expect(fake.from).not.toHaveBeenCalled();
    expect(createOnboardingTrip).not.toHaveBeenCalled();
  });

  it("rejects invalid input without touching the DB", async () => {
    fake = fakeSupabase({ tables: tripCount(1) });
    expect(await createAdditionalTrip({ ...input, city: "Bandung" })).toEqual({
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it.each([20, 21])("returns limit at %i trips without creating one", async (n) => {
    fake = fakeSupabase({ tables: tripCount(n) });
    expect(await createAdditionalTrip(input)).toEqual({ error: "limit" });
    const count = fake.builders[0].builder;
    expect(count.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(count.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(createOnboardingTrip).not.toHaveBeenCalled();
  });

  it("returns failed when the count fails, logging only the code", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fake = fakeSupabase({
      tables: tripCount(null, { code: "500", message: "Siti Aminah" }),
    });
    expect(await createAdditionalTrip(input)).toEqual({ error: "failed" });
    expect(log.mock.calls).toEqual([["New trip: trip count failed", "500"]]);
    expect(createOnboardingTrip).not.toHaveBeenCalled();
  });

  it("creates the trip for a user who already has trips and opens it", async () => {
    fake = fakeSupabase({ tables: tripCount(19) });
    createOnboardingTrip.mockResolvedValue({ ok: true, tripId: newTripId });

    await expect(createAdditionalTrip(input)).rejects.toThrow(
      `NEXT_REDIRECT /trips/${newTripId}`,
    );
    expect(findLatestTripId).not.toHaveBeenCalled();
    expect(createOnboardingTrip).toHaveBeenCalledWith(
      fake.client,
      expect.objectContaining({ city: "Medan", year, month }),
      "Umrah Maret 2027",
    );
  });

  it("returns failed when the trip can't be created", async () => {
    fake = fakeSupabase({ tables: tripCount(3) });
    createOnboardingTrip.mockResolvedValue({
      ok: false,
      error: "create_failed",
    });
    expect(await createAdditionalTrip(input)).toEqual({ error: "failed" });
  });
});
