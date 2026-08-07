"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import type { ItineraryEvent } from "@/lib/data";
import { fmtDay } from "@/lib/format";
import { TRIP_DAYS } from "@/lib/itinerary";

export type EventDraft = {
  date: string;
  time: string;
  title: string;
  description: string;
  location: string;
  theme: string;
};

const THEMES = [
  { key: "desert", label: "Desert", active: "border-glow-sunset/60 bg-mark-orange/20 text-glow-sunset" },
  { key: "vegas", label: "Vegas", active: "border-glow-pink/60 bg-mark-pink/20 text-glow-pink" },
];

const FIELD =
  "rounded-lg border border-borderc bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-glow-pink/60";

/** The one form for itinerary events — editing an existing card and adding a
 *  new one both land here. Enter commits from single-line fields, Escape cancels. */
export function EventEditor({
  initial,
  date,
  defaultTheme = "desert",
  saveLabel,
  pending = false,
  onSave,
  onCancel,
}: {
  initial?: ItineraryEvent;
  date: string;
  defaultTheme?: string;
  saveLabel: string;
  pending?: boolean;
  onSave: (draft: EventDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>({
    date: initial?.date ?? date,
    time: initial?.time ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    theme: initial?.theme ?? defaultTheme,
  });
  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const canSave = !!draft.title.trim();

  // a stray out-of-range date (old data) still needs to appear in the select
  const dayOptions =
    initial && !TRIP_DAYS.includes(initial.date) ? [initial.date, ...TRIP_DAYS] : TRIP_DAYS;

  const submit = () => {
    if (canSave && !pending) onSave(draft);
  };
  const onLineKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // saving closes the editor and hands focus to its pencil. Without this the
      // keydown's default action then lands on that button and reopens it.
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-borderc-strong p-3">
      <div className="flex gap-2">
        <input
          value={draft.time}
          onChange={(e) => set({ time: e.target.value })}
          onKeyDown={onLineKey}
          placeholder="4:32 PM"
          aria-label="Time"
          className={`w-28 ${FIELD}`}
        />
        <select
          value={draft.date}
          onChange={(e) => set({ date: e.target.value })}
          aria-label="Day"
          className={`min-w-0 flex-1 ${FIELD}`}
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {fmtDay(d)}
            </option>
          ))}
        </select>
      </div>
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => set({ title: e.target.value })}
        onKeyDown={onLineKey}
        placeholder="Event title…"
        aria-label="Title"
        className={`w-full ${FIELD}`}
      />
      <textarea
        value={draft.description}
        onChange={(e) => set({ description: e.target.value })}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        rows={3}
        placeholder="Details…"
        aria-label="Description"
        className={`w-full resize-none ${FIELD}`}
      />
      <div className="flex items-center gap-1.5 rounded-lg border border-borderc bg-surface px-2.5 transition-colors focus-within:border-glow-pink/60">
        <MapPin className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <input
          value={draft.location}
          onChange={(e) => set({ location: e.target.value })}
          onKeyDown={onLineKey}
          placeholder="Location"
          aria-label="Location"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {THEMES.map((t) => (
          <button
            key={t.key}
            onClick={() => set({ theme: t.key })}
            aria-pressed={draft.theme === t.key}
            className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-wider transition-colors ${
              draft.theme === t.key
                ? t.active
                : "border-borderc text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
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
