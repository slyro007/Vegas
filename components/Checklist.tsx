"use client";

import { ListPlus, Pencil, Plus, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addChecklist,
  addChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  toggleChecklistItem,
  updateChecklist,
  updateChecklistItem,
} from "@/app/actions";
import {
  CHECKLIST_ICONS,
  checklistIcon,
  DEFAULT_CHECKLIST_ICON,
  iconTitle,
} from "@/lib/checklistIcons";
import type { ChecklistItem, ChecklistMeta } from "@/lib/data";

const FIELD =
  "rounded-lg border border-borderc bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-glow-pink/60";

type ItemDraft = { label: string; assignee: string; note: string };

/** A row opened for editing: its wording, who's on it, and the note underneath. */
function ItemForm({
  item,
  pending,
  onSave,
  onCancel,
}: {
  item: ChecklistItem;
  pending: boolean;
  onSave: (draft: ItemDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ItemDraft>({
    label: item.label,
    assignee: item.assignee ?? "",
    note: item.note ?? "",
  });
  const set = (patch: Partial<ItemDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const canSave = !!draft.label.trim();

  const submit = () => {
    if (canSave && !pending) onSave(draft);
  };
  const onLineKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // saving closes the row and hands focus to its pencil. Without this the
      // keydown's default action then lands on that button and reopens the editor.
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="w-full space-y-2 rounded-xl border border-dashed border-borderc-strong p-3">
      <input
        autoFocus
        value={draft.label}
        onChange={(e) => set({ label: e.target.value })}
        onKeyDown={onLineKey}
        maxLength={200}
        placeholder="What needs doing…"
        aria-label="Item"
        className={`w-full ${FIELD}`}
      />
      <div className="flex gap-2">
        <div className="flex w-32 shrink-0 items-center gap-1.5 rounded-lg border border-borderc bg-surface px-2.5 transition-colors focus-within:border-glow-pink/60">
          <User className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
          <input
            value={draft.assignee}
            onChange={(e) => set({ assignee: e.target.value })}
            onKeyDown={onLineKey}
            maxLength={60}
            placeholder="Who"
            aria-label="Assigned to"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
        </div>
        <input
          value={draft.note}
          onChange={(e) => set({ note: e.target.value })}
          onKeyDown={onLineKey}
          maxLength={200}
          placeholder="Note (optional)"
          aria-label="Note"
          className={`min-w-0 flex-1 ${FIELD}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1" />
        <button
          onClick={onCancel}
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending || !canSave}
          className="rounded-full bg-mark-pink px-3.5 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function CheckRow({ item }: { item: ChecklistItem }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(item.done);
  const [editing, setEditing] = useState(false);

  // hand focus back to the pencil when the editor closes (Escape/Cancel/Save)
  const pencilRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) pencilRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const save = (draft: ItemDraft) => {
    const patch: { label?: string; assignee?: string | null; note?: string | null } = {};
    // clamp exactly like the server action so the row never shows text it truncates
    const label = draft.label.trim().slice(0, 200);
    if (label && label !== item.label) patch.label = label;
    const assignee = draft.assignee.trim().slice(0, 60) || null;
    if (assignee !== item.assignee) patch.assignee = assignee;
    const note = draft.note.trim().slice(0, 200) || null;
    if (note !== item.note) patch.note = note;
    setEditing(false);
    if (Object.keys(patch).length === 0) return;
    startTransition(() => updateChecklistItem(item.id, patch));
  };

  if (editing) {
    return (
      <motion.li layout className="py-2.5">
        <ItemForm
          item={item}
          pending={pending}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      </motion.li>
    );
  }

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
        ref={pencilRef}
        onClick={() => setEditing(true)}
        className="mt-0.5 flex text-ink-muted/40 transition-colors group-hover:text-ink-muted hover:!text-ink"
        title="Edit"
        aria-label={`Edit ${item.label}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
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

export type ListDraft = { label: string; blurb: string; icon: string };

/** The one form for a list — naming a new one and editing an existing one both
 *  land here. Enter commits from the single-line fields, Escape cancels. */
function ListForm({
  initial,
  saveLabel,
  pending = false,
  onSave,
  onCancel,
}: {
  initial?: ChecklistMeta;
  saveLabel: string;
  pending?: boolean;
  onSave: (draft: ListDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ListDraft>({
    label: initial?.label ?? "",
    blurb: initial?.blurb ?? "",
    icon: initial?.icon ?? DEFAULT_CHECKLIST_ICON,
  });
  const set = (patch: Partial<ListDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const canSave = !!draft.label.trim();

  const submit = () => {
    if (canSave && !pending) onSave(draft);
  };
  const onLineKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-borderc-strong p-3">
      <input
        autoFocus
        value={draft.label}
        onChange={(e) => set({ label: e.target.value })}
        onKeyDown={onLineKey}
        placeholder="List name…"
        aria-label="List name"
        className={`w-full ${FIELD}`}
      />
      <input
        value={draft.blurb}
        onChange={(e) => set({ blurb: e.target.value })}
        onKeyDown={onLineKey}
        placeholder="What it's for (optional)"
        aria-label="List description"
        className={`w-full ${FIELD}`}
      />
      <div
        role="radiogroup"
        aria-label="List icon"
        className="grid grid-cols-6 gap-1 sm:grid-cols-8"
      >
        {Object.entries(CHECKLIST_ICONS).map(([name, Icon]) => (
          <button
            key={name}
            role="radio"
            aria-checked={draft.icon === name}
            aria-label={iconTitle(name)}
            title={iconTitle(name)}
            onClick={() => set({ icon: name })}
            className={`flex items-center justify-center rounded-lg border py-1.5 transition-colors ${
              draft.icon === name
                ? "border-glow-pink/60 bg-mark-pink/20 text-glow-pink"
                : "border-borderc text-ink-muted hover:text-ink-secondary"
            }`}
          >
            <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="flex-1" />
        <button
          onClick={onCancel}
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending || !canSave}
          className="rounded-full bg-mark-pink px-3.5 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

export function Checklist({ lists, items }: { lists: ChecklistMeta[]; items: ChecklistItem[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // deleting the open list drops the selection back to the first tab — no effect needed
  const active = lists.find((l) => l.key === activeKey) ?? lists[0] ?? null;
  const activeItems = active ? items.filter((i) => i.list === active.key) : [];
  const doneCount = activeItems.filter((i) => i.done).length;

  const openList = (key: string) => {
    setActiveKey(key);
    setMode("idle");
    setConfirmDelete(false);
  };

  const submitItem = () => {
    const label = draft.trim();
    if (!label || !active) return;
    setDraft("");
    startTransition(() => addChecklistItem(active.key, label));
  };

  const createList = (d: ListDraft) => {
    setMode("idle");
    startTransition(async () => {
      const key = await addChecklist(d.label, d.icon, d.blurb);
      if (key) setActiveKey(key);
    });
  };

  const saveList = (d: ListDraft) => {
    if (!active) return;
    setMode("idle");
    const patch: { label?: string; blurb?: string | null; icon?: string } = {};
    // clamp exactly like the server action so nothing renders text it will truncate
    const label = d.label.trim().slice(0, 60);
    if (label && label !== active.label) patch.label = label;
    const blurb = d.blurb.trim().slice(0, 200) || null;
    if (blurb !== active.blurb) patch.blurb = blurb;
    if (d.icon !== active.icon) patch.icon = d.icon;
    if (Object.keys(patch).length === 0) return;
    startTransition(() => updateChecklist(active.id, patch));
  };

  const removeList = () => {
    if (!active) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    startTransition(() => deleteChecklist(active.id));
  };

  return (
    <div>
      {/* tabs */}
      <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
        {lists.map((list) => {
          const listItems = items.filter((i) => i.list === list.key);
          const done = listItems.filter((i) => i.done).length;
          const isActive = active?.key === list.key;
          const Icon = checklistIcon(list.icon);
          return (
            <button
              key={list.key}
              onClick={() => openList(list.key)}
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
                <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                {list.label}
                <span className="ml-0.5 text-xs text-ink-muted">
                  {done}/{listItems.length}
                </span>
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setMode(mode === "new" ? "idle" : "new")}
          aria-expanded={mode === "new"}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border border-dashed px-4 py-2 text-sm transition-colors ${
            mode === "new"
              ? "border-glow-pink/60 text-glow-pink"
              : "border-borderc-strong text-ink-muted hover:text-ink-secondary"
          }`}
        >
          <ListPlus className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          New list
        </button>
      </div>

      <AnimatePresence initial={false}>
        {mode === "new" && (
          <motion.div
            key="new-list"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="mt-4"
          >
            <ListForm
              saveLabel="Create list"
              pending={pending}
              onSave={createList}
              onCancel={() => setMode("idle")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {active ? (
        <div className="mt-4 rounded-2xl border border-borderc bg-card p-5">
          {mode === "edit" ? (
            <ListForm
              key={active.key}
              initial={active}
              saveLabel="Save"
              pending={pending}
              onSave={saveList}
              onCancel={() => setMode("idle")}
            />
          ) : (
            <div className="flex items-start gap-1">
              {active.blurb ? (
                <p className="min-w-0 flex-1 text-sm text-ink-secondary">{active.blurb}</p>
              ) : (
                <span className="flex-1" />
              )}
              <button
                onClick={() => {
                  setMode("edit");
                  setConfirmDelete(false);
                }}
                className="-mt-1 rounded p-1.5 text-ink-muted transition-colors hover:text-ink"
                aria-label={`Rename ${active.label}`}
                title="Edit this list"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={removeList}
                aria-live="polite"
                className={`-mt-1 flex items-center rounded p-1.5 text-xs transition-colors ${
                  confirmDelete
                    ? "font-semibold text-mark-pink"
                    : "text-ink-muted/50 hover:text-mark-pink"
                }`}
                aria-label={`Delete the ${active.label} list`}
                title={
                  confirmDelete
                    ? "Tap again — this deletes the list and everything on it"
                    : "Delete this list"
                }
              >
                {confirmDelete ? "Delete list?" : <X className="h-4 w-4" />}
              </button>
            </div>
          )}

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
              onKeyDown={(e) => e.key === "Enter" && submitItem()}
              placeholder={`Add to ${active.label}…`}
              aria-label={`Add to ${active.label}`}
              className="min-w-0 flex-1 rounded-xl border border-borderc bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-glow-pink/60"
            />
            <button
              onClick={submitItem}
              disabled={pending || !draft.trim()}
              className="rounded-xl bg-mark-pink px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        mode !== "new" && (
          <div className="mt-4 rounded-2xl border border-dashed border-borderc-strong p-8 text-center">
            <p className="text-sm text-ink-secondary">No lists yet.</p>
            <button
              onClick={() => setMode("new")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mark-pink px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Start one
            </button>
          </div>
        )
      )}
    </div>
  );
}
