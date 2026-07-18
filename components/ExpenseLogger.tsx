"use client";

import { Receipt, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { addExpense, deleteExpense } from "@/app/actions";
import type { BudgetItem, Expense, Traveler } from "@/lib/data";
import { CATEGORY_META, fmtDay, fmtMoney } from "@/lib/format";
import { TravelerAvatar } from "@/lib/icons";

function parseDollars(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function ExpenseLogger({
  travelers,
  budgetItems,
  expenses,
  defaultTravelerId = null,
}: {
  travelers: Traveler[];
  budgetItems: BudgetItem[];
  expenses: Expense[];
  defaultTravelerId?: number | null;
}) {
  const [travelerId, setTravelerId] = useState<number | null>(defaultTravelerId);
  const [budgetItemId, setBudgetItemId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const travelerById = new Map(travelers.map((t) => [t.id, t]));
  const itemById = new Map(budgetItems.map((i) => [i.id, i]));
  const myLines = travelerId ? budgetItems.filter((i) => i.travelerId === travelerId) : [];

  const loggedByItem = new Map<number, number>();
  const loggedByTraveler = new Map<number, number>();
  for (const e of expenses) {
    loggedByItem.set(e.budgetItemId, (loggedByItem.get(e.budgetItemId) ?? 0) + e.amountCents);
    loggedByTraveler.set(e.travelerId, (loggedByTraveler.get(e.travelerId) ?? 0) + e.amountCents);
  }

  const byDay = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = byDay.get(e.spentOn) ?? [];
    list.push(e);
    byDay.set(e.spentOn, list);
  }

  const amountCents = parseDollars(amount);
  const canLog = travelerId !== null && budgetItemId !== null && amountCents !== null && !pending;

  const submit = () => {
    if (!canLog || travelerId === null || budgetItemId === null || amountCents === null) return;
    setAmount("");
    setNote("");
    setBudgetItemId(null);
    startTransition(() => addExpense(travelerId, budgetItemId, amountCents, note));
  };

  return (
    <div className="space-y-8">
      {/* ---------- logger ---------- */}
      <section className="rounded-2xl border border-borderc bg-card p-5">
        <h2 className="text-xs uppercase tracking-widest text-ink-muted">Log an Expense</h2>

        <p className="mt-3 text-sm text-ink-secondary">Who paid?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {travelers.map((t) => {
            const active = travelerId === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setTravelerId(active ? null : t.id);
                  setBudgetItemId(null);
                }}
                className="flex items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition-colors"
                style={{
                  borderColor: active ? t.color : "var(--border)",
                  background: active
                    ? `color-mix(in srgb, ${t.color} 22%, transparent)`
                    : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-secondary)",
                }}
              >
                <TravelerAvatar name={t.name} color={t.color} className="h-6 w-6 text-xs" />
                {t.name}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {travelerId !== null && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
              className="overflow-hidden"
            >
              <p className="mt-4 text-sm text-ink-secondary">Which budget line?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {myLines.map((line) => {
                  const meta = CATEGORY_META[line.category] ?? CATEGORY_META.misc;
                  const active = budgetItemId === line.id;
                  const logged = loggedByItem.get(line.id) ?? 0;
                  return (
                    <button
                      key={line.id}
                      onClick={() => setBudgetItemId(active ? null : line.id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-glow-pink/60 bg-mark-pink/10"
                          : "border-borderc hover:border-borderc-strong"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: meta.cssVar }}
                        />
                        {line.label}
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        Projected {fmtMoney(line.plannedCents)}
                        {logged > 0 && (
                          <span className="text-mark-teal"> · Logged {fmtMoney(logged)}</span>
                        )}
                        <span
                          className={
                            line.plannedCents - logged < 0 ? "text-mark-pink" : "text-mark-green"
                          }
                        >
                          {" "}
                          · {line.plannedCents - logged < 0 ? "+" : ""}
                          {fmtMoney(Math.abs(line.plannedCents - logged))}{" "}
                          {line.plannedCents - logged < 0 ? "Over" : "Left"}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {myLines.length === 0 && (
                  <p className="text-sm text-ink-muted">
                    No budget lines yet — add one on the Finances page first.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-borderc bg-surface px-3 focus-within:border-glow-pink/60">
                  <span className="text-lg text-ink-muted">$</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-28 bg-transparent px-2 py-2.5 font-display text-xl outline-none"
                    aria-label="Amount"
                  />
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Note (optional) — e.g. Booked the hotels"
                  className="min-w-0 flex-1 rounded-xl border border-borderc bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-glow-pink/60"
                />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={submit}
                  disabled={!canLog}
                  className="rounded-xl bg-mark-pink px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                >
                  {pending ? "Logging…" : "Log It"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ---------- per-person totals ---------- */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {travelers.map((t) => {
          const logged = loggedByTraveler.get(t.id) ?? 0;
          const plannedSum = budgetItems
            .filter((i) => i.travelerId === t.id)
            .reduce((s, i) => s + i.plannedCents, 0);
          const budgetLeft = t.budgetTotalCents - logged;
          const planLeft = plannedSum - logged;
          return (
            <div key={t.id} className="rounded-2xl border border-borderc bg-card p-4">
              <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
                <TravelerAvatar name={t.name} color={t.color} className="h-5 w-5 text-[11px]" />
                {t.name}
              </div>
              <div className="mt-1 font-display text-xl font-semibold tabular-nums">
                {fmtMoney(logged)}
              </div>
              <div className="text-xs uppercase tracking-wider text-ink-muted">Logged</div>
              <div className="mt-2 space-y-0.5 text-xs">
                <div className={budgetLeft < 0 ? "text-mark-pink" : "text-ink-secondary"}>
                  Budget: <span className="tabular-nums">{fmtMoney(Math.abs(budgetLeft))}</span>{" "}
                  {budgetLeft < 0 ? "Over" : "Left"}
                </div>
                <div className={planLeft < 0 ? "text-mark-pink" : "text-ink-secondary"}>
                  Projected: <span className="tabular-nums">{fmtMoney(Math.abs(planLeft))}</span>{" "}
                  {planLeft < 0 ? "Over" : "Left"}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ---------- feed ---------- */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-ink-muted">The Feed</h2>
        {byDay.size === 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing logged yet — the first expense starts the story. 🎬
          </p>
        )}
        <div className="mt-3 space-y-5">
          {[...byDay.entries()].map(([day, dayExpenses]) => {
            const dayTotal = dayExpenses.reduce((s, e) => s + e.amountCents, 0);
            return (
              <div key={day}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{fmtDay(day)}</span>
                  <span className="tabular-nums text-ink-secondary">{fmtMoney(dayTotal)}</span>
                </div>
                <ul className="mt-2 divide-y divide-borderc rounded-2xl border border-borderc bg-card px-4">
                  <AnimatePresence initial={false}>
                    {dayExpenses.map((e) => {
                      const traveler = travelerById.get(e.travelerId);
                      const line = itemById.get(e.budgetItemId);
                      return (
                        <motion.li
                          key={e.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                          className="group flex items-center gap-3 py-3"
                        >
                          {traveler ? (
                            <TravelerAvatar
                              name={traveler.name}
                              color={traveler.color}
                              className="h-8 w-8 text-sm"
                            />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted">
                              <Receipt className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {line?.label ?? "(Deleted Line)"}
                              {e.note && (
                                <span className="text-ink-muted"> — {e.note}</span>
                              )}
                            </span>
                            <span className="text-xs text-ink-muted">
                              {traveler?.name}
                            </span>
                          </span>
                          <span className="font-medium tabular-nums">
                            {fmtMoney(e.amountCents)}
                          </span>
                          <button
                            onClick={() => startTransition(() => deleteExpense(e.id))}
                            className="flex text-ink-muted/40 transition-colors group-hover:text-ink-muted hover:!text-mark-pink"
                            title="Delete entry"
                            aria-label="Delete expense entry"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
