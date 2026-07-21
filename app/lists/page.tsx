import { Checklist } from "@/components/Checklist";
import { Reveal } from "@/components/Reveal";
import { getChecklist } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lists · Vegas 2026" };

export default async function ListsPage() {
  const items = await getChecklist();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">shared · live for everyone</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">The Lists</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-secondary md:text-base">
          Check things off and they update for the whole family. The grocery lists keep
          Amma&apos;s food safe once we have the SUV.
        </p>
      </Reveal>

      <div className="mt-8">
        <Checklist items={items} />
      </div>
    </div>
  );
}
