/** Validated scenario accent colors (dark-surface data marks + decorative soft/glow variants). */
export const SCENARIO_ACCENT: Record<
  string,
  { mark: string; soft: string; glow: string }
> = {
  forester: {
    mark: "var(--mark-orange)",
    soft: "rgba(202,108,52,0.16)",
    glow: "rgba(240,129,63,0.35)",
  },
  "rental-suv": {
    mark: "var(--mark-purple)",
    soft: "rgba(139,115,209,0.16)",
    glow: "rgba(139,115,209,0.4)",
  },
  fly: {
    mark: "var(--mark-teal)",
    soft: "rgba(14,165,181,0.16)",
    glow: "rgba(46,230,246,0.3)",
  },
  "hybrid-forester": {
    mark: "var(--mark-green)",
    soft: "rgba(77,160,107,0.16)",
    glow: "rgba(77,160,107,0.4)",
  },
  "hybrid-rental": {
    mark: "var(--mark-amber)",
    soft: "rgba(184,137,49,0.16)",
    glow: "rgba(184,137,49,0.4)",
  },
};

export const scenarioAccent = (slug: string) => SCENARIO_ACCENT[slug] ?? SCENARIO_ACCENT.forester;
