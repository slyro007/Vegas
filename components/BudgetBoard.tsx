"use client";

import { ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import {
  addBudgetItem,
  addExpense,
  deleteBudgetItem,
  updateBudgetItem,
  updateTravelerBudget,
} from "@/app/actions";
import type { BudgetItem, Expense, Traveler } from "@/lib/data";
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
        className={`-mx-1 rounded px-2 py-1.5 tabular-nums transition-colors hover:bg-surface ${className}`}
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
      className="-mx-1 w-24 rounded border border-borderc-strong bg-surface px-2 py-1.5 text-right tabular-nums outline-none focus:border-glow-pink/60"
    />
  );
}

/** Rename a line and re-file it under a different category, in place. */
function EditLineForm({
  item,
  onDone,
}: {
  item: BudgetItem;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [category, setCategory] = useState(item.category);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!label.trim()) return;
    startTransition(async () => {
      await updateBudgetItem(item.id, { label, category });
      onDone();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onDone();
        }}
        aria-label="Line name"
        className="min-w-0 flex-1 rounded border border-borderc-strong bg-surface px-2 py-1.5 text-sm outline-none focus:border-glow-pink/60"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Category"
        className="rounded border border-borderc bg-surface px-2 py-1.5 text-sm outline-none"
      >
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <option key={key} value={key}>
            {meta.label}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={pending || !label.trim()}
        className="rounded-full bg-mark-pink px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
      >
        Save
      </button>
      <button onClick={onDone} className="px-1 text-xs text-ink-muted hover:text-ink">
        Cancel
      </button>
    </div>
  );
}

function AddItemForm({ travelerId, onDone }: { travelerId: number | null; onDone: () => void }) {
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
        className="w-full min-w-0 rounded border border-borderc bg-surface px-2 py-1.5 text-sm outline-none focus:border-glow-pink/60 sm:w-auto sm:flex-1"
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

/**
 * Paid is the sum of logged payments, so editing it means logging one — which
 * needs a payer. Two taps from the ledger instead of a trip to the Spend page.
 */
function QuickLogForm({
  itemId,
  travelers,
  defaultTravelerId,
  onDone,
}: {
  itemId: number;
  travelers: Traveler[];
  defaultTravelerId: number | null;
  onDone: () => void;
}) {
  const [travelerId, setTravelerId] = useState<number | null>(defaultTravelerId);
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  const cents = parseDollars(amount);
  const canLog = travelerId !== null && cents !== null && cents > 0 && !pending;

  const submit = () => {
    if (!canLog || travelerId === null || cents === null) return;
    startTransition(async () => {
      await addExpense(travelerId, itemId, cents);
      onDone();
    });
  };

  return (
    <div className="mt-2 rounded-xl border border-dashed border-borderc-strong p-3">
      <p className="text-xs text-ink-secondary">Who paid?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {travelers.map((t) => {
          const on = travelerId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTravelerId(on ? null : t.id)}
              className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-colors"
              style={{
                borderColor: on ? t.color : "var(--border)",
                background: on ? `color-mix(in srgb, ${t.color} 22%, transparent)` : "transparent",
                color: on ? "var(--ink)" : "var(--ink-secondary)",
              }}
            >
              <TravelerAvatar name={t.name} color={t.color} className="h-5 w-5 text-[10px]" />
              {t.name}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-borderc bg-surface px-2 focus-within:border-glow-pink/60">
          <span className="text-ink-muted">$</span>
          <input
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onDone();
            }}
            placeholder="0.00"
            inputMode="decimal"
            aria-label="Amount paid"
            className="w-24 bg-transparent px-1.5 py-1.5 text-right tabular-nums outline-none"
          />
        </div>
        <button
          onClick={submit}
          disabled={!canLog}
          className="rounded-full bg-mark-pink px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-40"
        >
          {pending ? "Logging…" : "Log It"}
        </button>
        <button onClick={onDone} className="px-1 text-xs text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">
        Adds to the Spend feed — delete it there to undo.
      </p>
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
 * nobody owns). Two numbers that mean different things and never mix: what a
 * column's lines *cost* and how much of that is covered, and what a person has
 * *put in* — money they fronted, on their lines or anyone's.
 */
export function BudgetBoard({
  travelers,
  items,
  expenses,
}: {
  travelers: Traveler[];
  items: BudgetItem[];
  expenses: Expense[];
}) {
  // The Crew leads: the rental, bags, Ubers and fuel are what the trip is actually
  // spending on day to day, and burying them last left them looking missing.
  const columns: Column[] = [
    { key: "crew", name: "The Crew", color: "var(--glow-purple)", travelerId: null },
    ...travelers.map((t) => ({ key: `t${t.id}`, name: t.name, color: t.color, travelerId: t.id })),
  ];

  const itemById = new Map(items.map((i) => [i.id, i]));
  // every payment counted twice over: against the line it covers, and for whoever paid
  const paidByLine = new Map<number, number>();
  const paidByTraveler = new Map<number, number>();
  // and, per person, what they actually spent it on
  const linesPaidBy = new Map<number, Map<number, number>>();
  for (const e of expenses) {
    paidByLine.set(e.budgetItemId, (paidByLine.get(e.budgetItemId) ?? 0) + e.amountCents);
    paidByTraveler.set(e.travelerId, (paidByTraveler.get(e.travelerId) ?? 0) + e.amountCents);
    const mine = linesPaidBy.get(e.travelerId) ?? new Map<number, number>();
    mine.set(e.budgetItemId, (mine.get(e.budgetItemId) ?? 0) + e.amountCents);
    linesPaidBy.set(e.travelerId, mine);
  }

  // shared costs and the biggest payer both open on arrival — nothing that has
  // money moving through it should need a tap to be found
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set([columns[0]?.key, columns[1]?.key].filter(Boolean)),
  );
  const toggleOpen = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [logging, setLogging] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {columns.map((col, idx) => {
        // active lines only — released $0 lines stay dormant, never shown
        const own = items.filter(
          (i) => i.travelerId === col.travelerId && i.plannedCents > 0,
        );
        const cost = own.reduce((s, i) => s + i.plannedCents, 0);
        const covered = own.reduce((s, i) => s + (paidByLine.get(i.id) ?? 0), 0);
        const remaining = Math.max(0, cost - covered);
        const overBy = Math.max(0, covered - cost);
        const isOpen = openKeys.has(col.key);
        const isCrew = col.travelerId === null;

        // what this person fronted, anywhere — their lines, someone else's, the Crew's
        const putIn = col.travelerId === null ? 0 : (paidByTraveler.get(col.travelerId) ?? 0);
        const putInLines =
          col.travelerId === null
            ? []
            : [...(linesPaidBy.get(col.travelerId) ?? new Map())]
                .map(([lineId, cents]) => ({ line: itemById.get(lineId), cents }))
                .sort((a, b) => b.cents - a.cents);

        // The Crew has no wallet of its own — its costs are covered by whoever chips in
        const crewChips = isCrew
          ? travelers
              .map((t) => ({
                traveler: t,
                cents: own.reduce((s, i) => {
                  return s + (linesPaidBy.get(t.id)?.get(i.id) ?? 0);
                }, 0),
              }))
              .filter((c) => c.cents > 0)
              .sort((a, b) => b.cents - a.cents)
          : [];

        // a person's budget is a ceiling for their lines; what the lines don't
        // claim is still theirs, just unallocated
        const traveler = col.travelerId === null ? null : travelers.find((t) => t.id === col.travelerId);
        const budget = traveler?.budgetTotalCents ?? 0;
        const unallocated = budget - cost;
        // once someone's told us their budget, that's their headline number — the
        // lines only spend part of it, and the rest is still theirs
        const showBudget = !isCrew && budget > 0;

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
                  {showBudget
                    ? ` · ${fmtMoney(cost)} allocated`
                    : covered > 0 && ` · ${fmtMoney(covered)} covered`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg font-semibold tabular-nums">
                  {fmtMoney(showBudget ? budget : cost)}
                </span>
                <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
                  {showBudget ? "Budget" : remaining === 0 && cost > 0 ? "Fully Paid" : "Total Cost"}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className="mt-0.5 inline-flex justify-end text-ink-muted"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </span>
            </button>

            {/* covered-vs-cost bar */}
            <div className="px-4 pb-4 md:px-5">
              <div className="relative h-2 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-mark-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${cost ? Math.min(100, (covered / cost) * 100) : 0}%` }}
                  transition={{ type: "spring", stiffness: 70, damping: 20 }}
                />
              </div>
              {/* "on these lines" earns its words: a person can have paid plenty
                  elsewhere while their own lines sit untouched */}
              <p className="mt-1.5 text-xs text-ink-muted">
                {covered > 0 ? (
                  <>
                    {fmtMoney(covered)} paid on these lines ·{" "}
                    {overBy > 0 ? (
                      <span className="text-mark-pink">{fmtMoney(overBy)} over</span>
                    ) : (
                      <span className={remaining > 0 ? "text-mark-amber" : "text-mark-green"}>
                        {remaining > 0 ? `${fmtMoney(remaining)} left to pay` : "all settled"}
                      </span>
                    )}
                  </>
                ) : (
                  <>Nothing paid on these lines yet · {fmtMoney(cost)} to go</>
                )}
              </p>

              {/* what this person has fronted, and on what */}
              {putIn > 0 && (
                <div className="mt-3 rounded-xl bg-surface/60 p-3">
                  <p className="text-xs">
                    <span className="font-medium text-ink">{col.name}</span>
                    <span className="text-ink-secondary"> has put in </span>
                    <span className="font-medium tabular-nums text-mark-teal">
                      {fmtMoney(putIn)}
                    </span>
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {putInLines.map(({ line, cents }, i) => (
                      <li
                        key={line?.id ?? `gone-${i}`}
                        className="flex items-baseline justify-between gap-2 text-xs text-ink-secondary"
                      >
                        <span className="min-w-0 truncate">
                          {line?.label ?? "(Deleted Line)"}
                          {line?.travelerId === null && (
                            <span className="ml-1.5 rounded bg-glow-purple/15 px-1 py-px text-[10px] uppercase tracking-wide text-glow-purple">
                              crew
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums">{fmtMoney(cents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* who chipped in on the shared costs */}
              {isCrew && crewChips.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-ink-muted">Chipped in:</span>
                  {crewChips.map(({ traveler: t, cents }) => (
                    <span
                      key={t.id}
                      className="flex items-center gap-1.5 rounded-full border border-borderc py-0.5 pl-0.5 pr-2.5 text-xs"
                    >
                      <TravelerAvatar name={t.name} color={t.color} className="h-5 w-5 text-[10px]" />
                      <span className="tabular-nums">{fmtMoney(cents)}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* their own money: what they set aside, what's gone, what's left */}
              {!isCrew && col.travelerId !== null && (
                <div className="mt-3 border-t border-borderc pt-3">
                  {showBudget ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <MoneyCell
                            cents={budget}
                            clearable
                            className="font-display text-base font-semibold"
                            onSave={(cents) =>
                              startTransition(() =>
                                updateTravelerBudget(col.travelerId as number, cents ?? 0),
                              )
                            }
                          />
                          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                            Budget
                          </div>
                        </div>
                        <div>
                          <div className="py-1.5 font-display text-base font-semibold tabular-nums text-mark-teal">
                            {fmtMoney(putIn)}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                            Spent
                          </div>
                        </div>
                        <div>
                          <div
                            className={`py-1.5 font-display text-base font-semibold tabular-nums ${
                              budget - putIn < 0 ? "text-mark-pink" : "text-mark-green"
                            }`}
                          >
                            {fmtMoney(Math.abs(budget - putIn))}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                            {budget - putIn < 0 ? "Over" : "Left"}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-ink-muted">
                        {unallocated < 0
                          ? `Their lines add up to ${fmtMoney(cost)} — ${fmtMoney(-unallocated)} past the budget.`
                          : `${fmtMoney(cost)} of it planned out on lines · ${fmtMoney(unallocated)} not spoken for yet.`}
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                      <span className="text-ink-muted">Personal budget</span>
                      <MoneyCell
                        cents={null}
                        placeholder="Set budget"
                        clearable
                        className="font-medium text-ink"
                        onSave={(cents) =>
                          startTransition(() =>
                            updateTravelerBudget(col.travelerId as number, cents ?? 0),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
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
                    <ul className="divide-y divide-borderc">
                      {own.map((item) => {
                        const meta = CATEGORY_META[item.category] ?? CATEGORY_META.misc;
                        const linePaid = paidByLine.get(item.id) ?? 0;
                        const lineOver = Math.max(0, linePaid - item.plannedCents);
                        return (
                          <li key={item.id} className="py-3">
                            {editing === item.id ? (
                              <EditLineForm item={item} onDone={() => setEditing(null)} />
                            ) : (
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => setEditing(item.id)}
                                className="flex min-w-0 items-center gap-2 rounded text-left text-sm transition-colors hover:text-glow-pink"
                                title="Tap to rename or re-categorize"
                              >
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
                              </button>
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
                                className={`-my-1.5 -mr-1.5 flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs transition-colors ${
                                  confirmDelete === item.id
                                    ? "font-semibold text-mark-pink"
                                    : "text-ink-muted/70 hover:text-mark-pink"
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
                            )}
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
                                <button
                                  onClick={() =>
                                    setLogging(logging === item.id ? null : item.id)
                                  }
                                  className={`-mx-1 rounded px-2 py-1.5 tabular-nums transition-colors hover:bg-surface ${
                                    linePaid >= item.plannedCents && linePaid > 0
                                      ? "text-mark-green"
                                      : ""
                                  }`}
                                  title="Tap to log a payment"
                                >
                                  {linePaid > 0 ? fmtMoney(linePaid) : "—"}
                                  {lineOver > 0 && (
                                    <span className="ml-1.5 rounded bg-mark-pink/15 px-1 py-px text-[10px] uppercase tracking-wide text-mark-pink">
                                      +{fmtMoney(lineOver)} over
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                            {logging === item.id && (
                              <div className="pl-[18px]">
                                <QuickLogForm
                                  itemId={item.id}
                                  travelers={travelers}
                                  defaultTravelerId={col.travelerId}
                                  onDone={() => setLogging(null)}
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {adding === col.key ? (
                      <AddItemForm travelerId={col.travelerId} onDone={() => setAdding(null)} />
                    ) : (
                      <button
                        onClick={() => setAdding(col.key)}
                        className="mt-3 rounded-full border border-dashed border-borderc-strong px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-glow-pink/50 hover:text-ink"
                      >
                        {isCrew ? "+ Add Shared Line Item" : "+ Add Line Item"}
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
