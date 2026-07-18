import type { BudgetItem, Scenario, Traveler } from "@/lib/data";

/** Total of a scenario's shared travel + lodging cost lines. */
export const scenarioTotal = (s: Scenario) => s.costLines.reduce((a, l) => a + l.cents, 0);

export type PersonEstimate = {
  traveler: Traveler;
  yellow: number; // sum of yellow-pad amounts
  projected: number; // sum of refined/real amounts
  personal: number; // projected of their non-shared (personal) lines
  estimated: number; // personal + their even share of the scenario's shared cost
  spent: number; // logged actuals
};

export type Estimate = {
  yellowPool: number; // family yellow-pad budget (fixed)
  personalTotal: number; // family personal (non-shared) projected
  sharedTotal: number; // selected scenario's shared cost
  familyEstimate: number; // personalTotal + sharedTotal
  delta: number; // yellowPool − familyEstimate (positive = under budget)
  shortfall: number; // how far over the pool (0 when under)
  perPerson: PersonEstimate[];
};

/**
 * What the trip really costs each person under a given scenario: their personal
 * lines as projected, plus an equal ¼ share of that scenario's shared travel +
 * lodging. Compared against the fixed yellow-pad pool to surface savings/shortfall.
 */
export function estimateForScenario(
  travelers: Traveler[],
  items: BudgetItem[],
  scenario: Scenario | undefined,
): Estimate {
  const sharedTotal = scenario ? scenarioTotal(scenario) : 0;
  const perHead = travelers.length ? sharedTotal / travelers.length : 0;
  const yellowPool = items.reduce((a, i) => a + i.yellowPadCents, 0);
  const personalTotal = items.filter((i) => !i.shared).reduce((a, i) => a + i.plannedCents, 0);

  const perPerson: PersonEstimate[] = travelers.map((t) => {
    const own = items.filter((i) => i.travelerId === t.id);
    const personal = own.filter((i) => !i.shared).reduce((a, i) => a + i.plannedCents, 0);
    return {
      traveler: t,
      yellow: own.reduce((a, i) => a + i.yellowPadCents, 0),
      projected: own.reduce((a, i) => a + i.plannedCents, 0),
      personal,
      estimated: Math.round(personal + perHead),
      spent: own.reduce((a, i) => a + (i.actualCents ?? 0), 0),
    };
  });

  const familyEstimate = personalTotal + sharedTotal;
  const delta = yellowPool - familyEstimate;
  return {
    yellowPool,
    personalTotal,
    sharedTotal,
    familyEstimate,
    delta,
    shortfall: Math.max(0, -delta),
    perPerson,
  };
}
