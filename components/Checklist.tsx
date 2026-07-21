"use client";

import {
  Backpack,
  ClipboardList,
  type LucideIcon,
  Mountain,
  Snowflake,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/app/actions";
import type { ChecklistItem } from "@/lib/data";

const LISTS: { key: string; label: string; Icon: LucideIcon; blurb: string }[] = [
  {
    key: "pre-trip",
    label: "Pre-trip",
    Icon: ClipboardList,
    blurb: "Everything that has to happen before Aug 7.",
  },
  {
    key: "groceries",
    label: "Grocery run",
    Icon: Snowflake,
    blurb: "Amma-safe groceries, first stop once we have the SUV.",
  },
  {
    key: "sedona-restock",
    label: "Sedona restock",
    Icon: Mountain,
    blurb: "Before the Monday drive back — groceries and a full tank.",
  },
  {
    key: "packing",
    label: "Packing",
    Icon: Backpack,
    blurb: "Swimsuits for Slide Rock, jeans for the horses.",
  },
];

function CheckRow({ item }: { item: ChecklistItem }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(item.done);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="group flex items-start gap-3 py-2.5"
    >
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setDone(!done);
            await toggleChecklistItem(item.id, !done);
          })
        }
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          done
            ? "border-mark-green bg-mark-green/20"
            : "border-borderc-strong hover:border-glow-pink/60"
        }`}
        aria-label={done ? `Mark "${item.label}" not done` : `Mark "${item.label}" done`}
      >
        {done && (
          <motion.svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <motion.path
              d="M3 8.5 L6.5 12 L13 4.5"
              fill="none"
              stroke="var(--mark-green)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <span
          className={`text-sm transition-colors ${
            done ? "text-ink-muted line-through decoration-mark-green/60" : ""
          }`}
        >
          {item.label}
        </span>
        {(item.assignee || item.note) && (
          <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-muted">
            {item.assignee && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" aria-hidden />
                {item.assignee}
              </span>
            )}
            {item.note && <span>{item.note}</span>}
          </span>
        )}
      </div>
      <button
        onClick={() => startTransition(() => deleteChecklistItem(item.id))}
        className="mt-0.5 flex text-ink-muted/40 transition-colors group-hover:text-ink-muted hover:!text-mark-pink"
        title="Delete"
        aria-label={`Delete ${item.label}`}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.li>
  );
}

export function Checklist({ items }: { items: ChecklistItem[] }) {
  const [active, setActive] = useState(LISTS[0].key);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const activeMeta = LISTS.find((l) => l.key === active)!;
  const activeItems = items.filter((i) => i.list === active);
  const doneCount = activeItems.filter((i) => i.done).length;

  const submit = () => {
    const label = draft.trim();
    if (!label) return;
    setDraft("");
    startTransition(() => addChecklistItem(active, label));
  };

  return (
    <div>
      {/* tabs */}
      <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
        {LISTS.map((list) => {
          const count = items.filter((i) => i.list === list.key);
          const done = count.filter((i) => i.done).length;
          const isActive = active === list.key;
          return (
            <button
              key={list.key}
              onClick={() => setActive(list.key)}
              className={`relative shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-borderc-strong text-ink"
                  : "border-borderc text-ink-muted hover:text-ink-secondary"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="list-tab"
                  className="absolute inset-0 rounded-full bg-card"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <list.Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                {list.label}
                <span className="ml-0.5 text-xs text-ink-muted">
                  {done}/{count.length}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-borderc bg-card p-5">
        <p className="text-sm text-ink-secondary">{activeMeta.blurb}</p>

        {/* progress */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full rounded-full bg-mark-green"
            animate={{
              width: `${activeItems.length ? (doneCount / activeItems.length) * 100 : 0}%`,
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        <ul className="mt-3 divide-y divide-borderc">
          <AnimatePresence initial={false}>
            {activeItems.map((item) => (
              <CheckRow key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </ul>

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={`Add to ${activeMeta.label}…`}
            className="min-w-0 flex-1 rounded-xl border border-borderc bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-glow-pink/60"
          />
          <button
            onClick={submit}
            disabled={pending || !draft.trim()}
            className="rounded-xl bg-mark-pink px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
