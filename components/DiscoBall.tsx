/**
 * A hand-built SVG mirror ball. A tiled facet texture drifts horizontally under a
 * fixed spherical shading + specular highlight, so it reads as a spinning disco
 * ball; a few facets twinkle. Motion is CSS (see .dball-* in globals.css) and is
 * frozen under prefers-reduced-motion.
 */
const TWINKLES = [
  { x: 36, y: 30, r: 2.6, delay: "0s" },
  { x: 63, y: 40, r: 1.9, delay: "0.5s" },
  { x: 45, y: 62, r: 2.2, delay: "0.9s" },
  { x: 70, y: 60, r: 1.7, delay: "1.3s" },
  { x: 28, y: 52, r: 1.6, delay: "0.3s" },
  { x: 56, y: 24, r: 1.5, delay: "1.1s" },
];

export function DiscoBall({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Disco ball">
      <defs>
        <clipPath id="db-clip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
        <linearGradient id="db-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6eefb" />
          <stop offset="0.5" stopColor="#8195b9" />
          <stop offset="1" stopColor="#2f4066" />
        </linearGradient>
        <pattern id="db-facets" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#141d34" />
          <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="1.3" fill="url(#db-tile)" />
        </pattern>
        <radialGradient id="db-sphere" cx="0.34" cy="0.28" r="0.78">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="0.34" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.82" stopColor="#05010f" stopOpacity="0.18" />
          <stop offset="1" stopColor="#05010f" stopOpacity="0.66" />
        </radialGradient>
        <radialGradient id="db-pink" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--glow-pink)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--glow-pink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="db-teal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--glow-teal)" stopOpacity="0.7" />
          <stop offset="1" stopColor="var(--glow-teal)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath="url(#db-clip)">
        {/* drifting mirror facets (rect is wider than the ball so the loop is seamless) */}
        <g className="dball-facets">
          <rect x="-12" y="0" width="124" height="100" fill="url(#db-facets)" />
        </g>
        {/* neon light sweeps catching the mirrors */}
        <ellipse cx="66" cy="36" rx="30" ry="30" fill="url(#db-pink)" opacity="0.28" />
        <ellipse cx="34" cy="66" rx="26" ry="26" fill="url(#db-teal)" opacity="0.22" />
        {/* spherical shading: bright top-left, dark rim */}
        <circle cx="50" cy="50" r="46" fill="url(#db-sphere)" />
        {/* specular glint */}
        <ellipse cx="35" cy="30" rx="12" ry="8" fill="#ffffff" opacity="0.5" />
        {/* twinkling mirror flashes */}
        {TWINKLES.map((t) => (
          <circle
            key={`${t.x}-${t.y}`}
            className="dball-tw"
            style={{ animationDelay: t.delay }}
            cx={t.x}
            cy={t.y}
            r={t.r}
            fill="#ffffff"
          />
        ))}
      </g>
      {/* rim light */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(233, 240, 255, 0.3)" strokeWidth="1.1" />
    </svg>
  );
}
