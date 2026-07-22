import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { and, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, travelers } from "./schema";

/**
 * Round 25 — correct the OG yellow-pad reference totals to what the family
 * actually planned: Pithya $1,650 · BeX $3,250 · Amma $2,050 · Shy $450
 * ($7,400). These are `yellowPadCents` only — the "what we first planned"
 * reference on Finances. They do NOT touch real booked costs or the trip total
 * ($8,502.87). Since the reference shows per-person totals (never per line), the
 * deltas land on each person's Spending Money line.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// slug -> the new yellowPadCents for that person's Spending Money line
// (current Spending yellowPad is 25000 for each; deltas: Pithya +100, BeX +250, Amma +400)
const SPENDING_PAD: Record<string, number> = {
  pithya: 35000, // 1,550 -> 1,650
  bex: 50000, // 3,000 -> 3,250
  amma: 65000, // 1,650 -> 2,050
  // shy stays $450 (unchanged)
};

async function main() {
  for (const [slug, cents] of Object.entries(SPENDING_PAD)) {
    const [t] = await db.select().from(travelers).where(eq(travelers.slug, slug));
    if (!t) throw new Error(`missing traveler ${slug}`);
    const res = await db
      .update(budgetItems)
      .set({ yellowPadCents: cents })
      .where(and(eq(budgetItems.travelerId, t.id), eq(budgetItems.label, "Spending Money")))
      .returning();
    console.log(`  ${slug.padEnd(7)} Spending yellow pad → $${(cents / 100).toFixed(0)} (${res.length} row)`);
  }
  console.log("Round 25 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
