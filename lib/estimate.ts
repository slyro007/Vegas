import type { CostLine } from "@/db/schema";
import type { BudgetItem, Scenario, Traveler } from "@/lib/data";

/** Total of a scenario's shared travel + lodging cost lines. */
export const scenarioTotal = (s: Scenario) => s.costLines.reduce((a, l) => a + l.cents, 0);

/** Yellow-pad lines this scenario actually pays for, and what it really costs. */
export type CoveredLine = {
  item: BudgetItem;
  line: CostLine;
  /** yellowPad − real price. Positive = the real deal beat the plan. */
  saved: number;
};

/** Yellow-pad lines this scenario never incurs — the money goes back in the bucket. */
export type ReleasedLine = { item: BudgetItem; freed: number };

export type PersonEstimate = {
  traveler: Traveler;
  /** their yellow-pad total — fixed, never moves with the scenario */
  bucket: number;
  /** personal lines + the scenario cost lines they own */
  committed: number;
  /** bucket − committed: what this plan hands back to them */
  left: number;
  personal: number;
  covered: CoveredLine[];
  released: ReleasedLine[];
  spent: number;
};

export type SavingSource = {
  label: string;
  cents: number;
  /** "deal" = a real quote beat the yellow pad · "released" = this plan never incurs it */
  kind: "deal" | "released";
  travelerId: number | null;
};

export type Estimate = {
  /** the family yellow-pad pool — fixed */
  bucketTotal: number;
  /** Σ everyone's left-in-bucket */
  freed: number;
  /** cost lines nobody yellow-padded (flights, SUV, bags, ubers, fuel) */
  poolDraw: number;
  poolLines: CostLine[];
  /** freed − poolDraw. Negative = short. */
  available: number;
  shortfall: number;
  /** what the whole trip really costs on this plan */
  realTotal: number;
  /** what flying adds minus what not driving releases (0 for the drive plans) */
  routeChange: number;
  /** real quotes beating the yellow pad */
  dealSavings: number;
  savings: SavingSource[];
  /** cost split by hotels vs getting there — grouped by `key`, never by label */
  hotels: number;
  gettingThere: number;
  byConfidence: { quoted: number; rate: number; estimate: number };
  perPerson: PersonEstimate[];
};

const HOTEL_KEYS = new Set(["flagstaff", "sedona", "henderson"]);

/**
 * The bucket model.
 *
 * Each person's bucket is their yellow-pad total and never moves. What a plan
 * *commits* from it is their personal lines plus the cost lines they own; whatever
 * a plan doesn't incur is released back. Costs nobody yellow-padded (flights, the
 * rental SUV, bags, ubers, fuel) are drawn from the pooled freed money — which is
 * what produces the surplus, or the "we're short $X" question.
 *
 * Nobody is ever charged a share of a cost they didn't plan for: Shy commits her
 * $450 on every scenario.
 */
export function estimateForScenario(
  travelers: Traveler[],
  items: BudgetItem[],
  scenario: Scenario | undefined,
): Estimate {
  const lines = scenario?.costLines ?? [];
  const byKey = new Map(lines.filter((l) => l.key).map((l) => [l.key as string, l]));

  const bucketTotal = items.reduce((a, i) => a + i.yellowPadCents, 0);
  const poolLines = lines.filter((l) => !l.owner);
  const poolDraw = poolLines.reduce((a, l) => a + l.cents, 0);

  const savings: SavingSource[] = [];

  const perPerson: PersonEstimate[] = travelers.map((t) => {
    const own = items.filter((i) => i.travelerId === t.id);
    const personal = own.filter((i) => !i.costKey).reduce((a, i) => a + i.plannedCents, 0);

    const covered: CoveredLine[] = [];
    const released: ReleasedLine[] = [];
    for (const item of own) {
      if (!item.costKey) continue;
      const line = byKey.get(item.costKey);
      if (line) covered.push({ item, line, saved: item.yellowPadCents - line.cents });
      else released.push({ item, freed: item.yellowPadCents });
    }

    const bucket = own.reduce((a, i) => a + i.yellowPadCents, 0);
    const committed = personal + covered.reduce((a, c) => a + c.line.cents, 0);

    // itemize where this person's freed money came from
    for (const c of covered) {
      if (c.saved !== 0) {
        savings.push({
          label: c.item.label,
          cents: c.saved,
          kind: "deal",
          travelerId: t.id,
        });
      }
    }
    for (const r of released) {
      savings.push({ label: r.item.label, cents: r.freed, kind: "released", travelerId: t.id });
    }
    // personal lines can beat their yellow pad too (the Luxor all-inclusive deal)
    for (const i of own) {
      if (i.costKey) continue;
      const saved = i.yellowPadCents - i.plannedCents;
      if (saved !== 0) {
        savings.push({ label: i.label, cents: saved, kind: "deal", travelerId: t.id });
      }
    }

    return {
      traveler: t,
      bucket,
      committed,
      left: bucket - committed,
      personal,
      covered,
      released,
      spent: own.reduce((a, i) => a + (i.actualCents ?? 0), 0),
    };
  });

  const freed = perPerson.reduce((a, p) => a + p.left, 0);
  const available = freed - poolDraw;

  // route change: what this plan adds that nobody budgeted for, minus what it releases
  const releasedTotal = perPerson.reduce(
    (a, p) => a + p.released.reduce((b, r) => b + r.freed, 0),
    0,
  );
  const routeChange = poolDraw - releasedTotal;
  const dealSavings = savings.filter((s) => s.kind === "deal").reduce((a, s) => a + s.cents, 0);

  const hotels = lines.filter((l) => l.key && HOTEL_KEYS.has(l.key)).reduce((a, l) => a + l.cents, 0);
  const byConfidence = { quoted: 0, rate: 0, estimate: 0 };
  for (const l of lines) byConfidence[l.confidence ?? "estimate"] += l.cents;

  return {
    bucketTotal,
    freed,
    poolDraw,
    poolLines,
    available,
    shortfall: Math.max(0, -available),
    realTotal: bucketTotal - available,
    routeChange,
    dealSavings,
    savings: savings.sort((a, b) => b.cents - a.cents),
    hotels,
    gettingThere: lines.reduce((a, l) => a + l.cents, 0) - hotels,
    byConfidence,
    perPerson,
  };
}
