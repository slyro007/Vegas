import type { CostLine } from "@/db/schema";

/**
 * How solid a cost line is. Nothing outside the Luxor package is booked, so a
 * Best Western number must never read as a firm price — it's John's rate, an
 * assumption we haven't confirmed.
 */
const TAG = {
  quoted: { label: "quoted", className: "bg-mark-green/15 text-mark-green" },
  rate: { label: "john's rate", className: "bg-mark-amber/15 text-mark-amber" },
  estimate: { label: "est.", className: "bg-surface text-ink-muted" },
} as const;

/** Legacy rows only carry `estimate: true`; treat anything untagged as an estimate. */
export const confidenceOf = (line: CostLine) =>
  line.confidence ?? (line.estimate ? "estimate" : "estimate");

export function ConfidenceTag({ line }: { line: CostLine }) {
  const tag = TAG[confidenceOf(line)];
  return (
    <span
      className={`ml-1.5 shrink-0 rounded px-1 py-px text-[11px] uppercase tracking-wide ${tag.className}`}
      title={
        confidenceOf(line) === "rate"
          ? "John's Best Western rate — an assumption, not a booking"
          : confidenceOf(line) === "quoted"
            ? "A real price we were quoted"
            : "A rough estimate"
      }
    >
      {tag.label}
    </span>
  );
}

/**
 * The gap between a line and its alternative, in the direction that matters —
 * a cheaper alternative is a saving worth seeing, not just a smaller number.
 */
export function AltDelta({ line }: { line: CostLine }) {
  if (!line.alternative) return null;
  const delta = line.alternative.cents - line.cents;
  if (delta === 0) return null;
  const money = `$${(Math.abs(delta) / 100).toFixed(2).replace(/\.00$/, "")}`;
  return delta > 0 ? (
    <span className="text-mark-pink"> · +{money}</span>
  ) : (
    <span className="text-mark-green"> · saves {money}</span>
  );
}

/** Bar fill treatment matching the tag: solid when quoted, hatched when not. */
export function confidenceFill(line: CostLine) {
  const c = confidenceOf(line);
  if (c === "quoted") return undefined;
  return c === "rate"
    ? "repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.22) 5px 8px)"
    : "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.35) 3px 6px)";
}
