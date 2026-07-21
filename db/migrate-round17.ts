import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { type CostLine, scenarios } from "./schema";

/**
 * Round 17 — the real Delta checkout, replacing the $1,700 estimate.
 *
 * From the Express Checkout page, 4 passengers, Main Classic nonstop
 * (DL2260 AUS→LAS Fri Aug 7 3:39–4:32pm · DL1837 LAS→AUS Sat Aug 15 5:15–10:05pm):
 *
 *     Flights                 $1,681.88
 *     Taxes, Fees & Charges     $249.36
 *     Amount Due              $1,931.24
 *
 * Itemized as two lines so it reads exactly like the quote. Both are `quoted` —
 * this is a real checkout total, not a guess. Main Classic includes seat
 * selection but NOT checked bags, so the $360 bag line stays separate.
 *
 * Group totals as always: $1,931.24 is all four passengers, not per head.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const AIRFARE: CostLine[] = [
  {
    label: "Delta Round Trip, All Four — Main Classic (DL2260 / DL1837)",
    cents: 168188,
    confidence: "quoted",
  },
  {
    label: "Delta Taxes, Fees & Charges",
    cents: 24936,
    confidence: "quoted",
  },
];

async function main() {
  const [row] = await db.select().from(scenarios).where(eq(scenarios.slug, "fly"));
  if (!row) throw new Error("missing fly scenario");

  const kept = row.costLines.filter((l) => !/^Delta /.test(l.label));
  const lines = [...AIRFARE, ...kept];
  await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.slug, "fly"));

  // the cons line quoted the old estimate
  await db
    .update(scenarios)
    .set({
      cons: [
        "By far the priciest plan — $1,931.24 of airfare before anything else",
        "The only plan that runs past the yellow-pad budget",
        "Big Saturday: rental pickup, the land, then the drive to Sedona",
        "Last night is still a choice — Henderson at $54 or extend the Luxor for $200",
      ],
    })
    .where(eq(scenarios.slug, "fly"));

  const total = lines.reduce((a, l) => a + l.cents, 0);
  console.log(`  airfare $${((168188 + 24936) / 100).toFixed(2)} (quoted)`);
  console.log(`  fly total $${(total / 100).toFixed(2)}`);
  console.log("Round 17 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
