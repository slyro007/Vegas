"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { addBudgetItem, deleteBudgetItem, updateBudgetItem } from "@/app/actions";
import type { BudgetItem, Traveler } from "@/lib/data";
import { CATEGORY_META, fmtMoney } from "@/lib/format";

function parseDollars(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function MoneyCell({
  cents,
  placeholder,
  onSave,
  clearable = false,
  className = "",
}: {
  cents: number | null;
  placeholder?: string;
  onSave: (cents: number | null) => void;
  clearable?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(cents !== null ? (cents / 100).toString() : "");
          setEditing(true);
        }}
        className={`rounded px-1.5 py-0.5 tabular-nums transition-colors hover:bg-surface ${className}`}
        title="Tap to edit"
      >
        {cents !== null ? fmtMoney(cents) : (placeholder ?? "—")}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    const parsed = parseDollars(draft);
    if (parsed === null && !clearable) return;
    if (parsed === cents) return;
    onSave(parsed);
  };

  return (
    <input
      autoFocus
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-20 rounded border border-borderc-strong bg-surface px-1.5 py-0.5 text-right tabular-nums outline-none focus:border-glow-pink/60"
    />
  );
}

function AddItemForm({ travelerId, onDone }: { travelerId: number; onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("misc");
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const cents = parseDollars(amount) ?? 0;
    if (!label.trim()) return;
    startTransition(async () => {
      await addBudgetItem(travelerId, label, category, cents);
      onDone();
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-borderc-strong p-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New line item…"
        className="min-w-0 flex-1 rounded border border-borderc bg-surface px-2 py-1.5 text-sm outline-none focus:border-glow-pink/60"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded border border-borderc bg-surface px-2 py-1.5 text-sm outline-none"
      >
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <option key={key} value={key}>
            {meta.label}
          </option>
        ))}
      </select>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="$0"
        inputMode="decimal"
        className="w-20 rounded border border-borderc bg-surface px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-glow-pink/60"
      />
      <button
        onClick={submit}
        disabled={pending || !label.trim()}
        className="rounded-full bg-mark-pink px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
      >
        Add
      </button>
    </div>
  );
}

export function BudgetBoard({
  travelers,
  items,
}: {
  travelers: Traveler[];
  items: BudgetItem[];
}) {
  const [openId, setOpenId] = useState<number | null>(travelers[0]?.id ?? null);
  const [adding, setAdding] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {travelers.map((traveler, idx) => {
        const own = items.filter((i) => i.travelerId === traveler.id);
        const planned = own.reduce((s, i) => s + i.plannedCents, 0);
        const effective = own.reduce((s, i) => s + (i.actualCents ?? i.plannedCents), 0);
        const over = planned > traveler.budgetTotalCents;
        const isOpen = openId === traveler.id;

        return (
          <motion.section
            key={traveler.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ type: "spring", stiffness: 150, damping: 22, delay: idx * 0.06 }}
            className="overflow-hidden rounded-2xl border border-borderc bg-card"
          >
            {/* header */}
            <button
              onClick={() => setOpenId(isOpen ? null : traveler.id)}
              className="flex w-full items-center gap-3 p-4 text-left md:p-5"
              aria-expanded={isOpen}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ background: `color-mix(in srgb, ${traveler.color} 25%, transparent)` }}
              >
                {traveler.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-semibold">{traveler.name}</span>
                  {traveler.nonNegotiableCents && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
                      {fmtMoney(traveler.nonNegotiableCents)} non-neg
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {own.length} Line Items · Plan {fmtMoney(planned)} · Budget{" "}
                  {fmtMoney(traveler.budgetTotalCents)}
                </span>
              </span>
              <span className="text-right">
                <span
                  className={`block font-display text-lg font-semibold tabular-nums ${
                    over ? "text-mark-pink" : "text-mark-green"
                  }`}
                >
                  {over
                    ? `+${fmtMoney(planned - traveler.budgetTotalCents)}`
                    : `${fmtMoney(traveler.budgetTotalCents - planned)} Left`}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className="inline-block text-ink-muted"
                >
                  ▾
                </motion.span>
              </span>
            </button>

            {/* plan-vs-budget bar */}
            <div className="px-4 pb-4 md:px-5">
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: over ? "var(--mark-pink)" : traveler.color }}
                  initial={{ width: 0 }}
                  whileInView={{
                    width: `${Math.min(100, (planned / Math.max(planned, traveler.budgetTotalCents)) * 100)}%`,
                  }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 70, damping: 20 }}
                />
              </div>
              {effective !== planned && (
                <p className="mt-1.5 text-xs text-ink-muted">
                  With actuals in, {traveler.name} is really at{" "}
                  <span className="text-mark-green">{fmtMoney(effective)}</span>.
                </p>
              )}
            </div>

            {/* items */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  className="overflow-hidden border-t border-borderc"
                >
                  <div className="p-4 md:p-5">
                    <div className="mb-1 hidden grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] uppercase tracking-widest text-ink-muted md:grid">
                      <span>Item</span>
                      <span className="w-20 text-right">Planned</span>
                      <span className="w-20 text-right">Actual</span>
                      <span className="w-6" />
                    </div>
                    <ul className="divide-y divide-borderc">
                      {own.map((item) => {
                        const meta = CATEGORY_META[item.category] ?? CATEGORY_META.misc;
                        return (
                          <li
                            key={item.id}
                            className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-0.5 py-2.5 text-sm md:grid-cols-[1fr_auto_auto_auto]"
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                  style={{ background: meta.cssVar }}
                                  title={meta.label}
                                />
                                <span className="truncate">{item.label}</span>
                              </span>
                              {item.notes && (
                                <span className="mt-0.5 block pl-[18px] text-xs text-ink-muted">
                                  {item.notes}
                                </span>
                              )}
                            </span>
                            <span className="col-start-2 row-start-1 flex items-center justify-end gap-1 md:col-start-auto md:row-start-auto">
                              <span className="text-[10px] uppercase text-ink-muted md:hidden">
                                plan
                              </span>
                              <MoneyCell
                                cents={item.plannedCents}
                                onSave={(cents) =>
                                  startTransition(() =>
                                    updateBudgetItem(item.id, { plannedCents: cents ?? 0 }),
                                  )
                                }
                              />
                            </span>
                            <span className="col-start-2 row-start-2 flex items-center justify-end gap-1 md:col-start-auto md:row-start-auto">
                              <span className="text-[10px] uppercase text-ink-muted md:hidden">
                                actual
                              </span>
                              <MoneyCell
                                cents={item.actualCents}
                                placeholder="—"
                                clearable
                                onSave={(cents) =>
                                  startTransition(() =>
                                    updateBudgetItem(item.id, { actualCents: cents }),
                                  )
                                }
                                className={
                                  item.actualCents !== null &&
                                  item.actualCents < item.plannedCents
                                    ? "text-mark-green"
                                    : ""
                                }
                              />
                            </span>
                            <button
                              onClick={() => {
                                if (confirmDelete !== item.id) {
                                  setConfirmDelete(item.id);
                                  setTimeout(() => setConfirmDelete(null), 3000);
                                  return;
                                }
                                setConfirmDelete(null);
                                startTransition(() => deleteBudgetItem(item.id));
                              }}
                              className={`col-start-1 row-start-2 justify-self-start pl-[18px] text-xs transition-colors md:col-start-auto md:row-start-auto md:justify-self-auto md:pl-0 ${
                                confirmDelete === item.id
                                  ? "font-semibold text-mark-pink"
                                  : "text-ink-muted hover:text-mark-pink"
                              }`}
                              title={
                                confirmDelete === item.id
                                  ? "Tap again to delete this line and its logged expenses"
                                  : "Delete item"
                              }
                              aria-label={`Delete ${item.label}`}
                            >
                              {confirmDelete === item.id ? "Delete?" : "✕"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {adding === traveler.id ? (
                      <AddItemForm travelerId={traveler.id} onDone={() => setAdding(null)} />
                    ) : (
                      <button
                        onClick={() => setAdding(traveler.id)}
                        className="mt-3 rounded-full border border-dashed border-borderc-strong px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-glow-pink/50 hover:text-ink"
                      >
                        + Add Line Item
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        );
      })}
    </div>
  );
}
