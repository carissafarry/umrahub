import { afterEach, describe, expect, it, vi } from "vitest";
import { currentYearMonth } from "@/lib/onboarding/validate";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { createTripFromOnboarding } from "./actions";
import OnboardingPage from "./page";

const existingTripId = "11111111-1111-4111-8111-111111111111";
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
  city: "Jakarta",
  year,
  month,
  passport: "valid",
  travelers: [{ name: "Budi", isMinor: false, hasDisability: false }],
  disabilityNotes: null,
};

afterEach(() => {
  createOnboardingTrip.mockReset();
  findLatestTripId.mockReset();
});

describe("createTripFromOnboarding", () => {
  it("sends a user who already has a trip to /dashboard without creating one", async () => {
    fake = fakeSupabase();
    findLatestTripId.mockResolvedValue({ ok: true, tripId: existingTripId });

    await expect(createTripFromOnboarding(input)).rejects.toThrow(
      /^NEXT_REDIRECT \/dashboard$/,
    );
    expect(createOnboardingTrip).not.toHaveBeenCalled();
  });

  it("opens the new trip for a first-time user", async () => {
    fake = fakeSupabase();
    findLatestTripId.mockResolvedValue({ ok: true, tripId: null });
    createOnboardingTrip.mockResolvedValue({ ok: true, tripId: newTripId });

    await expect(createTripFromOnboarding(input)).rejects.toThrow(
      `NEXT_REDIRECT /trips/${newTripId}`,
    );
    expect(createOnboardingTrip).toHaveBeenCalledWith(
      fake.client,
      expect.objectContaining({ city: "Jakarta" }),
      "Umrah Maret 2027",
    );
  });
});

describe("OnboardingPage", () => {
  it("sends a user who already has a trip to /dashboard", async () => {
    fake = fakeSupabase();
    findLatestTripId.mockResolvedValue({ ok: true, tripId: existingTripId });
    await expect(OnboardingPage()).rejects.toThrow(
      /^NEXT_REDIRECT \/dashboard$/,
    );
  });

  it("shows the wizard to a user without trips", async () => {
    fake = fakeSupabase();
    findLatestTripId.mockResolvedValue({ ok: true, tripId: null });
    const page = await OnboardingPage();
    expect(page.props).toMatchObject({ variant: "onboarding" });
  });

  it("redirects a signed-out user to /", async () => {
    fake = fakeSupabase({ user: null });
    await expect(OnboardingPage()).rejects.toThrow(/^NEXT_REDIRECT \/$/);
  });
});
