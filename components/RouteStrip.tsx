"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  "M 30 44 C 70 28, 111 60, 151 44 S 231 28, 271 44 S 352 60, 392 44 S 473 28, 513 44 S 594 60, 634 44 S 715 28, 755 44";

/**
 * The flight schedule, as fractions of one 26s loop. The plane holds at Austin,
 * flies a leg, pauses at each stop, then rests at Home before looping. The
 * curves between stops are uniform, so stop i sits at ~i/6 of the path length —
 * plane keyPoints, the trail's dash-offset, and every stop's ignition pulse all
 * read from this one table, which is what keeps them in sync.
 */
const KEY_TIMES =
  "0;0.0577;0.1346;0.1808;0.2577;0.3038;0.3808;0.4269;0.5038;0.55;0.6269;0.6731;0.75;1";
const KEY_POINTS =
  "0;0;0.1667;0.1667;0.3333;0.3333;0.5;0.5;0.6667;0.6667;0.8333;0.8333;1;1";
// trail dash-offset = 1 − keyPoint (path is pathLength=1, dasharray=1)
const TRAIL_VALUES =
  "1;1;0.8333;0.8333;0.6667;0.6667;0.5;0.5;0.3333;0.3333;0.1667;0.1667;0;0";
// hold segments are linear; travel legs ease out
const HOLD = "0 0 1 1";
const LEG = "0.45 0 0.25 1";
const KEY_SPLINES = [HOLD, LEG, HOLD, LEG, HOLD, LEG, HOLD, LEG, HOLD, LEG, HOLD, LEG, HOLD].join(";");
const DUR = "26s";
// when the plane reaches each stop (fraction of the loop), for the ignition pulses
const ARRIVALS = [0.06, 0.1346, 0.2577, 0.3808, 0.5038, 0.6269, 0.75];

const pulse = (at: number) => {
  const t = (n: number) => Math.min(Math.max(n, 0), 1).toFixed(4);
  return {
    keyTimes: `0;${t(at - 0.006)};${t(at + 0.004)};${t(at + 0.06)};1`,
    values: "0;0;0.6;0;0",
  };
};

// deterministic star field over the neon half (stable across SSR + hydration)
const STARS = [
  [452, 14, 1], [498, 25, 0.8], [531, 10, 1.2], [566, 30, 0.7], [597, 16, 1],
  [629, 8, 0.8], [668, 22, 1.1], [701, 12, 0.7], [733, 27, 1], [762, 15, 0.8],
  [416, 21, 0.7], [700, 33, 0.6],
] as const;

const saguaro = (x: number) =>
  `M ${x} 104 L ${x} 88 M ${x} 97 q -5 0 -5 -7 M ${x} 94 q 5 0 5 -6`;

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

/**
 * The booked route as a scene: desert sunset fading into Vegas neon, mountains
 * drifting in parallax, and DL2260 flying the path — pausing at every stop,
 * lighting each one as it lands, drawing its trail behind it. SMIL drives the
 * flight so it runs identically in Safari with zero per-frame JS; reduced
 * motion gets the same scene, fully lit, plane parked at Home.
 */
export function RouteStrip() {
  const [active, setActive] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const stop = STOPS.find((s) => s.key === active);

  return (
    <div onMouseLeave={() => setActive(null)}>
      <div className="scroll-thin overflow-x-auto">
        <svg
          viewBox="-52 0 889 150"
          className="h-auto w-full min-w-[760px]"
          role="img"
          aria-label="Route: fly Austin to Vegas, then Valle, Sedona, Moapa Valley, the Vegas week, and fly home. Hover or tap a stop for details."
          style={{
            // no box — the scene floats, fading out at its edges
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)",
          }}
        >
          <defs>
            <linearGradient id="rs-sky" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--glow-sunset)" stopOpacity="0.16" />
              <stop offset="0.5" stopColor="var(--glow-pink)" stopOpacity="0.07" />
              <stop offset="1" stopColor="var(--glow-purple)" stopOpacity="0.17" />
            </linearGradient>
            <linearGradient id="rs-trail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--glow-sunset)" />
              <stop offset="0.6" stopColor="var(--glow-pink)" />
              <stop offset="1" stopColor="var(--glow-teal)" />
            </linearGradient>
            <linearGradient id="rs-beam" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="var(--glow-pink)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--glow-pink)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g>
            {/* sky: desert sunset sweeping into neon night (edges fade via the svg mask) */}
            <rect x="-52" y="0" width="889" height="150" fill="url(#rs-sky)" />

            {/* a low sun, half-set behind the far ridge */}
            <circle
              cx="72"
              cy="80"
              r="13"
              fill="var(--glow-sunset)"
              opacity="0.4"
              style={{ filter: "blur(3px)" }}
              aria-hidden
            />

            {/* stars over the neon half */}
            {STARS.map(([x, y, r], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={r}
                fill="var(--glow-teal)"
                opacity="0.5"
                style={{ animation: `twinkle ${2 + (i % 3) * 0.7}s ease-in-out ${i * 0.35}s infinite` }}
                aria-hidden
              />
            ))}

            {/* mountains, two drifting layers */}
            <polygon
              className="rs-drift-far"
              points="-60,95 0,95 60,72 130,88 210,66 300,86 380,70 470,88 560,68 640,86 720,72 785,88 850,80 850,150 -60,150"
              fill="#1c1531"
              opacity="0.75"
              aria-hidden
            />
            <polygon
              className="rs-drift-near"
              points="-60,104 0,112 70,92 150,106 240,88 330,104 420,90 510,106 600,94 690,104 785,94 850,102 850,150 -60,150"
              fill="#120d1c"
              aria-hidden
            />

            {/* saguaros in the Arizona stretch */}
            <path d={saguaro(262)} stroke="#3d5947" strokeWidth="2.5" strokeLinecap="round" fill="none" aria-hidden />
            <path d={saguaro(288)} stroke="#31463a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" transform="translate(0 4) scale(1 0.8)" aria-hidden />
            <path d={saguaro(400)} stroke="#3d5947" strokeWidth="2.5" strokeLinecap="round" fill="none" aria-hidden />

            {/* the Vegas skyline: towers, the pyramid + beam, and the Sphere */}
            <g aria-hidden>
              <polygon points="634,72 625,104 643,104" fill="#1a1329" stroke="var(--glow-pink)" strokeWidth="0.75" opacity="0.9" />
              <polygon points="633,72 635,72 637.5,4 630.5,4" fill="url(#rs-beam)" opacity="0.35" />
              <rect x="613" y="86" width="6" height="18" fill="#1a1329" stroke="var(--glow-teal)" strokeWidth="0.5" opacity="0.8" />
              <rect x="646" y="82" width="7" height="22" fill="#1a1329" stroke="var(--glow-gold)" strokeWidth="0.5" opacity="0.8" />
              <circle
                cx="660"
                cy="97"
                r="3.5"
                fill="var(--glow-teal)"
                opacity="0.45"
                style={{ animation: "twinkle 2.6s ease-in-out infinite" }}
              />
            </g>

            {/* the route: base rail + flowing dashes + the trail DL2260 draws */}
            <path d={ROUTE_PATH} fill="none" stroke="var(--border-strong)" strokeWidth="2" />
            <path d={ROUTE_PATH} fill="none" stroke="var(--glow-sunset)" strokeWidth="2" className="dash-flow" opacity="0.5" />
            <path
              id="rs-route"
              d={ROUTE_PATH}
              fill="none"
              stroke="url(#rs-trail)"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={reduced ? 0 : 1}
              style={{ filter: "drop-shadow(0 0 4px var(--glow-pink))" }}
            >
              {!reduced && (
                <animate
                  attributeName="stroke-dashoffset"
                  dur={DUR}
                  repeatCount="indefinite"
                  calcMode="spline"
                  keyTimes={KEY_TIMES}
                  keySplines={KEY_SPLINES}
                  values={TRAIL_VALUES}
                />
              )}
            </path>

            {/* stops */}
            {STOPS.map((s, i) => {
              const isActive = active === s.key;
              const p = pulse(ARRIVALS[i]);
              return (
                <g
                  key={s.key}
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(s.key)}
                  onClick={() => setActive(isActive ? null : s.key)}
                >
                  {/* generous hit area */}
                  <rect x={s.x - 55} y={0} width={110} height={150} fill="transparent" />

                  {/* ignition pulse as the plane lands */}
                  <circle cx={s.x} cy={44} r={11} fill="var(--glow-sunset)" opacity={0} aria-hidden>
                    {!reduced && (
                      <animate
                        attributeName="opacity"
                        dur={DUR}
                        repeatCount="indefinite"
                        keyTimes={p.keyTimes}
                        values={p.values}
                      />
                    )}
                  </circle>

                  {s.vegas && (
                    <circle
                      cx={s.x}
                      cy={44}
                      r={12}
                      fill="var(--glow-pink)"
                      opacity="0.25"
                      style={{ animation: "twinkle 2.2s ease-in-out infinite" }}
                    />
                  )}
                  <motion.circle
                    cx={s.x}
                    cy={44}
                    r={s.vegas ? 7 : 5}
                    fill={s.vegas ? "var(--glow-pink)" : isActive ? "var(--glow-sunset)" : "var(--bg-elevated)"}
                    stroke={s.vegas ? "var(--glow-pink)" : "var(--glow-sunset)"}
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.12 * i, type: "spring", stiffness: 300, damping: 18 }}
                    style={s.vegas ? { filter: "drop-shadow(0 0 6px var(--glow-pink))" } : undefined}
                  />

                  {/* drop line tying the stop to its ground label */}
                  <line
                    x1={s.x}
                    y1={54}
                    x2={s.x}
                    y2={108}
                    stroke="var(--border)"
                    strokeDasharray="2 4"
                    opacity={isActive ? 0.9 : 0.4}
                    aria-hidden
                  />

                  <text
                    x={s.x}
                    y={124}
                    textAnchor="middle"
                    className={s.vegas ? "fill-[var(--glow-pink)]" : "fill-[var(--ink)]"}
                    style={{ font: `${s.vegas || isActive ? "700" : "600"} 12px var(--font-geist-sans)` }}
                  >
                    {s.name}
                  </text>
                  <text
                    x={s.x}
                    y={138}
                    textAnchor="middle"
                    className="fill-[var(--ink-muted)]"
                    style={{ font: "10px var(--font-geist-sans)" }}
                  >
                    {s.sub}
                  </text>
                </g>
              );
            })}

            {/* DL2260, flying the route */}
            <g aria-hidden style={{ filter: "drop-shadow(0 0 4px var(--glow-gold))" }}>
              {reduced ? (
                <g transform="translate(755 44)">
                  <path d="M 10 0 L -8 -5 L -4 0 L -8 5 Z" fill="var(--glow-gold)" />
                </g>
              ) : (
                <g>
                  <path d="M 10 0 L -8 -5 L -4 0 L -8 5 Z" fill="var(--glow-gold)" />
                  <text
                    x={-2}
                    y={-9}
                    textAnchor="middle"
                    className="fill-[var(--glow-gold)]"
                    style={{ font: "600 6.5px var(--font-geist-mono, monospace)", opacity: 0.85 }}
                  >
                    DL2260
                  </text>
                  <animateMotion
                    dur={DUR}
                    repeatCount="indefinite"
                    rotate="auto"
                    calcMode="spline"
                    keyTimes={KEY_TIMES}
                    keySplines={KEY_SPLINES}
                    keyPoints={KEY_POINTS}
                  >
                    <mpath href="#rs-route" />
                  </animateMotion>
                </g>
              )}
            </g>
          </g>
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
            <div className={`mt-2 rounded-xl border p-4 ${stop.vegas ? "card-vegas" : "card-desert"}`}>
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
