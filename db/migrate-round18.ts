import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { type CostLine, scenarios } from "./schema";

/**
 * Round 18 — air travel is a two-airline decision, and we're taking 3 bags not 4.
 *
 *   Delta      base fare $2,066 + 3 bags @ $90 ($270) + insurance $139 = $2,475
 *   Frontier   flight & bags included $2,250 + insurance $50           = $2,300
 *
 * Delta is the budgeted number with Frontier carried as the alternative, so the
 * $175 saving is visible without pretending the choice is made.
 *
 * Kept as ONE line rather than three so the alternative compares like for like —
 * Frontier bundles bags into its fare, so a per-line Delta-vs-Frontier comparison
 * would be measuring different things. The itemization lives in the label.
 *
 * This replaces the old fare + taxes + 4-bag lines. Group totals throughout.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const AIR_TRAVEL: CostLine = {
  label: "Air Travel — Delta: fare $2,066 + 3 bags $270 + insurance $139",
  cents: 247500,
  confidence: "quoted",
  alternative: {
    label: "or Frontier — $2,250 flight & bags, $50 insurance",
    cents: 230000,
  },
};

async function main() {
  const [row] = await db.select().from(scenarios).where(eq(scenarios.slug, "fly"));
  if (!row) throw new Error("missing fly scenario");

  // drop the old airfare/taxes/bags lines — this one line supersedes all three
  const kept = row.costLines.filter(
    (l) => !/^Delta /.test(l.label) && !/^Checked Bags/.test(l.label),
  );
  const lines = [AIR_TRAVEL, ...kept];
  await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.slug, "fly"));

  await db
    .update(scenarios)
    .set({
      cons: [
        "By far the priciest plan — $2,475 to fly before anything else",
        "The only plan that runs past the yellow-pad budget",
        "Big Saturday: rental pickup, the land, then the drive to Sedona",
        "Last night is still a choice — Henderson at $54 or extend the Luxor for $200",
      ],
    })
    .where(eq(scenarios.slug, "fly"));

  console.log(`  Delta $2,475 · Frontier alt $2,300 (saves $175)`);
  console.log(`  fly total $${(lines.reduce((a, l) => a + l.cents, 0) / 100).toFixed(2)}`);
  console.log("Round 18 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
