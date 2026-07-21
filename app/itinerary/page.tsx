import { ItineraryView } from "@/components/ItineraryView";
import { Reveal } from "@/components/Reveal";
import { getItinerary } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Itinerary · Vegas 2026" };

export default async function ItineraryPage() {
  const events = await getItinerary();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <ItineraryView events={events} />
      </Reveal>
    </div>
  );
}
