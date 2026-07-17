import { Reveal } from "@/components/Reveal";
import { Timeline, type TimelineDay } from "@/components/Timeline";
import { getItinerary } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Itinerary · Vegas 2026" };

export default async function ItineraryPage() {
  const events = await getItinerary();

  const byDate = new Map<string, typeof events>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  const days: TimelineDay[] = [...byDate.entries()].map(([date, dayEvents], i) => ({
    date,
    dayNumber: i + 1,
    // a day is "vegas" if any event that day is
    theme: dayEvents.some((e) => e.theme === "vegas") ? "vegas" : "desert",
    events: dayEvents,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">Aug 7 – 16, 2026</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">The Itinerary</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
          Ten days: two big hauls, horses on our land in Valle, five nights of Vegas, and a
          red-rock finale in Sedona. The rail turns neon when the trip does.
        </p>
      </Reveal>

      <div className="mt-10">
        <Timeline days={days} />
      </div>
    </div>
  );
}
