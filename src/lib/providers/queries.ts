import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/trips/checklist";

export type ProviderType = "muthawif" | "travel";
export type RelationshipType = "works_at" | "owner" | "partner";

type ProviderRow = {
  id: string;
  provider_type: ProviderType;
  name: string;
  bio_id: string | null;
  bio_en: string | null;
  whatsapp_number: string | null;
  is_dummy: boolean;
};

type AffiliationRow = {
  member_provider_id: string;
  organization_provider_id: string;
  relationship_type: RelationshipType;
  started_on: string;
};

type OtherProviderRow = { id: string; name: string; provider_type: ProviderType };

type VerificationRow = {
  provider_id: string;
  status: string;
  verified_on: string | null;
  expires_on: string | null;
};

type ReviewRow = {
  provider_id: string;
  rating: number;
  content: string;
  display_name: string;
  created_at: string;
};

export type CatalogItem = {
  id: string;
  title_id: string;
  title_en: string | null;
  description_id: string;
  description_en: string | null;
  image_url: string | null;
};

type ScheduleRow = {
  id: string;
  city: string;
  schedule_date: string;
  service_types: { name_id: string; name_en: string } | null;
  schedule_options: { price_sar: number | string }[];
};

export type Rating = { average: number; count: number };

export type Affiliation = {
  providerId: string;
  name: string;
  providerType: ProviderType;
  relationship: RelationshipType;
  startedYear: number;
  verified: boolean;
  rating: Rating | null;
};

export type ProfileReview = Omit<ReviewRow, "provider_id">;

export type ProfileSchedule = {
  id: string;
  city: string;
  scheduleDate: string;
  serviceNameId: string;
  serviceNameEn: string;
  fromPriceSar: number | null;
};

// Everything the profile page shows. The raw WhatsApp number and `is_dummy`
// stay in the loader: components only get `whatsappUrl` (null for a dummy
// provider or a missing number).
export type ProviderProfileData = {
  id: string;
  providerType: ProviderType;
  name: string;
  bioId: string | null;
  bioEn: string | null;
  verifiedOn: string | null;
  rating: Rating | null;
  affiliations: Affiliation[];
  catalog: CatalogItem[];
  reviews: ProfileReview[];
  schedules: ProfileSchedule[];
  whatsappUrl: string | null;
  contactAvailable: boolean;
};

export type CatalogItemData = {
  provider: { id: string; name: string };
  item: CatalogItem;
};

// Shown newest first; the average and count still cover every visible review.
const reviewLimit = 20;

const noRows = { data: [], error: null };

const catalogColumns =
  "id, title_id, title_en, description_id, description_en, image_url";

// "Terverifikasi" needs a verified row that has not expired (AGENTS.md,
// Provider catalog). Both dates are `YYYY-MM-DD`, so strings compare.
function isVerified(row: VerificationRow | undefined, today: string) {
  return (
    row?.status === "verified" &&
    row.expires_on !== null &&
    row.expires_on >= today
  );
}

function aggregate(ratings: number[]): Rating | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return { average: sum / ratings.length, count: ratings.length };
}

async function signedInClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return supabase;
}

function fail(message: string, cause: unknown): never {
  throw new Error(message, { cause });
}

// Loads /penyedia/[id] under the user's RLS. Signed out → redirect to `/`; a
// bad id or a missing/unpublished provider → 404. A provider without a
// visible verification is still shown, just not as verified.
export async function loadProviderProfile(
  id: string,
): Promise<ProviderProfileData> {
  const supabase = await signedInClient();
  if (!isUuid(id)) notFound();

  const today = new Date().toISOString().slice(0, 10);

  const providerResult = await supabase
    .from("providers")
    .select(
      "id, provider_type, name, bio_id, bio_en, whatsapp_number, is_dummy",
    )
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle<ProviderRow>();
  if (providerResult.error) {
    fail("Failed to load provider", providerResult.error);
  }
  const provider = providerResult.data;
  if (!provider) notFound();

  const [affiliations, catalog, reviews, schedules] = await Promise.all([
    supabase
      .from("provider_affiliations")
      .select(
        "member_provider_id, organization_provider_id, relationship_type, started_on",
      )
      .eq("status", "active")
      .or(`member_provider_id.eq.${id},organization_provider_id.eq.${id}`)
      .order("started_on")
      .overrideTypes<AffiliationRow[], { merge: false }>(),
    supabase
      .from("provider_catalog_items")
      .select(catalogColumns)
      .eq("provider_id", id)
      .eq("is_published", true)
      .order("sort_order")
      .order("id")
      .overrideTypes<CatalogItem[], { merge: false }>(),
    supabase
      .from("provider_reviews")
      .select("provider_id, rating, content, display_name, created_at")
      .eq("provider_id", id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .overrideTypes<ReviewRow[], { merge: false }>(),
    supabase
      .from("schedules")
      .select(
        "id, city, schedule_date, service_types(name_id, name_en), schedule_options(price_sar)",
      )
      .eq("provider_id", id)
      .eq("is_published", true)
      .gte("schedule_date", today)
      .order("schedule_date")
      .order("id")
      .overrideTypes<ScheduleRow[], { merge: false }>(),
  ]);
  const firstError =
    affiliations.error ?? catalog.error ?? reviews.error ?? schedules.error;
  if (firstError) fail("Failed to load provider", firstError);
  const reviewRows = reviews.data ?? [];

  // The organization (travel) or the member (muthawif) on the other side.
  const isTravel = provider.provider_type === "travel";
  const links = (affiliations.data ?? []).filter((row) =>
    isTravel
      ? row.organization_provider_id === id
      : row.member_provider_id === id,
  );
  const otherId = (row: AffiliationRow) =>
    isTravel ? row.member_provider_id : row.organization_provider_id;
  const otherIds = [...new Set(links.map(otherId))];

  const [others, verifications, memberReviews] = await Promise.all([
    otherIds.length > 0
      ? supabase
          .from("providers")
          .select("id, name, provider_type")
          .in("id", otherIds)
          .eq("is_published", true)
          .overrideTypes<OtherProviderRow[], { merge: false }>()
      : noRows,
    supabase
      .from("provider_verifications")
      .select("provider_id, status, verified_on, expires_on")
      .in("provider_id", [id, ...otherIds])
      .overrideTypes<VerificationRow[], { merge: false }>(),
    isTravel && otherIds.length > 0
      ? supabase
          .from("provider_reviews")
          .select("provider_id, rating, content, display_name, created_at")
          .in("provider_id", otherIds)
          .eq("is_hidden", false)
          .overrideTypes<ReviewRow[], { merge: false }>()
      : noRows,
  ]);
  const laterError = others.error ?? verifications.error ?? memberReviews.error;
  if (laterError) fail("Failed to load provider", laterError);

  const verificationOf = new Map(
    (verifications.data as VerificationRow[]).map((row) => [
      row.provider_id,
      row,
    ]),
  );
  const otherById = new Map(
    (others.data as OtherProviderRow[]).map((row) => [row.id, row]),
  );
  const memberRatings = memberReviews.data as ReviewRow[];

  const affiliationList: Affiliation[] = [];
  for (const row of links) {
    const other = otherById.get(otherId(row));
    if (!other) continue;
    affiliationList.push({
      providerId: other.id,
      name: other.name,
      providerType: other.provider_type,
      relationship: row.relationship_type,
      startedYear: Number(row.started_on.slice(0, 4)),
      verified: isVerified(verificationOf.get(other.id), today),
      rating: aggregate(
        memberRatings
          .filter((review) => review.provider_id === other.id)
          .map((review) => review.rating),
      ),
    });
  }

  const own = verificationOf.get(id);
  const verified = isVerified(own, today);
  const whatsappUrl =
    !provider.is_dummy && provider.whatsapp_number
      ? `https://wa.me/${provider.whatsapp_number}`
      : null;

  return {
    id: provider.id,
    providerType: provider.provider_type,
    name: provider.name,
    bioId: provider.bio_id,
    bioEn: provider.bio_en,
    verifiedOn: verified ? (own?.verified_on ?? null) : null,
    rating: aggregate(reviewRows.map((review) => review.rating)),
    affiliations: affiliationList,
    catalog: catalog.data ?? [],
    reviews: reviewRows
      .slice(0, reviewLimit)
      .map(({ rating, content, display_name, created_at }) => ({
        rating,
        content,
        display_name,
        created_at,
      })),
    schedules: (schedules.data ?? []).map((row) => {
      const prices = row.schedule_options.map((option) =>
        Number(option.price_sar),
      );
      return {
        id: row.id,
        city: row.city,
        scheduleDate: row.schedule_date,
        serviceNameId: row.service_types?.name_id ?? "",
        serviceNameEn: row.service_types?.name_en ?? "",
        fromPriceSar: prices.length > 0 ? Math.min(...prices) : null,
      };
    }),
    whatsappUrl,
    contactAvailable: whatsappUrl !== null,
  };
}

// Loads /penyedia/[id]/katalog/[itemId]. An item that is unpublished or
// belongs to another provider is a 404, like an unpublished provider.
export async function loadCatalogItem(
  providerId: string,
  itemId: string,
): Promise<CatalogItemData> {
  const supabase = await signedInClient();
  if (!isUuid(providerId) || !isUuid(itemId)) notFound();

  const [providerResult, itemResult] = await Promise.all([
    supabase
      .from("providers")
      .select("id, name")
      .eq("id", providerId)
      .eq("is_published", true)
      .maybeSingle<{ id: string; name: string }>(),
    supabase
      .from("provider_catalog_items")
      .select(catalogColumns)
      .eq("id", itemId)
      .eq("provider_id", providerId)
      .eq("is_published", true)
      .maybeSingle<CatalogItem>(),
  ]);
  const loadError = providerResult.error ?? itemResult.error;
  if (loadError) fail("Failed to load catalog item", loadError);
  if (!providerResult.data || !itemResult.data) notFound();
  return { provider: providerResult.data, item: itemResult.data };
}
