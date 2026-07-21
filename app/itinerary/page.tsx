import { ItineraryView } from "@/components/ItineraryView";
import { Reveal } from "@/components/Reveal";
import { getItinerary, getScenarios, getTripSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Itinerary · Vegas 2026" };

export default async function ItineraryPage() {
  const [events, settings, scenarios] = await Promise.all([
    getItinerary(),
    getTripSettings(),
    getScenarios(),
  ]);

  // default the view to whichever plan the family locked in
  const locked = scenarios.find((s) => s.id === settings.lockedScenarioId);
  const defaultPlan = locked?.slug.startsWith("fly") ? "fly" : "drive";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <ItineraryView events={events} defaultPlan={defaultPlan} />
      </Reveal>
    </div>
  );
}
