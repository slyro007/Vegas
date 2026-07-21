import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { estimateForScenario } from "../lib/estimate";
import { budgetItems, scenarios, travelers } from "./schema";

/**
 * Guards the bucket model. Two identities must hold for EVERY scenario — a failure
 * means a cost line's owner/key tag is wrong, which would silently misreport whose
 * money is whose:
 *
 *   1. $6,650 + route change − deal savings === personal lines + cost lines
 *   2. each person's left-in-bucket === their itemized savings (deal + released)
 *
 * Also gates the group-total convention: fly must be $3,480.65, not $4,380.65
 * (which would mean the Austin uber got multiplied by four).
 */
const db = drizzle(neon(process.env.DATABASE_URL!));
const f = (c: number) => (c < 0 ? "-$" : "$") + (Math.abs(c) / 100).toFixed(2);

const EXPECTED_AVAILABLE: Record<string, number> = {
  forester: 135054,
  "rental-suv": 70054,
  fly: -139361,
};

async function main() {
  const [ts, items, scens] = await Promise.all([
    db.select().from(travelers),
    db.select().from(budgetItems),
    db.select().from(scenarios),
  ]);

  let fails = 0;
  const fail = (...msg: unknown[]) => {
    fails++;
    console.error("  FAIL:", ...msg);
  };

  const personal = items.filter((i) => !i.costKey).reduce((a, i) => a + i.plannedCents, 0);

  for (const s of scens) {
    const e = estimateForScenario(ts, items, s);
    const clines = s.costLines.reduce((a, l) => a + l.cents, 0);
    const expected = personal + clines;

    if (665000 + e.routeChange - e.dealSavings !== expected) {
      fail(s.slug, "identity 1: $6,650 + route − deals !==", f(expected));
    }
    if (e.realTotal !== expected) fail(s.slug, "realTotal", f(e.realTotal), "!==", f(expected));

    for (const p of e.perPerson) {
      const attributed = e.savings
        .filter((v) => v.travelerId === p.traveler.id)
        .reduce((a, v) => a + v.cents, 0);
      if (p.left !== attributed) {
        fail(s.slug, `identity 2: ${p.traveler.name} left ${f(p.left)} !== ${f(attributed)}`);
      }
    }

    const want = EXPECTED_AVAILABLE[s.slug];
    if (want !== undefined && e.available !== want) {
      fail(s.slug, "available", f(e.available), "expected", f(want));
    }

    // group-total convention: no line may be scaled by traveler count
    if (s.slug === "fly" && clines !== 517265) {
      fail("fly cost lines", f(clines), "expected $5,172.65 — did the uber or fare get ×4?");
    }
    if (scens.length !== 3) fail("expected exactly 3 scenarios, got", scens.length);

    console.log(
      s.slug.padEnd(16),
      "real",
      f(e.realTotal).padStart(9),
      (e.available >= 0 ? " SAVES " : " SHORT ") + f(Math.abs(e.available)).padEnd(10),
      "| freed",
      f(e.freed).padStart(9),
      "pool",
      f(e.poolDraw).padStart(9),
      "| hotels",
      f(e.hotels).padStart(8),
      "getThere",
      f(e.gettingThere).padStart(9),
    );
    console.log(
      "                 ",
      e.perPerson.map((p) => `${p.traveler.name} ${f(p.left)} left`).join(" · "),
    );
  }

  console.log(fails ? `\n${fails} FAILURE(S)` : "\nAll identities hold across every scenario.");
  if (fails) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
