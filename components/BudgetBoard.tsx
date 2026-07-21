"use client";

import { ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { addBudgetItem, deleteBudgetItem, updateBudgetItem } from "@/app/actions";
import type { BudgetItem, Traveler } from "@/lib/data";
import { CATEGORY_META, fmtMoney } from "@/lib/format";
import { TravelerAvatar } from "@/lib/icons";

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
      await addBudgetItem(travelerId, label, category, cents, null);
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
        placeholder="Cost $"
        inputMode="decimal"
        aria-label="Cost"
        className="w-28 rounded border border-borderc bg-surface px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-glow-pink/60"
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

/** A column in the ledger: a traveler, or the owner-less shared "Crew" group. */
type Column = {
  key: string;
  name: string;
  color: string;
  travelerId: number | null;
};

/**
 * The booked-trip ledger. One card per person plus "The Crew" (shared costs
 * nobody owns). Each card is cost vs paid — no plans, buckets, or yellow pad;
 * this is what the trip actually costs and what's been paid so far.
 */
export function BudgetBoard({
  travelers,
  items,
}: {
  travelers: Traveler[];
  items: BudgetItem[];
}) {
  const columns: Column[] = [
    ...travelers.map((t) => ({ key: `t${t.id}`, name: t.name, color: t.color, travelerId: t.id })),
    { key: "crew", name: "The Crew", color: "var(--glow-purple)", travelerId: null },
  ];

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set([columns[0]?.key]));
  const toggleOpen = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {columns.map((col, idx) => {
        // active lines only — released $0 lines stay dormant, never shown
        const own = items.filter(
          (i) => i.travelerId === col.travelerId && i.plannedCents > 0,
        );
        const cost = own.reduce((s, i) => s + i.plannedCents, 0);
        const paid = own.reduce((s, i) => s + (i.actualCents ?? 0), 0);
        const remaining = cost - paid;
        const isOpen = openKeys.has(col.key);
        const isCrew = col.travelerId === null;

        return (
          <motion.section
            key={col.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ type: "spring", stiffness: 150, damping: 22, delay: idx * 0.06 }}
            className="overflow-hidden rounded-2xl border border-borderc bg-card"
          >
            {/* header */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleOpen(col.key)}
              className="flex w-full items-center gap-3 p-4 text-left md:p-5"
              aria-expanded={isOpen}
            >
              {isCrew ? (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
                  style={{ background: "color-mix(in srgb, var(--glow-purple) 22%, transparent)", color: "var(--glow-purple)" }}
                  aria-hidden
                >
                  ☺
                </span>
              ) : (
                <TravelerAvatar name={col.name} color={col.color} className="h-10 w-10 text-lg" />
              )}
              <span className="min-w-0 flex-1">
                <span className="font-display text-lg font-semibold">{col.name}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {own.length} {own.length === 1 ? "Line" : "Lines"}
                  {isCrew && " · shared by everyone"}
                  {paid > 0 && ` · ${fmtMoney(paid)} paid`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg font-semibold tabular-nums">
                  {fmtMoney(cost)}
                </span>
                <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
                  {remaining <= 0 && cost > 0 ? "Fully Paid" : "Total Cost"}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className="mt-0.5 inline-flex justify-end text-ink-muted"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </span>
            </button>

            {/* paid-vs-cost bar */}
            <div className="px-4 pb-4 md:px-5">
              <div className="relative h-2 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-mark-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${cost ? Math.min(100, (paid / cost) * 100) : 0}%` }}
                  transition={{ type: "spring", stiffness: 70, damping: 20 }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {paid > 0 ? (
                  <>
                    {fmtMoney(paid)} paid ·{" "}
                    <span className={remaining > 0 ? "text-mark-amber" : "text-mark-green"}>
                      {remaining > 0 ? `${fmtMoney(remaining)} left to pay` : "all settled"}
                    </span>
                  </>
                ) : (
                  <>Nothing paid yet · {fmtMoney(cost)} to go</>
                )}
              </p>
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
                    <ul className="divide-y divide-borderc">
                      {own.map((item) => {
                        const meta = CATEGORY_META[item.category] ?? CATEGORY_META.misc;
                        const linePaid = item.actualCents ?? 0;
                        return (
                          <li key={item.id} className="py-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2 text-sm">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                  style={{ background: meta.cssVar }}
                                  title={meta.label}
                                />
                                <span className="truncate">{item.label}</span>
                                {linePaid > 0 && linePaid >= item.plannedCents && (
                                  <span className="shrink-0 rounded bg-mark-green/15 px-1 py-px text-[10px] uppercase tracking-wide text-mark-green">
                                    paid
                                  </span>
                                )}
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
                                className={`flex shrink-0 items-center text-xs transition-colors ${
                                  confirmDelete === item.id
                                    ? "font-semibold text-mark-pink"
                                    : "text-ink-muted/50 hover:text-mark-pink"
                                }`}
                                title={
                                  confirmDelete === item.id
                                    ? "Tap again to delete this line and its logged payments"
                                    : "Delete item"
                                }
                                aria-label={`Delete ${item.label}`}
                              >
                                {confirmDelete === item.id ? "Delete?" : <X className="h-4 w-4" />}
                              </button>
                            </div>
                            {item.notes && (
                              <p className="mt-0.5 pl-[18px] text-xs text-ink-muted">{item.notes}</p>
                            )}
                            <div className="mt-2 grid grid-cols-2 gap-2 pl-[18px]">
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                                  Cost
                                </div>
                                <MoneyCell
                                  cents={item.plannedCents}
                                  onSave={(cents) =>
                                    startTransition(() =>
                                      updateBudgetItem(item.id, { plannedCents: cents ?? 0 }),
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                                  Paid
                                </div>
                                <MoneyCell
                                  cents={item.actualCents}
                                  placeholder="—"
                                  clearable
                                  className={
                                    linePaid >= item.plannedCents && linePaid > 0
                                      ? "text-mark-green"
                                      : ""
                                  }
                                  onSave={(cents) =>
                                    startTransition(() =>
                                      updateBudgetItem(item.id, { actualCents: cents }),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* shared lines are added via the seed/migration, not per-person here */}
                    {!isCrew && col.travelerId !== null ? (
                      adding === col.key ? (
                        <AddItemForm
                          travelerId={col.travelerId}
                          onDone={() => setAdding(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setAdding(col.key)}
                          className="mt-3 rounded-full border border-dashed border-borderc-strong px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-glow-pink/50 hover:text-ink"
                        >
                          + Add Line Item
                        </button>
                      )
                    ) : null}
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
