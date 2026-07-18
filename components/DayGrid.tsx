"use client";

import { MapPin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { TimelineAccent, TimelineDay } from "@/components/Timeline";
import { fmtDayLong, parseDay } from "@/lib/format";

const ACCENT_TEXT: Record<TimelineAccent, string> = {
  drive: "text-glow-sunset",
  fly: "text-glow-teal",
  hybrid: "text-glow-purple",
};

/** The whole trip on one screen: compact day cards, tap one to unfold the details. */
export function DayGrid({
  days,
  accent = "drive",
}: {
  days: TimelineDay[];
  accent?: TimelineAccent;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {days.map((day) => {
        const vegas = day.theme === "vegas";
        const isOpen = openDate === day.date;
        const d = parseDay(day.date);
        return (
          <motion.button
            key={day.date}
            layout
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            onClick={() => setOpenDate(isOpen ? null : day.date)}
            aria-expanded={isOpen}
            className={`flex flex-col items-stretch justify-start rounded-2xl border p-3 text-left md:p-4 ${
              vegas ? "card-vegas" : "card-desert"
            } ${isOpen ? "col-span-2 md:col-span-4" : ""}`}
          >
            <motion.div layout="position" className="flex items-baseline gap-2">
              <span
                className={`font-display text-2xl font-semibold tabular-nums ${
                  vegas ? "text-glow-pink" : ACCENT_TEXT[accent]
                }`}
              >
                {day.dayNumber}
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-widest text-ink-muted">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="block text-sm font-medium">
                  {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </span>
              {vegas && (
                <span className="neon-text-teal ml-auto text-[11px] uppercase tracking-widest text-glow-teal">
                  vegas
                </span>
              )}
            </motion.div>

            {/* compact: time-chipped titles only */}
            <motion.ul layout="position" className="mt-2.5 space-y-1.5">
              {day.events.map((event) => (
                <li key={event.id} className="text-sm leading-snug">
                  {event.time && (
                    <span
                      className={`mr-1.5 rounded-full px-1.5 py-px text-[11px] font-medium uppercase tracking-wider ${
                        event.theme === "vegas"
                          ? "bg-mark-pink/20 text-glow-pink"
                          : "bg-mark-orange/20 text-glow-sunset"
                      }`}
                    >
                      {event.time}
                    </span>
                  )}
                  <span className={isOpen ? "font-medium" : "text-ink-secondary"}>
                    {event.title}
                  </span>
                  <AnimatePresence initial={false}>
                    {isOpen && (event.description || event.location) && (
                      <motion.span
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 240, damping: 30 }}
                        className="block overflow-hidden"
                      >
                        {event.description && (
                          <span className="mt-0.5 block text-ink-secondary">
                            {event.description}
                          </span>
                        )}
                        {event.location && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {event.location}
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </motion.ul>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-2.5 text-[11px] uppercase tracking-widest text-ink-muted"
                >
                  {fmtDayLong(day.date)} · Tap to Close
                </motion.p>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
