import { TripChecklist } from "@/components/trips/TripChecklist";
import { loadTripChecklist } from "@/lib/trips/queries";

export default async function TripChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <TripChecklist {...await loadTripChecklist((await params).id)} />;
}
