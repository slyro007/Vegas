import { LodgingCard } from "@/components/LodgingCard";
import { Reveal } from "@/components/Reveal";
import { getLodging } from "@/lib/data";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lodging · Vegas 2026" };

export default async function LodgingPage() {
  const stays = await getLodging();
  const planned = stays.reduce((s, l) => s + l.plannedCents, 0);
  const bookedStays = stays.filter((l) => l.bookingStatus === "booked");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          four stays · thanks john 🙏
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">Lodging</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
          Every Best Western is on John&apos;s employee rate. Projected{" "}
          <span className="font-medium text-ink">{fmtMoney(planned)}</span> for all four stays —{" "}
          {bookedStays.length > 0
            ? `${bookedStays.length} of ${stays.length} booked so far.`
            : "nothing is booked yet, so it's all projected."}
        </p>
      </Reveal>

      <div className="mt-8 space-y-4">
        {stays.map((stay, i) => (
          <LodgingCard key={stay.id} stay={stay} index={i} />
        ))}
      </div>
    </div>
  );
}
