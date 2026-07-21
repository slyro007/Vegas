"use client";

import { CalendarDays, ScrollText } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { DayGrid } from "@/components/DayGrid";
import { Timeline, type TimelineDay } from "@/components/Timeline";
import type { ItineraryEvent } from "@/lib/data";

const VIEWS = [
  { key: "timeline" as const, label: "Timeline", Icon: ScrollText },
  { key: "grid" as const, label: "Day Grid", Icon: CalendarDays },
];
type ViewKey = (typeof VIEWS)[number]["key"];
const VIEW_STORAGE_KEY = "itinerary-view";

// The trip is booked — one itinerary. Drive-era events stay in the DB as
// history, but only "all" + "fly" events render.
const PLAN_KEY = "fly";

function buildDays(events: ItineraryEvent[]): TimelineDay[] {
  const filtered = events.filter(
    (e) => e.plan === "all" || e.plan.split(" ").includes(PLAN_KEY),
  );
  const byDate = new Map<string, ItineraryEvent[]>();
  for (const event of filtered) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEvents], i) => ({
      date,
      dayNumber: i + 1,
      theme: dayEvents.some((e) => e.theme === "vegas") ? "vegas" : "desert",
      events: dayEvents.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

export function ItineraryView({ events }: { events: ItineraryEvent[] }) {
  const [view, setView] = useState<ViewKey>("timeline");

  // hydrate the saved view choice after mount (SSR-safe)
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "timeline" || saved === "grid") setView(saved);
  }, []);
  const pickView = (v: ViewKey) => {
    setView(v);
    window.localStorage.setItem(VIEW_STORAGE_KEY, v);
  };

  const days = buildDays(events);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-ink-muted">
        Aug 7 – 14, 2026 · Booked
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">The Itinerary</h1>

      {/* view toggle */}
      <div className="mt-5 inline-flex rounded-full border border-borderc bg-card p-1">
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
            <Timeline days={days} accent="fly" />
          )}
        </div>
      </motion.div>
    </div>
  );
}
