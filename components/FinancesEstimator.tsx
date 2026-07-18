"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { updateShortfallNote } from "@/app/actions";
import { BudgetBoard } from "@/components/BudgetBoard";
import { scenarioAccent } from "@/lib/accents";
import type { BudgetItem, Scenario, Traveler, TripSettings } from "@/lib/data";
import { estimateForScenario } from "@/lib/estimate";
import { fmtMoney } from "@/lib/format";
import { PlanIcon } from "@/lib/icons";

export function FinancesEstimator({
  travelers,
  items,
  scenarios,
  settings,
}: {
  travelers: Traveler[];
  items: BudgetItem[];
  scenarios: Scenario[];
  settings: TripSettings;
}) {
  const initial =
    scenarios.find((s) => s.id === settings.lockedScenarioId)?.slug ??
    scenarios[0]?.slug ??
    "";
  const [slug, setSlug] = useState(initial);
  const scenario = scenarios.find((s) => s.slug === slug);

  const est = useMemo(
    () => estimateForScenario(travelers, items, scenario),
    [travelers, items, scenario],
  );

  const [note, setNote] = useState(settings.shortfallNote ?? "");
  const [, startTransition] = useTransition();
  const saveNote = () => startTransition(() => updateShortfallNote(note));

  const under = est.delta >= 0;
  const spentTotal = est.perPerson.reduce((a, p) => a + p.spent, 0);

  return (
    <div>
      {/* scenario toggle */}
      <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {scenarios.map((s) => {
          const active = s.slug === slug;
          const a = scenarioAccent(s.slug);
          return (
            <button
              key={s.id}
              onClick={() => setSlug(s.slug)}
              className="relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: active ? a.mark : "var(--border)",
                background: active ? a.soft : "transparent",
                color: active ? "var(--ink)" : "var(--ink-muted)",
              }}
            >
              <span style={{ color: a.mark }}>
                <PlanIcon plan={s.slug} className="h-[1.15rem] w-[1.15rem]" />
              </span>
              {s.name.replace(/ · /, " · ")}
            </button>
          );
        })}
      </div>

      {/* surplus / shortfall banner */}
      <motion.div
        key={slug}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border p-4 md:p-5"
        style={{
          borderColor: under ? "var(--mark-green)" : "var(--mark-pink)",
          background: under ? "rgba(77,160,107,0.12)" : "rgba(211,79,140,0.12)",
        }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="font-display text-lg font-semibold md:text-xl">
            {scenario?.name} runs{" "}
            <span className={under ? "text-mark-green" : "text-mark-pink"}>
              {fmtMoney(Math.abs(est.delta))} {under ? "under" : "over"}
            </span>{" "}
            the yellow-pad budget
          </div>
          <div className="text-sm text-ink-muted">
            {fmtMoney(est.familyEstimate)} est. · {fmtMoney(est.yellowPool)} planned
          </div>
        </div>
        {!under && (
          <div className="mt-3">
            <p className="text-sm text-mark-pink">
              We&apos;re short {fmtMoney(est.shortfall)} — where&apos;s the rest coming from?
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              placeholder="Jot the plan — e.g. BeX floats it, or trim spending money…"
              rows={2}
              className="mt-2 w-full rounded-xl border border-borderc bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-glow-pink/60"
            />
          </div>
        )}
        {under && est.yellowPool > est.familyEstimate && (
          <p className="mt-2 text-sm text-ink-secondary">
            The real Luxor + Best Western deals freed up {fmtMoney(est.delta)} against the plan —
            enough to cover this scenario with room to spare.
          </p>
        )}
      </motion.div>

      {/* stat row */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Yellow-Pad Budget", cents: est.yellowPool, hint: "The original plan for all four" },
          { label: "Estimated · This Plan", cents: est.familyEstimate, hint: "Everyone's lines + the plan's shared travel" },
          {
            label: under ? "Under Budget" : "Short By",
            cents: Math.abs(est.delta),
            hint: under ? "Saved vs the yellow pad" : "Need to find this",
            tone: under ? "text-mark-green" : "text-mark-pink",
          },
          { label: "Actually Spent", cents: spentTotal, hint: spentTotal > 0 ? "Logged so far" : "Nothing yet" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-borderc bg-card p-4">
            <div className={`font-display text-xl font-semibold tabular-nums md:text-2xl ${s.tone ?? ""}`}>
              {fmtMoney(s.cents)}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-ink-muted">{s.label}</div>
            <div className="text-xs text-ink-muted/70">{s.hint}</div>
          </div>
        ))}
      </section>

      {/* per-person board — each person's own responsibility, scenario-independent */}
      <div className="mt-8">
        <p className="mb-3 text-xs text-ink-muted">
          Below is what each person is on the hook for — their own yellow-pad plan, fixed. The
          plan&apos;s shared travel is pooled up top, not split onto anyone.
        </p>
        <BudgetBoard travelers={travelers} items={items} />
      </div>

      <AnimatePresence>
        {settings.shortfallNote && under && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-xs text-ink-muted"
          >
            Saved note (from a tighter plan): {settings.shortfallNote}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
