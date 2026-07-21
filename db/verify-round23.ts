import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, expenses, travelers } from "./schema";

/**
 * Guards the booked-trip ledger. Finances/Spend read budget lines + logged
 * payments directly (no scenario engine), so the invariant is simple: the sum
 * of active line costs is the trip total, per-column totals are what each person
 * (and The Crew) covers, and logged payments never exceed the total.
 */
const db = drizzle(neon(process.env.DATABASE_URL!));
const f = (c: number) => "$" + (c / 100).toFixed(2);

const EXPECTED_COLUMN: Record<string, number> = {
  BeX: 455572,
  Pithya: 115600,
  Amma: 71250,
  Shy: 45000,
  "The Crew": 162865,
};
const EXPECTED_TOTAL = 850287;
const EXPECTED_PAID = 254310;

async function main() {
  const [ts, items, exps] = await Promise.all([
    db.select().from(travelers),
    db.select().from(budgetItems),
    db.select().from(expenses),
  ]);
  const nameById = new Map(ts.map((t) => [t.id, t.name]));

  let fails = 0;
  const fail = (...m: unknown[]) => {
    fails++;
    console.error("  FAIL:", ...m);
  };

  const active = items.filter((i) => i.plannedCents > 0);
  const total = active.reduce((s, i) => s + i.plannedCents, 0);
  const paid = exps.reduce((s, e) => s + e.amountCents, 0);

  const byColumn = new Map<string, number>();
  for (const i of active) {
    const col = i.travelerId === null ? "The Crew" : (nameById.get(i.travelerId) ?? "?");
    byColumn.set(col, (byColumn.get(col) ?? 0) + i.plannedCents);
  }

  for (const [col, want] of Object.entries(EXPECTED_COLUMN)) {
    const got = byColumn.get(col) ?? 0;
    if (got !== want) fail(col, f(got), "expected", f(want));
    else console.log(`  ${col.padEnd(9)} ${f(got)}`);
  }
  if (total !== EXPECTED_TOTAL) fail("trip total", f(total), "expected", f(EXPECTED_TOTAL));
  if (paid !== EXPECTED_PAID) fail("paid", f(paid), "expected", f(EXPECTED_PAID));
  // no line's logged payments should exceed its cost by more than a rounding cent
  for (const i of active) {
    if ((i.actualCents ?? 0) > i.plannedCents + 1) {
      fail(`${i.label}: paid ${f(i.actualCents ?? 0)} > cost ${f(i.plannedCents)}`);
    }
  }

  console.log(
    `\n  Trip total ${f(total)} · paid ${f(paid)} · left ${f(total - paid)}`,
  );
  console.log(fails ? `\n${fails} FAILURE(S)` : "\nLedger reconciles.");
  if (fails) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
