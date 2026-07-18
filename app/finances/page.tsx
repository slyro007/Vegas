import Link from "next/link";
import { FinancesEstimator } from "@/components/FinancesEstimator";
import { PlanCompare } from "@/components/PlanCompare";
import { Reveal } from "@/components/Reveal";
import {
  getBudgetItems,
  getExpenses,
  getScenarios,
  getTravelers,
  getTripSettings,
} from "@/lib/data";
import { CATEGORY_META, fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Finances · Vegas 2026" };

export default async function FinancesPage() {
  const [travelers, items, expenses, scenarios, settings] = await Promise.all([
    getTravelers(),
    getBudgetItems(),
    getExpenses(),
    getScenarios(),
    getTripSettings(),
  ]);

  // ordered by top spender (most projected first) — BeX leads
  const projectedFor = (id: number) =>
    items.filter((i) => i.travelerId === id).reduce((s, i) => s + i.plannedCents, 0);
  const orderedTravelers = [...travelers].sort((a, b) => projectedFor(b.id) - projectedFor(a.id));

  const byCategory = Object.entries(CATEGORY_META)
    .map(([key, meta]) => ({
      key,
      meta,
      planned: items.filter((i) => i.category === key).reduce((s, i) => s + i.plannedCents, 0),
    }))
    .filter((c) => c.planned > 0)
    .sort((a, b) => b.planned - a.planned);
  const maxCat = Math.max(...byCategory.map((c) => c.planned));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">the money plan</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">Trip Finances</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-secondary md:text-base">
          The <span className="font-medium text-ink">yellow pad</span> is what each person planned
          to cover. <span className="font-medium text-ink">Projected</span> is the refined number
          (the real Luxor + Best Western deals came in cheaper). Toggle a scenario to see whether
          the whole trip still <span className="font-medium text-ink">fits the budget</span> — each
          person&apos;s own responsibility stays put; the shared travel is pooled. Log real spend on
          the{" "}
          <Link href="/expenses" className="text-glow-pink hover:underline">
            Spend page
          </Link>
          .
        </p>
      </Reveal>

      {/* the plan money comparison */}
      <Reveal className="mt-8" delay={0.05}>
        <PlanCompare scenarios={scenarios} settings={settings} travelerCount={travelers.length} />
      </Reveal>

      {/* scenario-aware estimator: toggle · surplus/shortfall · per-person board */}
      <Reveal className="mt-8" delay={0.05}>
        <FinancesEstimator
          travelers={orderedTravelers}
          items={items}
          scenarios={scenarios}
          settings={settings}
        />
      </Reveal>

      {/* category breakdown */}
      <Reveal className="mt-8">
        <section className="rounded-2xl border border-borderc bg-card p-5">
          <h2 className="text-xs uppercase tracking-widest text-ink-muted">
            projected spend by category
          </h2>
          <div className="mt-4 space-y-2.5">
            {byCategory.map((cat) => (
              <div key={cat.key} title={`${cat.meta.label}: ${fmtMoney(cat.planned)}`}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cat.meta.cssVar }} />
                    {cat.meta.label}
                  </span>
                  <span className="tabular-nums">{fmtMoney(cat.planned)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(cat.planned / maxCat) * 100}%`, background: cat.meta.cssVar }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <p className="mt-6 text-xs text-ink-muted">
        Yellow-pad lines are the original plan; edit any Projected or Actual amount inline. Shared
        travel + lodging is split evenly four ways in the Estimate; personal lines stay with the
        person. Lines with logged expenses show the logged sum as their actual.
      </p>
    </div>
  );
}
