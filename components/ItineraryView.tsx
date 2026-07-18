"use client";

import { CalendarDays, ScrollText } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { DayGrid } from "@/components/DayGrid";
import { Timeline, type TimelineAccent, type TimelineDay } from "@/components/Timeline";
import type { ItineraryEvent } from "@/lib/data";
import { PlanIcon } from "@/lib/icons";

const PLANS = [
  {
    key: "drive" as const,
    label: "Drive Plan",
    color: "var(--mark-orange)",
    blurb:
      "Ten days: two big hauls, horses on our land in Valle, five nights of Vegas, and a red-rock finale in Sedona. The rail turns neon when the trip does.",
    dates: "Aug 7 – 16, 2026",
  },
  {
    key: "fly" as const,
    label: "Fly Plan",
    color: "var(--mark-teal)",
    blurb:
      "All four fly in Friday afternoon and knock out the land + Sedona the first weekend — then a full, unhurried Vegas week before the Saturday evening flight home.",
    dates: "Aug 7 – 15, 2026",
  },
  {
    key: "hybrid" as const,
    label: "Split Plan",
    color: "var(--mark-purple)",
    blurb:
      "Shy, BeX & Pithya road-trip it while Amma flies in Sunday afternoon and home Friday evening — zero 15-hour hauls for her, full adventure for the trio.",
    dates: "Aug 7 – 16, 2026",
  },
];

const VIEWS = [
  { key: "timeline" as const, label: "Timeline", Icon: ScrollText },
  { key: "grid" as const, label: "Day Grid", Icon: CalendarDays },
];
type ViewKey = (typeof VIEWS)[number]["key"];
const VIEW_STORAGE_KEY = "itinerary-view";

function buildDays(events: ItineraryEvent[], plan: TimelineAccent): TimelineDay[] {
  const filtered = events.filter(
    (e) => e.plan === "all" || e.plan.split(" ").includes(plan),
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

export function ItineraryView({
  events,
  defaultPlan = "drive",
}: {
  events: ItineraryEvent[];
  defaultPlan?: TimelineAccent;
}) {
  const [plan, setPlan] = useState<TimelineAccent>(defaultPlan);
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

  const meta = PLANS.find((p) => p.key === plan)!;
  const days = buildDays(events, plan);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-ink-muted">{meta.dates}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">The Itinerary</h1>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {/* plan toggle */}
        <div className="inline-flex rounded-full border border-borderc bg-card p-1">
          {PLANS.map((p) => {
            const active = plan === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPlan(p.key)}
                className={`relative rounded-full px-3 py-2 text-sm font-medium transition-colors md:px-4 ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
                }`}
                aria-pressed={active}
              >
                {active && (
                  <motion.span
                    layoutId="plan-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${p.color} 30%, transparent)`,
                      border: `1px solid ${p.color}`,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <PlanIcon plan={p.key} className="h-[1.15rem] w-[1.15rem]" />
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* view toggle */}
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
      </div>

      <motion.div
        key={`${plan}-${view}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      >
        <p className="mt-4 max-w-xl text-sm text-ink-secondary md:text-base">{meta.blurb}</p>
        <div className="mt-8">
          {view === "grid" ? (
            <DayGrid days={days} accent={plan} />
          ) : (
            <Timeline days={days} accent={plan} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
