/** Decorative twinkling stars for hero sections. Deterministic layout (no hydration drift). */
export function Stars({ count = 26 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => {
    // deterministic pseudo-random from index
    const a = ((i * 2654435761) % 997) / 997;
    const b = ((i * 40503 + 13) % 991) / 991;
    const c = ((i * 97 + 7) % 89) / 89;
    return {
      left: `${(a * 96 + 2).toFixed(2)}%`,
      top: `${(b * 62 + 3).toFixed(2)}%`,
      size: c > 0.8 ? 3 : 2,
      delay: `${(c * 4).toFixed(2)}s`,
      duration: `${(2.5 + a * 3).toFixed(2)}s`,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: 0.3,
            animation: `twinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
