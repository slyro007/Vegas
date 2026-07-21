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
    key: "austin",
    name: "Austin",
    sub: "Fly Out · 3:39 PM",
    dates: "Fri Aug 7",
    x: 30,
    activities: [
      "Booked — Delta DL2260, all four of us",
      "One shared XL to the airport",
      "Wheels down in Vegas 4:32 PM",
    ],
  },
  {
    key: "vegas-in",
    name: "Vegas",
    sub: "Fly-In Night",
    dates: "Fri Aug 7",
    x: 151,
    activities: [
      "Pick up the SUV at Harry Reid",
      "BW Henderson on John's rate",
      "Crash — big Saturday ahead",
    ],
  },
  {
    key: "valle",
    name: "Valle",
    sub: "AZ · Horses",
    dates: "Sat Aug 8",
    x: 271,
    activities: [
      "287 S Victoria Dr, Valle, AZ",
      "~4 hours of horses with Caesar's crew",
      "Then on to Sedona for the night",
    ],
  },
  {
    key: "sedona",
    name: "Sedona",
    sub: "AZ · 2 Nights",
    dates: "Sat Aug 8 – Mon Aug 10",
    x: 392,
    activities: [
      "Best Western Red Rock, John's rate",
      "Slide Rock, the vortexes, downtown",
      "A slow red-rock Sunday",
    ],
  },
  {
    key: "moapa",
    name: "Moapa",
    sub: "NV · On the Way",
    dates: "Mon Aug 10",
    x: 513,
    activities: [
      "Break the drive back in Shy's hometown",
      "Then the last push into Henderson",
    ],
  },
  {
    key: "vegas",
    name: "VEGAS",
    sub: "NV · The Week",
    dates: "Mon Aug 10 – Fri Aug 14",
    x: 634,
    vegas: true,
    activities: [
      "BW Henderson → the Luxor All-Inclusive",
      "Old Vegas Tuesday · Wynn Buffet Wednesday",
      "BeX at the Backstreet Boys, Sphere",
    ],
  },
  {
    key: "home",
    name: "Home",
    sub: "Fly Back · 5:15 PM",
    dates: "Fri Aug 14",
    x: 755,
    activities: [
      "Booked — Delta DL1837, lands 10:05 PM",
      "Drop the SUV at the airport first",
      "Home in Austin by midnight",
    ],
  },
];

const ROUTE_PATH =
  "M 30 40 C 70 20, 111 60, 151 40 S 231 20, 271 40 S 352 60, 392 40 S 473 20, 513 40 S 594 60, 634 40 S 715 20, 755 40";

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
          aria-label="Route: fly Austin to Vegas, then Valle, Sedona, Moapa Valley, the Vegas week, and fly home. Hover or tap a stop for details."
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
