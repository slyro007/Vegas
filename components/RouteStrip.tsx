"use client";

import { motion } from "motion/react";

const STOPS = [
  { name: "Muir Lake", sub: "TX · 5 AM Sat", x: 30 },
  { name: "Flagstaff", sub: "AZ · night 1", x: 175 },
  { name: "The Land", sub: "Valle · horses", x: 320 },
  { name: "VEGAS", sub: "NV · 5 nights", x: 465, vegas: true },
  { name: "Sedona", sub: "AZ · night 7", x: 610 },
  { name: "Home", sub: "TX · Sun AM", x: 755 },
];

/** Horizontal animated route: Muir Lake → Flagstaff → Valle → Vegas → Sedona → home. */
export function RouteStrip() {
  return (
    <div className="scroll-thin overflow-x-auto">
      <svg
        viewBox="0 0 785 96"
        className="h-24 w-[785px] min-w-full"
        role="img"
        aria-label="Route: Muir Lake to Flagstaff to the land at Valle to Las Vegas to Sedona and back home"
      >
        {/* base route */}
        <path
          d="M 30 40 C 90 20, 115 60, 175 40 S 260 20, 320 40 S 405 60, 465 40 S 550 20, 610 40 S 695 60, 755 40"
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="2"
        />
        {/* flowing dashes */}
        <path
          d="M 30 40 C 90 20, 115 60, 175 40 S 260 20, 320 40 S 405 60, 465 40 S 550 20, 610 40 S 695 60, 755 40"
          fill="none"
          stroke="var(--glow-sunset)"
          strokeWidth="2"
          className="dash-flow"
          opacity="0.85"
        />
        {STOPS.map((stop, i) => (
          <g key={stop.name}>
            <motion.circle
              cx={stop.x}
              cy={40}
              r={stop.vegas ? 7 : 5}
              fill={stop.vegas ? "var(--glow-pink)" : "var(--bg-elevated)"}
              stroke={stop.vegas ? "var(--glow-pink)" : "var(--glow-sunset)"}
              strokeWidth="2"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 18 }}
              style={stop.vegas ? { filter: "drop-shadow(0 0 6px var(--glow-pink))" } : undefined}
            />
            <text
              x={stop.x}
              y={68}
              textAnchor="middle"
              className={stop.vegas ? "fill-[var(--glow-pink)]" : "fill-[var(--ink)]"}
              style={{
                font: stop.vegas
                  ? "700 12px var(--font-geist-sans)"
                  : "600 12px var(--font-geist-sans)",
              }}
            >
              {stop.name}
            </text>
            <text
              x={stop.x}
              y={84}
              textAnchor="middle"
              className="fill-[var(--ink-muted)]"
              style={{ font: "10px var(--font-geist-sans)" }}
            >
              {stop.sub}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
