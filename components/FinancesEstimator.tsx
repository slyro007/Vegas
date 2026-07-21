"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { updateShortfallNote } from "@/app/actions";
import { BudgetBoard } from "@/components/BudgetBoard";
import type { BudgetItem, Scenario, Traveler, TripSettings } from "@/lib/data";
import { estimateForScenario } from "@/lib/estimate";
import { fmtMoney } from "@/lib/format";
import { TravelerAvatar } from "@/lib/icons";

/**
 * The money board for the booked trip. No scenario toggle — the decision is
 * made, so the locked plan's cost lines price everything.
 */
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
  const scenario =
    scenarios.find((s) => s.id === settings.lockedScenarioId) ??
    scenarios.find((s) => s.slug === "fly") ??
    scenarios[0];

  const est = useMemo(
    () => estimateForScenario(travelers, items, scenario),
    [travelers, items, scenario],
  );

  const [note, setNote] = useState(settings.shortfallNote ?? "");
  const [, startTransition] = useTransition();
  const saveNote = () => startTransition(() => updateShortfallNote(note));

  const under = est.available >= 0;
  const tone = under ? "text-mark-green" : "text-mark-pink";
  const nameOf = (id: number | null) => travelers.find((t) => t.id === id)?.name ?? "The trip";

  // how each freed/covered dollar should read — contribution, never debt
  const savingContext = (s: (typeof est.savings)[number]) => {
    const name = nameOf(s.travelerId);
    if (s.kind === "released") return `· ${name} — not needed on this plan`;
    if (s.cents >= 0) return `· ${name} — real price beat the plan`;
    const item = items.find(
      (i) => i.travelerId === s.travelerId && i.label === s.label,
    );
    return item && item.yellowPadCents === 0
      ? `· nobody budgeted this — ${name} is covering it`
      : `· ${name} — runs past the yellow pad`;
  };

  return (
    <div>
      {/* ---------- the bucket, booked plan only ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: under ? "var(--mark-green)" : "var(--mark-pink)",
          background: under ? "rgba(77,160,107,0.10)" : "rgba(211,79,140,0.10)",
        }}
      >
        <div className="p-5 md:p-6">
          <p className="text-xs uppercase tracking-widest text-ink-secondary">
            {under ? "Left in the bucket" : "Short of the yellow pad"}
          </p>
          <div className={`font-display text-4xl font-semibold tabular-nums md:text-5xl ${tone}`}>
            {fmtMoney(Math.abs(est.available))}
          </div>
          <p className="mt-1 text-sm text-ink-secondary md:text-base">
            The booked trip really costs{" "}
            <span className="font-medium tabular-nums text-ink">{fmtMoney(est.realTotal)}</span>{" "}
            against the {fmtMoney(est.bucketTotal)} everyone planned on the yellow pad
            {under ? "." : " — pitch into the pot or trim if you want to close it."}
          </p>
        </div>

        {/* where the money moved */}
        <div className="border-t border-borderc/60 bg-bg/25 p-5 md:p-6">
          <h3 className="text-xs uppercase tracking-widest text-ink-muted">
            Where the money moved
          </h3>
          <ul className="mt-3 space-y-2">
            {est.savings.map((s) => (
              <li
                key={`${s.travelerId}-${s.label}-${s.kind}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="truncate">{s.label}</span>{" "}
                  <span className="text-xs text-ink-muted">{savingContext(s)}</span>
                </span>
                <span
                  className={`shrink-0 tabular-nums ${s.cents < 0 ? "text-mark-pink" : "text-mark-green"}`}
                >
                  {s.cents < 0 ? "−" : "+"}
                  {fmtMoney(Math.abs(s.cents))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* what nobody budgeted for */}
        {est.poolLines.length > 0 && (
          <div className="border-t border-borderc/60 p-5 md:p-6">
            <h3 className="text-xs uppercase tracking-widest text-ink-muted">
              Shared costs nobody&apos;s yellow pad covered
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Bags, the rental, ubers, fuel — they come out of whatever the buckets free up.
            </p>
            <ul className="mt-3 space-y-2">
              {est.poolLines.map((l) => (
                <li key={l.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-secondary">{l.label}</span>
                  <span className="shrink-0 tabular-nums text-mark-pink">−{fmtMoney(l.cents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-borderc/60 pt-2 text-sm font-medium">
              <span>Drawn from the pot</span>
              <span className="tabular-nums text-mark-pink">−{fmtMoney(est.poolDraw)}</span>
            </div>
          </div>
        )}

        {!under && (
          <div className="border-t border-borderc/60 p-5 md:p-6">
            <p className="text-sm font-medium text-mark-pink">
              We&apos;re short {fmtMoney(est.shortfall)} — where&apos;s the rest coming from?
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              placeholder="Jot the plan — pitch into the pot, trim spending money, or let it ride…"
              rows={2}
              className="mt-2 w-full rounded-xl border border-borderc bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-glow-pink/60"
            />
          </div>
        )}
      </motion.section>

      {/* per-person buckets */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold md:text-2xl">Everyone&apos;s bucket</h2>
        <p className="mb-4 mt-1 text-sm text-ink-secondary">
          Each person&apos;s bucket is their yellow-pad plan. What the booked trip doesn&apos;t
          need goes back in; anyone carrying more than their bucket is contributing, and anyone
          with room can pitch in if they want to.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {est.perPerson.map((p) => (
            <div key={p.traveler.id} className="rounded-2xl border border-borderc bg-card p-4">
              <div className="flex items-center gap-2">
                <TravelerAvatar
                  name={p.traveler.name}
                  color={p.traveler.color}
                  className="h-7 w-7 text-sm"
                />
                <span className="truncate text-sm font-medium">{p.traveler.name}</span>
              </div>
              <div
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${
                  p.left > 0 ? "text-mark-green" : p.left < 0 ? "text-mark-pink" : ""
                }`}
              >
                {fmtMoney(Math.abs(p.left))}
              </div>
              <div className="text-xs uppercase tracking-wider text-ink-muted">
                {p.left < 0 ? "Beyond their bucket" : "Left in bucket"}
              </div>
              <div className="mt-1 text-xs tabular-nums text-ink-muted/80">
                {fmtMoney(p.committed)} of {fmtMoney(p.bucket)}
              </div>
            </div>
          ))}
        </div>
        <BudgetBoard travelers={travelers} items={items} estimate={est} />
      </div>

      <AnimatePresence>
        {settings.shortfallNote && under && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-xs text-ink-muted"
          >
            Saved note: {settings.shortfallNote}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
