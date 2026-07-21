"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { BudgetBoard } from "@/components/BudgetBoard";
import type { BudgetItem, Traveler } from "@/lib/data";
import { fmtMoney } from "@/lib/format";
import { TravelerAvatar } from "@/lib/icons";

/**
 * The booked trip's money, as a plain ledger: what it costs, what's been paid,
 * what's left. No scenarios, buckets, or yellow-pad comparison — the decision is
 * made. The yellow pad survives only as a tucked reference at the bottom.
 */
export function FinancesEstimator({
  travelers,
  items,
}: {
  travelers: Traveler[];
  items: BudgetItem[];
}) {
  const [showPad, setShowPad] = useState(false);

  const active = items.filter((i) => i.plannedCents > 0);
  const total = active.reduce((s, i) => s + i.plannedCents, 0);
  const paid = active.reduce((s, i) => s + (i.actualCents ?? 0), 0);
  const remaining = total - paid;
  const pct = total ? Math.round((paid / total) * 100) : 0;

  // OG yellow-pad budget, preserved on every line's yellowPadCents
  const padByTraveler = travelers
    .map((t) => ({
      traveler: t,
      pad: items
        .filter((i) => i.travelerId === t.id)
        .reduce((s, i) => s + i.yellowPadCents, 0),
    }))
    .filter((r) => r.pad > 0)
    .sort((a, b) => b.pad - a.pad);
  const padTotal = padByTraveler.reduce((s, r) => s + r.pad, 0);

  return (
    <div>
      {/* ---------- the ledger headline ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-borderc bg-card p-5 md:p-6"
      >
        <p className="text-xs uppercase tracking-widest text-ink-secondary">The booked trip</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-4xl font-semibold tabular-nums md:text-5xl">
            {fmtMoney(total)}
          </span>
          <span className="text-sm text-ink-secondary md:text-base">all in, all four of us</span>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full bg-mark-green"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-display text-xl font-semibold tabular-nums text-mark-green md:text-2xl">
              {fmtMoney(paid)}
            </div>
            <div className="text-xs uppercase tracking-wider text-ink-muted">Paid</div>
          </div>
          <div>
            <div className="font-display text-xl font-semibold tabular-nums text-mark-amber md:text-2xl">
              {fmtMoney(remaining)}
            </div>
            <div className="text-xs uppercase tracking-wider text-ink-muted">Left to Pay</div>
          </div>
          <div>
            <div className="font-display text-xl font-semibold tabular-nums md:text-2xl">{pct}%</div>
            <div className="text-xs uppercase tracking-wider text-ink-muted">Covered</div>
          </div>
        </div>
      </motion.section>

      {/* ---------- per-person + The Crew ---------- */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold md:text-2xl">Who covers what</h2>
        <p className="mb-4 mt-1 text-sm text-ink-secondary">
          Each person&apos;s own costs, plus the shared ones under{" "}
          <span className="font-medium text-ink">The Crew</span>. Tap a line to fix its cost, or log
          real payments on the{" "}
          <span className="font-medium text-ink">Spend</span> page.
        </p>
        <BudgetBoard travelers={travelers} items={items} />
      </div>

      {/* ---------- the yellow pad, tucked away for reference ---------- */}
      <div className="mt-8">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPad((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-borderc bg-card/60 px-5 py-4 text-left transition-colors hover:bg-card"
          aria-expanded={showPad}
        >
          <span>
            <span className="text-xs uppercase tracking-widest text-ink-muted">For reference</span>
            <span className="mt-0.5 block font-display text-base font-semibold">
              The Yellow Pad — what we first planned, {fmtMoney(padTotal)}
            </span>
          </span>
          <motion.span animate={{ rotate: showPad ? 180 : 0 }} className="text-ink-muted">
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {showPad && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {padByTraveler.map(({ traveler, pad }) => (
                  <div
                    key={traveler.id}
                    className="rounded-2xl border border-borderc bg-card p-4"
                  >
                    <div className="flex items-center gap-2">
                      <TravelerAvatar
                        name={traveler.name}
                        color={traveler.color}
                        className="h-6 w-6 text-xs"
                      />
                      <span className="truncate text-sm font-medium">{traveler.name}</span>
                    </div>
                    <div className="mt-2 font-display text-xl font-semibold tabular-nums">
                      {fmtMoney(pad)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                The original hand-budget before anything was booked — kept just so we remember where
                we started.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
