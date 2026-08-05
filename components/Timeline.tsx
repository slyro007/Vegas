"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useRef, useTransition } from "react";
import { EventCard, type ItineraryEditApi } from "@/components/EventCard";
import { EventEditor } from "@/components/EventEditor";
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

/** Edit-mode tail of a day: the dashed "+ Add Event" pill, or the add form once tapped. */
function AddEventControl({
  date,
  theme,
  edit,
}: {
  date: string;
  theme: string;
  edit: ItineraryEditApi;
}) {
  const [, startTransition] = useTransition();
  const key = `new:${date}`;
  if (edit.editorFor !== key) {
    return (
      <button
        onClick={() => edit.openEditor(key)}
        className="rounded-full border border-dashed border-borderc-strong px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-glow-pink/50 hover:text-ink"
      >
        + Add Event
      </button>
    );
  }
  return (
    <EventEditor
      date={date}
      defaultTheme={theme}
      saveLabel="Add Event"
      onSave={(draft) => {
        edit.closeEditor();
        startTransition(() => edit.add(draft));
      }}
      onCancel={edit.closeEditor}
    />
  );
}

export function Timeline({
  days,
  accent = "drive",
  edit,
}: {
  days: TimelineDay[];
  accent?: TimelineAccent;
  edit?: ItineraryEditApi;
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
                {/* default initial so mount-time cards keep their whileInView reveal */}
                <AnimatePresence>
                  {day.events.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      index={i}
                      isFirst={i === 0}
                      isLast={i === day.events.length - 1}
                      edit={edit}
                    />
                  ))}
                </AnimatePresence>
                {edit && day.events.length === 0 && (
                  <p className="text-sm text-ink-muted">Nothing planned yet.</p>
                )}
                {edit && <AddEventControl date={day.date} theme={day.theme} edit={edit} />}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
