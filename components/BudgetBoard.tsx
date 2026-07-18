"use client";

import { ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { addBudgetItem, deleteBudgetItem, updateBudgetItem } from "@/app/actions";
import type { BudgetItem, Traveler } from "@/lib/data";
import type { Estimate } from "@/lib/estimate";
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
  const [actual, setActual] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const cents = parseDollars(amount) ?? 0;
    if (!label.trim()) return;
    startTransition(async () => {
      await addBudgetItem(travelerId, label, category, cents, parseDollars(actual));
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
        placeholder="Projected $"
        inputMode="decimal"
        aria-label="Projected amount"
        className="w-28 rounded border border-borderc bg-surface px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-glow-pink/60"
      />
      <input
        value={actual}
        onChange={(e) => setActual(e.target.value)}
        placeholder="Actual $ (Optional)"
        inputMode="decimal"
        aria-label="Actual amount, only if it is already really spent"
        title="Leave empty unless this money is really spent — actuals normally come from the Spend page or a booking"
        className="w-36 rounded border border-borderc bg-surface px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-glow-pink/60"
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
  estimate,
  accentMark = "var(--mark-green)",
}: {
  travelers: Traveler[];
  items: BudgetItem[];
  estimate?: Estimate;
  accentMark?: string;
}) {
  const [openId, setOpenId] = useState<number | null>(travelers[0]?.id ?? null);
  const [adding, setAdding] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {travelers.map((traveler, idx) => {
        const own = items.filter((i) => i.travelerId === traveler.id);
        const pe = estimate?.perPerson.find((p) => p.traveler.id === traveler.id);
        const yellow = pe?.yellow ?? own.reduce((s, i) => s + i.yellowPadCents, 0);
        const projected = pe?.projected ?? own.reduce((s, i) => s + i.plannedCents, 0);
        const estimated = pe?.estimated ?? projected;
        const spent = pe?.spent ?? own.reduce((s, i) => s + (i.actualCents ?? 0), 0);
        // + = this plan lands under their original yellow-pad share
        const vsYellow = yellow - estimated;
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
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpenId(isOpen ? null : traveler.id)}
              className="flex w-full items-center gap-3 p-4 text-left md:p-5"
              aria-expanded={isOpen}
            >
              <TravelerAvatar
                name={traveler.name}
                color={traveler.color}
                className="h-10 w-10 text-lg"
              />
              <span className="min-w-0 flex-1">
                <span className="font-display text-lg font-semibold">{traveler.name}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {own.length} Lines · Yellow Pad {fmtMoney(yellow)} · Projected {fmtMoney(projected)}
                </span>
              </span>
              <span className="text-right">
                <span
                  className="block font-display text-lg font-semibold tabular-nums"
                  style={{ color: accentMark }}
                >
                  {fmtMoney(estimated)}
                </span>
                <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
                  Est · This Plan
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className="mt-0.5 inline-flex justify-end text-ink-muted"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </span>
            </button>

            {/* estimated-vs-yellow bar */}
            <div className="px-4 pb-4 md:px-5">
              <div className="relative h-2 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: vsYellow >= 0 ? traveler.color : "var(--mark-pink)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, yellow ? (estimated / yellow) * 100 : 0)}%` }}
                  transition={{ type: "spring", stiffness: 70, damping: 20 }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {vsYellow >= 0
                  ? `${fmtMoney(vsYellow)} under their yellow-pad share`
                  : `${fmtMoney(-vsYellow)} over their yellow-pad share`}
                {spent > 0 && ` · ${fmtMoney(spent)} spent`}
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
                                {item.shared && (
                                  <span className="shrink-0 rounded bg-surface px-1 py-px text-[10px] uppercase tracking-wide text-ink-muted">
                                    shared
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
                                    ? "Tap again to delete this line and its logged expenses"
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
                            <div className="mt-2 grid grid-cols-3 gap-2 pl-[18px]">
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                                  Yellow Pad
                                </div>
                                <div className="tabular-nums text-ink-secondary">
                                  {fmtMoney(item.yellowPadCents)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                                  Projected
                                </div>
                                <MoneyCell
                                  cents={item.plannedCents}
                                  className={
                                    item.plannedCents < item.yellowPadCents ? "text-mark-green" : ""
                                  }
                                  onSave={(cents) =>
                                    startTransition(() =>
                                      updateBudgetItem(item.id, { plannedCents: cents ?? 0 }),
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                                  Actual
                                </div>
                                <MoneyCell
                                  cents={item.actualCents}
                                  placeholder="—"
                                  clearable
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
