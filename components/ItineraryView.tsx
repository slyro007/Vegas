"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Timeline, type TimelineDay } from "@/components/Timeline";
import type { ItineraryEvent } from "@/lib/data";

const PLANS = [
  {
    key: "drive" as const,
    label: "🚙 Drive Plan",
    blurb:
      "Ten days: two big hauls, horses on our land in Valle, five nights of Vegas, and a red-rock finale in Sedona. The rail turns neon when the trip does.",
    dates: "Aug 7 – 16, 2026",
  },
  {
    key: "fly" as const,
    label: "✈️ Fly Plan",
    blurb:
      "Nine days, zero overnight hauls: fly in Saturday, SUV out of Harry Reid, day-trip to the land, and a Sedona overnight before the Saturday evening flight home.",
    dates: "Aug 7 – 15, 2026",
  },
];

function buildDays(events: ItineraryEvent[], plan: "drive" | "fly"): TimelineDay[] {
  const filtered = events.filter((e) => e.plan === "both" || e.plan === plan);
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
  defaultPlan?: "drive" | "fly";
}) {
  const [plan, setPlan] = useState<"drive" | "fly">(defaultPlan);
  const meta = PLANS.find((p) => p.key === plan)!;
  const days = buildDays(events, plan);

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-ink-muted">{meta.dates}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold md:text-5xl">The Itinerary</h1>

      {/* plan toggle */}
      <div className="mt-5 inline-flex rounded-full border border-borderc bg-card p-1">
        {PLANS.map((p) => {
          const active = plan === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPlan(p.key)}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
              }`}
              aria-pressed={active}
            >
              {active && (
                <motion.span
                  layoutId="plan-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      p.key === "fly"
                        ? "color-mix(in srgb, var(--mark-teal) 30%, transparent)"
                        : "color-mix(in srgb, var(--mark-orange) 30%, transparent)",
                    border: `1px solid ${p.key === "fly" ? "var(--mark-teal)" : "var(--mark-orange)"}`,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{p.label}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={plan}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      >
        <p className="mt-4 max-w-xl text-sm text-ink-secondary md:text-base">{meta.blurb}</p>
        <div className="mt-8">
          <Timeline days={days} accent={plan} />
        </div>
      </motion.div>
    </div>
  );
}
