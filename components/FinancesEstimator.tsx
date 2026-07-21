"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { updateShortfallNote } from "@/app/actions";
import { BudgetBoard } from "@/components/BudgetBoard";
import { TrueCost } from "@/components/TrueCost";
import { scenarioAccent } from "@/lib/accents";
import type { BudgetItem, Scenario, Traveler, TripSettings } from "@/lib/data";
import { estimateForScenario } from "@/lib/estimate";
import { fmtMoney } from "@/lib/format";
import { PlanIcon, TravelerAvatar } from "@/lib/icons";

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
    scenarios.find((s) => s.id === settings.lockedScenarioId)?.slug ?? scenarios[0]?.slug ?? "";
  const [slug, setSlug] = useState(initial);
  const scenario = scenarios.find((s) => s.slug === slug);

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
              type="button"
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
              {s.name}
            </button>
          );
        })}
      </div>

      {/* ---------- the bucket ---------- */}
      <motion.section
        key={slug}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 overflow-hidden rounded-2xl border"
        style={{
          borderColor: under ? "var(--mark-green)" : "var(--mark-pink)",
          background: under ? "rgba(77,160,107,0.10)" : "rgba(211,79,140,0.10)",
        }}
      >
        <div className="p-5 md:p-6">
          <p className="text-xs uppercase tracking-widest text-ink-secondary">
            {under ? "Left in the bucket" : "Not enough in the bucket"}
          </p>
          <div className={`font-display text-4xl font-semibold tabular-nums md:text-5xl ${tone}`}>
            {fmtMoney(Math.abs(est.available))}
          </div>
          <p className="mt-1 text-sm text-ink-secondary md:text-base">
            {fmtMoney(est.freed)} freed up
            {est.poolDraw > 0 ? <> − {fmtMoney(est.poolDraw)} nobody budgeted for</> : null} ·{" "}
            <span className="font-medium text-ink">{scenario?.name}</span> really costs{" "}
            <span className="font-medium tabular-nums text-ink">{fmtMoney(est.realTotal)}</span> of
            the {fmtMoney(est.bucketTotal)} yellow pad
          </p>
        </div>

        {/* where the money came from */}
        <div className="border-t border-borderc/60 bg-bg/25 p-5 md:p-6">
          <h3 className="text-xs uppercase tracking-widest text-ink-muted">
            Where the money came from
          </h3>
          <ul className="mt-3 space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {est.savings.map((s) => (
                <motion.li
                  key={`${s.travelerId}-${s.label}-${s.kind}`}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="truncate">{s.label}</span>{" "}
                    <span className="text-xs text-ink-muted">
                      {s.kind === "released"
                        ? `· ${nameOf(s.travelerId)} — not needed on this plan`
                        : `· ${nameOf(s.travelerId)} — real price beat the plan`}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${s.cents < 0 ? "text-mark-pink" : "text-mark-green"}`}
                  >
                    {s.cents < 0 ? "−" : "+"}
                    {fmtMoney(Math.abs(s.cents))}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-borderc/60 pt-2 text-sm font-medium">
            <span>Freed up in total</span>
            <span className="tabular-nums text-mark-green">{fmtMoney(est.freed)}</span>
          </div>
        </div>

        {/* what nobody budgeted for */}
        {est.poolLines.length > 0 && (
          <div className="border-t border-borderc/60 p-5 md:p-6">
            <h3 className="text-xs uppercase tracking-widest text-ink-muted">
              What nobody budgeted for
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Not on anyone&apos;s yellow pad — these come out of the freed-up money.
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
              <span>Drawn from the bucket</span>
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
              placeholder="Jot the plan — e.g. BeX floats it, or trim spending money…"
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
          Each person&apos;s bucket is their yellow-pad plan and never changes. What moves is how
          much of it this plan actually spends — anything it doesn&apos;t goes back in.
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
              <motion.div
                key={p.left}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-2 font-display text-2xl font-semibold tabular-nums ${
                  p.left > 0 ? "text-mark-green" : ""
                }`}
              >
                {fmtMoney(p.left)}
              </motion.div>
              <div className="text-xs uppercase tracking-wider text-ink-muted">Left in bucket</div>
              <div className="mt-1 text-xs tabular-nums text-ink-muted/80">
                {fmtMoney(p.committed)} of {fmtMoney(p.bucket)}
              </div>
            </div>
          ))}
        </div>
        <BudgetBoard travelers={travelers} items={items} estimate={est} />
      </div>

      {/* are we actually saving? */}
      <div className="mt-10">
        <TrueCost scenarios={scenarios} travelers={travelers} items={items} selected={slug} />
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
