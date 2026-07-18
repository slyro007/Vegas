import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { BudgetBoard } from "@/components/BudgetBoard";
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
  const loggedTotal = expenses.reduce((s, e) => s + e.amountCents, 0);

  const budgetTotal = travelers.reduce((s, t) => s + t.budgetTotalCents, 0);
  const plannedTotal = items.reduce((s, i) => s + i.plannedCents, 0);
  const withActuals = items.filter((i) => i.actualCents !== null);
  const actualTotal = withActuals.reduce((s, i) => s + (i.actualCents ?? 0), 0);
  const savedTotal = withActuals.reduce((s, i) => s + i.plannedCents - (i.actualCents ?? 0), 0);

  const byCategory = Object.entries(CATEGORY_META)
    .map(([key, meta]) => {
      const catItems = items.filter((i) => i.category === key);
      return {
        key,
        meta,
        planned: catItems.reduce((s, i) => s + i.plannedCents, 0),
      };
    })
    .filter((c) => c.planned > 0)
    .sort((a, b) => b.planned - a.planned);
  const maxCat = Math.max(...byCategory.map((c) => c.planned));

  const stats = [
    { label: "Per-Person Budgets", cents: budgetTotal, hint: "The yellow-pad totals" },
    { label: "Planned Line Items", cents: plannedTotal, hint: "Everything itemized below" },
    { label: "Actuals Locked In", cents: actualTotal, hint: `${withActuals.length} items priced` },
    { label: "Under Plan So Far", cents: savedTotal, hint: "Cheaper than budgeted 🎉", accent: true },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <Reveal>
        <p className="text-xs uppercase tracking-widest text-ink-muted">from the yellow pad</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">Trip Finances</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-secondary md:text-base">
          Who covers what, planned vs. what things actually cost. Tap any amount to edit it, add
          lines as plans firm up — and once the trip starts,{" "}
          <Link href="/expenses" className="text-glow-pink hover:underline">
            log expenses on the Spend page
          </Link>{" "}
          ({expenses.length > 0
            ? `${fmtMoney(loggedTotal)} logged so far`
            : "nothing logged yet"}) and the actuals here update live.
        </p>
      </Reveal>

      {/* drive vs fly — the money story */}
      <Reveal className="mt-8" delay={0.05}>
        <PlanCompare scenarios={scenarios} settings={settings} travelerCount={travelers.length} />
      </Reveal>

      {/* stat row */}
      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.07}>
            <div className="h-full rounded-2xl border border-borderc bg-card p-4">
              <div
                className={`font-display text-xl font-semibold tabular-nums md:text-2xl ${
                  stat.accent ? "text-mark-green" : ""
                }`}
              >
                <AnimatedNumber value={stat.cents / 100} prefix="$" />
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-muted">
                {stat.label}
              </div>
              <div className="text-[11px] text-ink-muted/70">{stat.hint}</div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* category breakdown */}
      <Reveal className="mt-8">
        <section className="rounded-2xl border border-borderc bg-card p-5">
          <h2 className="text-xs uppercase tracking-widest text-ink-muted">
            planned spend by category
          </h2>
          <div className="mt-4 space-y-2.5">
            {byCategory.map((cat) => (
              <div key={cat.key} title={`${cat.meta.label}: ${fmtMoney(cat.planned)}`}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: cat.meta.cssVar }}
                    />
                    {cat.meta.label}
                  </span>
                  <span className="tabular-nums">{fmtMoney(cat.planned)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(cat.planned / maxCat) * 100}%`,
                      background: cat.meta.cssVar,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* per-person board */}
      <div className="mt-8">
        <BudgetBoard travelers={travelers} items={items} />
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        Note: the yellow-pad per-person totals ({fmtMoney(budgetTotal)}) and the itemized lines (
        {fmtMoney(plannedTotal)}) don&apos;t perfectly agree — that&apos;s how the notes were.
        Edit anything above to reconcile. Lines with logged expenses always show the logged sum
        as their actual.
      </p>
    </div>
  );
}
