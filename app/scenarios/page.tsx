import { Reveal } from "@/components/Reveal";
import { ScenarioBoard } from "@/components/ScenarioBoard";
import { getScenarios, getTravelers, getVotes } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Decide · Vegas 2026" };

export default async function ScenariosPage() {
  const [scenarios, travelers, votes] = await Promise.all([
    getScenarios(),
    getTravelers(),
    getVotes(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">the big decision</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">
          Drive, rent, or fly?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-secondary md:text-base">
          Three ways to get this family to Vegas. Tap your name under the one you want — you can
          change your vote any time. One vote per person.
        </p>
      </Reveal>

      <div className="mt-10">
        <ScenarioBoard scenarios={scenarios} travelers={travelers} votes={votes} />
      </div>
    </div>
  );
}
