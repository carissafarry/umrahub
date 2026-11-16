import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { loadCatalogItem, loadProviderProfile } from "./queries";

const providerId = "d0000000-0000-4000-8000-020000000001";
const travelId = "d0000000-0000-4000-8000-020000000007";
const itemId = "d0000000-0000-4000-8000-050000000001";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const muthawif = {
  id: providerId,
  provider_type: "muthawif",
  name: "Ustadz Ahmad",
  bio_id: "Bio",
  bio_en: null,
  whatsapp_number: "628123456789",
  is_dummy: false,
};

const ok = (data: unknown) => ({ data, error: null });
const future = "2999-01-01";

type Result = { data: unknown; error: unknown };

function tables(overrides: Record<string, Result | Result[]> = {}) {
  return {
    providers: [ok(muthawif), ok([])],
    provider_affiliations: ok([]),
    provider_catalog_items: ok([]),
    provider_reviews: ok([]),
    schedules: ok([]),
    provider_verifications: ok([]),
    ...overrides,
  } satisfies Record<string, Result | Result[]>;
}

describe("loadProviderProfile", () => {
  it("redirects a signed-out user to /", async () => {
    fake = fakeSupabase({ user: null });
    await expect(loadProviderProfile(providerId)).rejects.toThrow(
      "NEXT_REDIRECT /",
    );
  });

  it("404s a non-UUID id and a missing provider", async () => {
    fake = fakeSupabase();
    await expect(loadProviderProfile("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.from).not.toHaveBeenCalled();
    fake = fakeSupabase({ tables: { providers: ok(null) } });
    await expect(loadProviderProfile(providerId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("throws a generic error when a query fails", async () => {
    fake = fakeSupabase({
      tables: tables({
        provider_catalog_items: { data: null, error: { code: "42501" } },
      }),
    });
    await expect(loadProviderProfile(providerId)).rejects.toThrow(
      "Failed to load provider",
    );
  });

  it("is verified only for a verified, unexpired row", async () => {
    const verification = (status: string, expires_on: string) =>
      ok([
        {
          provider_id: providerId,
          status,
          verified_on: "2026-10-01",
          expires_on,
        },
      ]);
    const cases: [Result, string | null][] = [
      [verification("verified", future), "2026-10-01"],
      [verification("verified", "2020-01-01"), null],
      [verification("pending", future), null],
      [ok([]), null],
    ];
    for (const [row, expected] of cases) {
      fake = fakeSupabase({ tables: tables({ provider_verifications: row }) });
      expect((await loadProviderProfile(providerId)).verifiedOn).toBe(expected);
    }
  });

  it("gives a wa.me URL for a real provider and none for a dummy one", async () => {
    fake = fakeSupabase({ tables: tables() });
    const real = await loadProviderProfile(providerId);
    expect(real.whatsappUrl).toBe("https://wa.me/628123456789");
    expect(real.contactAvailable).toBe(true);

    fake = fakeSupabase({
      tables: tables({ providers: [ok({ ...muthawif, is_dummy: true }), ok([])] }),
    });
    const dummy = await loadProviderProfile(providerId);
    expect(dummy.whatsappUrl).toBeNull();
    expect(dummy.contactAvailable).toBe(false);
    expect(JSON.stringify(dummy)).not.toContain("628123456789");
  });

  it("never selects private columns or *", async () => {
    fake = fakeSupabase({ tables: tables() });
    await loadProviderProfile(providerId);
    const selects = fake.builders.flatMap(({ builder }) =>
      builder.select.mock.calls.map((call) => String((call as unknown[])[0])),
    );
    for (const select of selects) {
      expect(select).not.toMatch(
        /\*|bank_account_text|reviewed_by|final_group_url/,
      );
    }
    const affiliations = fake.builders.find(
      ({ table }) => table === "provider_affiliations",
    );
    expect(affiliations?.builder.eq).toHaveBeenCalledWith("status", "active");
  });

  it("lists the travel of a muthawif with the verified check", async () => {
    fake = fakeSupabase({
      tables: tables({
        provider_affiliations: ok([
          {
            member_provider_id: providerId,
            organization_provider_id: travelId,
            relationship_type: "works_at",
            started_on: "2024-03-01",
          },
        ]),
        providers: [
          ok(muthawif),
          ok([{ id: travelId, name: "Travel A", provider_type: "travel" }]),
        ],
        provider_verifications: ok([
          {
            provider_id: travelId,
            status: "verified",
            verified_on: "2026-10-01",
            expires_on: future,
          },
        ]),
      }),
    });
    const profile = await loadProviderProfile(providerId);
    expect(profile.affiliations).toEqual([
      {
        providerId: travelId,
        name: "Travel A",
        providerType: "travel",
        relationship: "works_at",
        startedYear: 2024,
        verified: true,
        rating: null,
      },
    ]);
  });

  it("lists a travel's muthawif with their own rating", async () => {
    const travel = { ...muthawif, id: travelId, provider_type: "travel" };
    fake = fakeSupabase({
      tables: tables({
        providers: [
          ok(travel),
          ok([{ id: providerId, name: "Ustadz Ahmad", provider_type: "muthawif" }]),
        ],
        provider_affiliations: ok([
          {
            member_provider_id: providerId,
            organization_provider_id: travelId,
            relationship_type: "works_at",
            started_on: "2024-03-01",
          },
        ]),
        provider_reviews: [
          ok([{ provider_id: travelId, rating: 5, content: "a", display_name: "A", created_at: "2026-10-02" }]),
          ok([
            { provider_id: providerId, rating: 4, content: "b", display_name: "B", created_at: "2026-10-01" },
            { provider_id: providerId, rating: 5, content: "c", display_name: "C", created_at: "2026-10-01" },
          ]),
        ],
      }),
    });
    const profile = await loadProviderProfile(travelId);
    expect(profile.affiliations[0].rating).toEqual({ average: 4.5, count: 2 });
    // The travel's own aggregate never includes its muthawif's reviews.
    expect(profile.rating).toEqual({ average: 5, count: 1 });
    expect(profile.reviews).toHaveLength(1);
  });

  it("aggregates all reviews but shows at most 20", async () => {
    const reviews = Array.from({ length: 25 }, (_, index) => ({
      provider_id: providerId,
      rating: index < 20 ? 5 : 1,
      content: "x",
      display_name: "Siti R.",
      created_at: "2026-10-01",
    }));
    fake = fakeSupabase({ tables: tables({ provider_reviews: ok(reviews) }) });
    const profile = await loadProviderProfile(providerId);
    expect(profile.reviews).toHaveLength(20);
    expect(profile.rating).toEqual({ average: 4.2, count: 25 });
  });

  it("shows the lowest option price on a schedule", async () => {
    fake = fakeSupabase({
      tables: tables({
        schedules: ok([
          {
            id: "s1",
            city: "Makkah",
            schedule_date: "2027-01-10",
            service_types: { name_id: "Bimbingan", name_en: "Guidance" },
            schedule_options: [{ price_sar: "250.00" }, { price_sar: 180 }],
          },
        ]),
      }),
    });
    expect((await loadProviderProfile(providerId)).schedules[0]).toMatchObject({
      fromPriceSar: 180,
      serviceNameEn: "Guidance",
    });
  });
});

describe("loadCatalogItem", () => {
  const item = {
    id: itemId,
    title_id: "Paket",
    title_en: null,
    description_id: "Isi",
    description_en: null,
    image_url: null,
  };

  it("redirects signed out and 404s bad ids", async () => {
    fake = fakeSupabase({ user: null });
    await expect(loadCatalogItem(providerId, itemId)).rejects.toThrow(
      "NEXT_REDIRECT /",
    );
    fake = fakeSupabase();
    await expect(loadCatalogItem(providerId, "x")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    await expect(loadCatalogItem("x", itemId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s an unpublished or foreign item, and an unpublished provider", async () => {
    fake = fakeSupabase({
      tables: {
        providers: ok({ id: providerId, name: "A" }),
        provider_catalog_items: ok(null),
      },
    });
    await expect(loadCatalogItem(providerId, itemId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    fake = fakeSupabase({
      tables: { providers: ok(null), provider_catalog_items: ok(item) },
    });
    await expect(loadCatalogItem(providerId, itemId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("returns the item scoped to the provider in the URL", async () => {
    fake = fakeSupabase({
      tables: {
        providers: ok({ id: providerId, name: "A" }),
        provider_catalog_items: ok(item),
      },
    });
    const data = await loadCatalogItem(providerId, itemId);
    expect(data.item.title_id).toBe("Paket");
    const items = fake.builders.find(
      ({ table }) => table === "provider_catalog_items",
    );
    expect(items?.builder.eq).toHaveBeenCalledWith("provider_id", providerId);
    expect(items?.builder.eq).toHaveBeenCalledWith("is_published", true);
  });
});
