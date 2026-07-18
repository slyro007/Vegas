import { PlanCompare } from "@/components/PlanCompare";
import { Reveal } from "@/components/Reveal";
import { ScenarioBoard } from "@/components/ScenarioBoard";
import { getScenarios, getTravelers, getTripSettings, getVotes } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Decide · Vegas 2026" };

export default async function ScenariosPage() {
  const [scenarios, travelers, votes, settings] = await Promise.all([
    getScenarios(),
    getTravelers(),
    getVotes(),
    getTripSettings(),
  ]);
  const locked = settings.lockedScenarioId !== null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">The Big Decision</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">
          Drive, rent, fly — or split?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-secondary md:text-base">
          {locked
            ? "The call has been made — but everything's still here if the family wants to reopen it."
            : "Five ways to get this family to Vegas — including the splits where the trio drives and Amma flies. Vote with your name, argue it out, then Lock This Plan when everyone's in. One vote per person."}
        </p>
      </Reveal>

      <Reveal className="mt-8" delay={0.1}>
        <PlanCompare scenarios={scenarios} settings={settings} travelerCount={travelers.length} />
      </Reveal>

      <div className="mt-10">
        <ScenarioBoard
          scenarios={scenarios}
          travelers={travelers}
          votes={votes}
          settings={settings}
        />
      </div>
    </div>
  );
}
