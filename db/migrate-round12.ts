import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { type CostLine, scenarios } from "./schema";

/**
 * Round 12 — Delta fares went up. $1,700 for all four round trip WITH seat
 * selection (was $1,348). That figure does NOT absorb checked bags, which stay a
 * separate line at $90 per person = $360 for all four.
 *
 * Group totals as always — $1,700 is the whole family's airfare, not per head.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const NEW_FARE = 170000;
const OLD_FARE_LABEL = /^Delta Round Trip/;

async function main() {
  for (const slug of ["fly", "flyb"]) {
    const [row] = await db.select().from(scenarios).where(eq(scenarios.slug, slug));
    if (!row) throw new Error(`missing scenario ${slug}`);

    const lines: CostLine[] = row.costLines.map((l) =>
      OLD_FARE_LABEL.test(l.label)
        ? {
            ...l,
            label: "Delta Round Trip × 4, Seats Included (Fri–Sat)",
            cents: NEW_FARE,
            confidence: "quoted" as const,
          }
        : l.label.startsWith("Checked Bags")
          ? { ...l, label: "Checked Bags (All Four · $90 Each)" }
          : l,
    );

    await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.slug, slug));
    const total = lines.reduce((a, l) => a + l.cents, 0);
    console.log(`  ${slug.padEnd(6)} $${(total / 100).toFixed(2)}`);
  }
  console.log("Round 12 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
