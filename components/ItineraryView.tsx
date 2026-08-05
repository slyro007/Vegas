"use client";

import { CalendarDays, Pencil, ScrollText } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useOptimistic, useState } from "react";
import {
  addItineraryEvent,
  deleteItineraryEvent,
  moveItineraryEvent,
  updateItineraryEvent,
} from "@/app/actions";
import { DayGrid } from "@/components/DayGrid";
import type { ItineraryEditApi, ItineraryPatch } from "@/components/EventCard";
import type { EventDraft } from "@/components/EventEditor";
import { Timeline, type TimelineDay } from "@/components/Timeline";
import type { ItineraryEvent } from "@/lib/data";
import { dayNumberFor, isVisibleEvent, TRIP_DAYS } from "@/lib/itinerary";

const VIEWS = [
  { key: "timeline" as const, label: "Timeline", Icon: ScrollText },
  { key: "grid" as const, label: "Day Grid", Icon: CalendarDays },
];
type ViewKey = (typeof VIEWS)[number]["key"];
const VIEW_STORAGE_KEY = "itinerary-view";

function buildDays(events: ItineraryEvent[], includeEmpty: boolean): TimelineDay[] {
  const filtered = events.filter((e) => isVisibleEvent(e.plan));
  const byDate = new Map<string, ItineraryEvent[]>();
  // edit mode shows every booked day, planned or not — a day with nothing on it
  // would otherwise vanish and take its "+ Add Event" affordance with it
  if (includeEmpty) for (const date of TRIP_DAYS) byDate.set(date, []);
  for (const event of filtered) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEvents]) => ({
      date,
      dayNumber: dayNumberFor(date),
      theme: dayEvents.some((e) => e.theme === "vegas") ? "vegas" : "desert",
      events: dayEvents.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    }));
}

function nextSortOrderIn(events: ItineraryEvent[], date: string): number {
  return (
    events.filter((e) => e.date === date).reduce((top, e) => Math.max(top, e.sortOrder), -1) + 1
  );
}

type OptimisticAction =
  | { kind: "add"; event: ItineraryEvent }
  | { kind: "update"; id: number; patch: ItineraryPatch }
  | { kind: "delete"; id: number }
  | { kind: "move"; id: number; direction: "up" | "down" };

/** Mirrors what the server actions do, applied to the flat rows before
 *  buildDays derives — both views pick the change up instantly. */
function applyOptimistic(events: ItineraryEvent[], action: OptimisticAction): ItineraryEvent[] {
  switch (action.kind) {
    case "add":
      return [
        ...events,
        { ...action.event, sortOrder: nextSortOrderIn(events, action.event.date) },
      ];
    case "update":
      return events.map((e) => {
        if (e.id !== action.id) return e;
        const next = { ...e, ...action.patch };
        if (action.patch.date !== undefined && action.patch.date !== e.date) {
          next.sortOrder = nextSortOrderIn(events, action.patch.date);
        }
        return next;
      });
    case "delete":
      return events.filter((e) => e.id !== action.id);
    case "move": {
      const target = events.find((e) => e.id === action.id);
      if (!target) return events;
      const visible = events
        .filter((e) => e.date === target.date && isVisibleEvent(e.plan))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      const i = visible.findIndex((e) => e.id === action.id);
      const j = action.direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= visible.length) return events;
      [visible[i], visible[j]] = [visible[j], visible[i]];
      const orders = new Map(visible.map((e, k) => [e.id, k]));
      return events.map((e) => (orders.has(e.id) ? { ...e, sortOrder: orders.get(e.id)! } : e));
    }
  }
}

export function ItineraryView({ events }: { events: ItineraryEvent[] }) {
  const [view, setView] = useState<ViewKey>("timeline");
  const [editing, setEditing] = useState(false);
  const [editorFor, setEditorFor] = useState<string | number | null>(null);
  const [optimisticEvents, dispatch] = useOptimistic(events, applyOptimistic);

  // hydrate the saved view choice after mount (SSR-safe)
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "timeline" || saved === "grid") setView(saved);
  }, []);
  const pickView = (v: ViewKey) => {
    setView(v);
    window.localStorage.setItem(VIEW_STORAGE_KEY, v);
    if (v === "grid") {
      // the grid is a reading surface — switching to it puts the pencil down
      setEditing(false);
      setEditorFor(null);
    }
  };
  const toggleEditing = () => {
    setEditorFor(null);
    if (editing) {
      setEditing(false);
      return;
    }
    if (view === "grid") pickView("timeline");
    setEditing(true);
  };

  const editApi: ItineraryEditApi = {
    editorFor,
    openEditor: setEditorFor,
    closeEditor: () => setEditorFor(null),
    add: async (draft: EventDraft) => {
      dispatch({
        kind: "add",
        event: {
          id: -Date.now(), // temp key until revalidation delivers the real row
          date: draft.date,
          sortOrder: 0, // reducer assigns end-of-day
          // clamped exactly like addItineraryEvent so the optimistic card
          // matches the revalidated row byte for byte
          time: draft.time.trim().slice(0, 40) || null,
          title: draft.title.trim().slice(0, 200),
          description: draft.description.trim().slice(0, 400) || null,
          location: draft.location.trim().slice(0, 200) || null,
          theme: draft.theme,
          plan: "all",
        },
      });
      await addItineraryEvent(draft.date, {
        title: draft.title,
        time: draft.time,
        description: draft.description,
        location: draft.location,
        theme: draft.theme,
      });
    },
    update: async (id: number, patch: ItineraryPatch) => {
      dispatch({ kind: "update", id, patch });
      await updateItineraryEvent(id, patch);
    },
    remove: async (id: number) => {
      dispatch({ kind: "delete", id });
      await deleteItineraryEvent(id);
    },
    move: async (id: number, direction: "up" | "down") => {
      dispatch({ kind: "move", id, direction });
      await moveItineraryEvent(id, direction);
    },
  };

  const days = buildDays(optimisticEvents, editing);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-ink-muted">
        Aug 7 – 14, 2026 · Booked
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">The Itinerary</h1>

      {/* view toggle + edit mode */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-borderc bg-card p-1">
          {VIEWS.map((v) => {
            const active = view === v.key;
            return (
              <button
                key={v.key}
                onClick={() => pickView(v.key)}
                className={`relative rounded-full px-3 py-2 text-sm font-medium transition-colors md:px-4 ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
                }`}
                aria-pressed={active}
              >
                {active && (
                  <motion.span
                    layoutId="view-pill"
                    className="absolute inset-0 rounded-full border border-borderc-strong bg-surface"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <v.Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                  {v.label}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={toggleEditing}
          aria-pressed={editing}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
            editing
              ? "border-glow-pink/60 bg-mark-pink/10 text-ink"
              : "border-borderc text-ink-muted hover:text-ink-secondary"
          }`}
        >
          <Pencil className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <motion.div
        key={view}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      >
        <p className="mt-4 max-w-xl text-sm text-ink-secondary md:text-base">
          Flights booked, Friday to Friday: land at 4:32, grab the SUV, horses at Valle Saturday,
          two slow Sedona nights, Moapa Valley on the drive back — then the Vegas week and the
          Luxor before the 5:15 flight home.
        </p>
        <div className="mt-8">
          {view === "grid" ? (
            <DayGrid days={days} accent="fly" />
          ) : (
            <Timeline days={days} accent="fly" edit={editing ? editApi : undefined} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
