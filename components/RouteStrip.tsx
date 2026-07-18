"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type Stop = {
  key: string;
  name: string;
  sub: string;
  dates: string;
  x: number;
  vegas?: boolean;
  activities: string[];
};

const STOPS: Stop[] = [
  {
    key: "muir",
    name: "Muir Lake",
    sub: "TX · 5 AM Sat",
    dates: "Fri Aug 7 – Sat Aug 8",
    x: 30,
    activities: [
      "Pick up Amma Friday evening",
      "Pack the cooler — Amma-safe",
      "Wheels roll 5:00 AM Saturday",
    ],
  },
  {
    key: "flagstaff",
    name: "Flagstaff",
    sub: "AZ · Night 1",
    dates: "Sat Aug 8",
    x: 175,
    activities: [
      "Super-late-night check-in after ~15 hours",
      "Aiden by Best Western · 2 queens",
      "Breakfast in town Sunday morning",
    ],
  },
  {
    key: "land",
    name: "The Land",
    sub: "Valle · Horses",
    dates: "Sun Aug 9",
    x: 320,
    activities: [
      "287 S Victoria Dr, Valle, AZ",
      "~4 hours of horses with Caesar's crew",
      "Then the last leg into Vegas",
    ],
  },
  {
    key: "vegas",
    name: "VEGAS",
    sub: "NV · 5 Nights",
    dates: "Sun Aug 9 – Fri Aug 14",
    x: 465,
    vegas: true,
    activities: [
      "BW Henderson → the Luxor All-Inclusive",
      "Moapa Valley Monday · Old Vegas Tuesday",
      "Wynn Buffet Wednesday — non-negotiable",
    ],
  },
  {
    key: "sedona",
    name: "Sedona",
    sub: "AZ · Night 7",
    dates: "Fri Aug 14",
    x: 610,
    activities: [
      "Slide Rock State Park",
      "Downtown shops + red-rock dinner",
      "Grocery restock for the haul home",
    ],
  },
  {
    key: "home",
    name: "Home",
    sub: "TX · Sun AM",
    dates: "Sat Aug 15 – Sun Aug 16",
    x: 755,
    activities: ["5 AM start out of Sedona", "Roll into Muir Lake super early Sunday"],
  },
];

const ROUTE_PATH =
  "M 30 40 C 90 20, 115 60, 175 40 S 260 20, 320 40 S 405 60, 465 40 S 550 20, 610 40 S 695 60, 755 40";

function SphereEgg() {
  const [burst, setBurst] = useState(0);
  return (
    <div className="relative mt-2">
      <button
        onClick={() => setBurst((b) => b + 1)}
        className="disco-chip flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left"
        title="Everybody… 🎶"
      >
        <span className="disco-ball text-xl">🪩</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold tracking-wide">
            Backstreet&apos;s Back — The Sphere
          </span>
          <span className="block text-xs text-ink-secondary">
            Thu Aug 13 · Night · BeX&apos;s Solo Show 🎤
          </span>
        </span>
        <span className="flex items-end gap-[3px]" aria-hidden>
          <span className="eq-bar" style={{ animationDelay: "0s" }} />
          <span className="eq-bar" style={{ animationDelay: "0.25s", background: "var(--glow-pink)" }} />
          <span className="eq-bar" style={{ animationDelay: "0.5s", background: "var(--glow-gold)" }} />
        </span>
      </button>
      {/* tap burst */}
      <AnimatePresence>
        {burst > 0 && (
          <div key={burst} className="pointer-events-none absolute inset-x-0 top-0" aria-hidden>
            {["🎤", "✨", "🕺", "💫", "🎶"].map((emoji, i) => (
              <span
                key={i}
                className="float-away absolute text-lg"
                style={{ left: `${12 + i * 18}%`, animationDelay: `${i * 0.07}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Animated route with hoverable stops that expand into per-stop plans. */
export function RouteStrip() {
  const [active, setActive] = useState<string | null>(null);
  const stop = STOPS.find((s) => s.key === active);

  return (
    <div onMouseLeave={() => setActive(null)}>
      <div className="scroll-thin overflow-x-auto">
        <svg
          viewBox="0 0 785 96"
          className="h-24 w-[785px] min-w-full"
          role="img"
          aria-label="Route: Muir Lake to Flagstaff to the land at Valle to Las Vegas to Sedona and back home. Hover or tap a stop for details."
        >
          <path d={ROUTE_PATH} fill="none" stroke="var(--border-strong)" strokeWidth="2" />
          <path
            d={ROUTE_PATH}
            fill="none"
            stroke="var(--glow-sunset)"
            strokeWidth="2"
            className="dash-flow"
            opacity="0.85"
          />
          {STOPS.map((s, i) => {
            const isActive = active === s.key;
            return (
              <g
                key={s.key}
                className="cursor-pointer"
                onMouseEnter={() => setActive(s.key)}
                onClick={() => setActive(isActive ? null : s.key)}
              >
                {/* generous hit area */}
                <rect x={s.x - 55} y={0} width={110} height={96} fill="transparent" />
                {s.vegas && (
                  <circle
                    cx={s.x}
                    cy={40}
                    r={12}
                    fill="var(--glow-pink)"
                    opacity="0.25"
                    style={{ animation: "twinkle 2.2s ease-in-out infinite" }}
                  />
                )}
                <motion.circle
                  cx={s.x}
                  cy={40}
                  r={s.vegas ? 7 : 5}
                  fill={s.vegas ? "var(--glow-pink)" : isActive ? "var(--glow-sunset)" : "var(--bg-elevated)"}
                  stroke={s.vegas ? "var(--glow-pink)" : "var(--glow-sunset)"}
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 18 }}
                  style={s.vegas ? { filter: "drop-shadow(0 0 6px var(--glow-pink))" } : undefined}
                />
                <text
                  x={s.x}
                  y={68}
                  textAnchor="middle"
                  className={s.vegas ? "fill-[var(--glow-pink)]" : "fill-[var(--ink)]"}
                  style={{
                    font: `${s.vegas || isActive ? "700" : "600"} 12px var(--font-geist-sans)`,
                  }}
                >
                  {s.name}
                </text>
                <text
                  x={s.x}
                  y={84}
                  textAnchor="middle"
                  className="fill-[var(--ink-muted)]"
                  style={{ font: "10px var(--font-geist-sans)" }}
                >
                  {s.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* expanding stop detail */}
      <AnimatePresence initial={false}>
        {stop && (
          <motion.div
            key={stop.key}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-2 rounded-xl border p-4 ${stop.vegas ? "card-vegas" : "card-desert"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={`font-display text-lg font-semibold ${stop.vegas ? "text-glow-pink" : ""}`}>
                  {stop.name}
                </span>
                <span className="text-xs text-ink-muted">{stop.dates}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {stop.activities.map((activity, i) => (
                  <motion.li
                    key={activity}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i, type: "spring", stiffness: 260, damping: 24 }}
                    className="flex gap-2 text-sm text-ink-secondary"
                  >
                    <span className={stop.vegas ? "text-glow-pink" : "text-glow-sunset"}>•</span>
                    {activity}
                  </motion.li>
                ))}
              </ul>
              {stop.vegas && <SphereEgg />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-ink-muted">
        Hover or Tap a Stop
      </p>
    </div>
  );
}
