"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import type { ItineraryEvent } from "@/lib/data";
import { fmtDayLong } from "@/lib/format";

export type TimelineDay = {
  date: string;
  dayNumber: number;
  theme: string;
  events: ItineraryEvent[];
};

export type TimelineAccent = "drive" | "fly" | "hybrid";

/* desert orange for the drive, jet-stream teal for the fly, twilight purple for the split */
const ACCENTS: Record<
  TimelineAccent,
  { rail: string; railShadow: string; node: string; nodeShadow: string }
> = {
  drive: {
    rail: "linear-gradient(to bottom, var(--glow-sunset) 0%, var(--glow-sunset) 20%, var(--glow-pink) 45%, var(--glow-pink) 72%, var(--glow-sunset) 100%)",
    railShadow: "0 0 8px rgba(240, 129, 63, 0.5)",
    node: "border-glow-sunset bg-card text-glow-sunset",
    nodeShadow: "0 0 10px rgba(240, 129, 63, 0.35)",
  },
  fly: {
    rail: "linear-gradient(to bottom, var(--glow-teal) 0%, var(--glow-teal) 25%, var(--glow-pink) 50%, var(--glow-pink) 75%, var(--glow-teal) 100%)",
    railShadow: "0 0 8px rgba(46, 230, 246, 0.5)",
    node: "border-glow-teal bg-card text-glow-teal",
    nodeShadow: "0 0 10px rgba(46, 230, 246, 0.35)",
  },
  hybrid: {
    rail: "linear-gradient(to bottom, var(--glow-purple) 0%, var(--glow-purple) 25%, var(--glow-pink) 50%, var(--glow-pink) 75%, var(--glow-purple) 100%)",
    railShadow: "0 0 8px rgba(167, 139, 250, 0.5)",
    node: "border-glow-purple bg-card text-glow-purple",
    nodeShadow: "0 0 10px rgba(167, 139, 250, 0.35)",
  },
};

export function Timeline({
  days,
  accent = "drive",
}: {
  days: TimelineDay[];
  accent?: TimelineAccent;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.7", "end 0.9"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const tone = ACCENTS[accent];

  return (
    <div ref={ref} className="relative">
      {/* rail */}
      <div
        className="absolute left-[15px] top-2 bottom-2 w-0.5 rounded bg-borderc-strong md:left-[19px]"
        aria-hidden
      />
      {/* lit rail — fills with scroll, tinted per plan */}
      <motion.div
        className="absolute left-[15px] top-2 bottom-2 w-0.5 origin-top rounded md:left-[19px]"
        style={{
          scaleY: progress,
          background: tone.rail,
          boxShadow: tone.railShadow,
        }}
        aria-hidden
      />

      <div className="space-y-10">
        {days.map((day) => {
          const vegas = day.theme === "vegas";
          return (
            <section key={day.date} className="relative pl-10 md:pl-14">
              {/* node */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className={`absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold md:h-10 md:w-10 md:text-sm ${
                  vegas ? "border-glow-pink bg-card text-glow-pink" : tone.node
                }`}
                style={{
                  boxShadow: vegas ? "0 0 14px rgba(255, 92, 168, 0.45)" : tone.nodeShadow,
                }}
              >
                {day.dayNumber}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
                className="font-display text-xl font-medium md:text-2xl"
              >
                {fmtDayLong(day.date)}
                {vegas && (
                  <span className="neon-text-teal ml-2 align-middle text-xs font-sans uppercase tracking-widest text-glow-teal">
                    vegas
                  </span>
                )}
              </motion.h2>

              <div className="mt-4 space-y-3">
                {day.events.map((event, i) => (
                  <motion.article
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{
                      type: "spring",
                      stiffness: 160,
                      damping: 22,
                      delay: i * 0.08,
                    }}
                    className={`rounded-2xl border p-4 md:p-5 ${
                      event.theme === "vegas" ? "card-vegas" : "card-desert"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {event.time && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                            event.theme === "vegas"
                              ? "bg-mark-pink/20 text-glow-pink"
                              : "bg-mark-orange/20 text-glow-sunset"
                          }`}
                        >
                          {event.time}
                        </span>
                      )}
                      <h3 className="font-medium md:text-lg">{event.title}</h3>
                    </div>
                    {event.description && (
                      <p className="mt-1.5 text-sm text-ink-secondary">{event.description}</p>
                    )}
                    {event.location && (
                      <p className="mt-2 text-xs text-ink-muted">📍 {event.location}</p>
                    )}
                  </motion.article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
