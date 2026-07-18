"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { unlockScenario } from "@/app/actions";
import { scenarioAccent } from "@/lib/accents";
import type { Scenario, TripSettings } from "@/lib/data";
import { fmtMoney } from "@/lib/format";

const total = (s: Scenario) => s.costLines.reduce((sum, l) => sum + l.cents, 0);

/**
 * The drive-vs-fly money story, shared by Decide and Finances.
 * Unlocked: full comparison with deltas. Locked: collapses to a banner.
 */
export function PlanCompare({
  scenarios,
  settings,
  travelerCount,
}: {
  scenarios: Scenario[];
  settings: TripSettings;
  travelerCount: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [pending, startTransition] = useTransition();

  const locked = scenarios.find((s) => s.id === settings.lockedScenarioId);

  /* ---------- locked banner ---------- */
  if (locked) {
    const accent = scenarioAccent(locked.slug);
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 rounded-2xl border p-4 md:p-5"
        style={{ borderColor: accent.mark, background: accent.soft, boxShadow: `0 0 24px ${accent.glow}` }}
      >
        <span className="text-2xl">🔒</span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-widest text-ink-secondary">
            The Decision Is Made
          </div>
          <div className="font-display text-lg font-semibold md:text-xl">
            {locked.emoji} {locked.name} · {fmtMoney(total(locked))}
          </div>
        </div>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirmUnlock) {
              setConfirmUnlock(true);
              setTimeout(() => setConfirmUnlock(false), 3000);
              return;
            }
            startTransition(() => unlockScenario());
          }}
          className="rounded-full border border-borderc-strong bg-bg/40 px-3.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          {confirmUnlock ? "Tap Again to Unlock" : "Unlock"}
        </button>
      </motion.section>
    );
  }

  /* ---------- full comparison ---------- */
  const totals = scenarios.map(total);
  const cheapest = Math.min(...totals);
  const maxTotal = Math.max(...totals);

  return (
    <section className="rounded-2xl border border-borderc bg-card p-5 md:p-6">
      <h2 className="text-xs uppercase tracking-widest text-ink-muted">
        Drive · Rent · Fly · Split — The Money
      </h2>
      <div className="mt-4 space-y-4">
        {scenarios.map((s) => {
          const accent = scenarioAccent(s.slug);
          const t = total(s);
          const delta = t - cheapest;
          const isOpen = expanded === s.slug;
          return (
            <div key={s.id}>
              <button
                onClick={() => setExpanded(isOpen ? null : s.slug)}
                className="block w-full text-left"
                aria-expanded={isOpen}
                title={`${s.name}: ${fmtMoney(t)} — tap for the line-by-line`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm">
                  <span className="flex items-center gap-2">
                    {s.emoji} {s.name}
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-[10px] text-ink-muted">
                      ▾
                    </motion.span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    {delta === 0 ? (
                      <span className="rounded-full bg-mark-green/15 px-2 py-0.5 text-[11px] font-medium text-mark-green">
                        Cheapest ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-mark-pink/10 px-2 py-0.5 text-[11px] font-medium text-mark-pink">
                        +{fmtMoney(delta)} · +{fmtMoney(Math.round(delta / travelerCount))}/person
                      </span>
                    )}
                    <span className="font-medium tabular-nums">{fmtMoney(t)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: accent.mark }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(t / maxTotal) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 60, damping: 20 }}
                  />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 30 }}
                    className="overflow-hidden"
                  >
                    {s.costLines.map((line) => (
                      <li key={line.label} className="mt-2 pl-1 text-sm first:mt-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-ink-secondary">
                            {line.label}
                            {line.estimate && (
                              <span className="ml-1.5 rounded bg-surface px-1 py-px text-[10px] uppercase tracking-wide text-ink-muted">
                                est.
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums">{fmtMoney(line.cents)}</span>
                        </div>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(line.cents / t) * 100}%`,
                              background: accent.mark,
                              backgroundImage: line.estimate
                                ? "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.35) 3px 6px)"
                                : undefined,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Travel-specific costs only — Vegas lodging, food, and spending money are the same in every
        plan. Hatched "est." lines are estimates, not quotes. Tap a plan for the line-by-line.
      </p>
    </section>
  );
}
