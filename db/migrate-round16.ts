import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { scenarios } from "./schema";

/**
 * Round 16 — the fly plan still argued against plans that no longer exist.
 * It inherited its pros/cons from the two-variant era: "not a one-night dash",
 * "the priciest fly option", "one fewer Best Western night" all compared it to
 * the deleted one-night routing. Rewritten to stand on its own, and the last
 * night is no longer "up in the air" — it's a priced either/or now.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  await db
    .update(scenarios)
    .set({
      tagline: "Fly in Friday, a red-rock weekend, then a full Vegas week",
      pros: [
        "Everyone flies together — zero 15-hour drives",
        "Two full nights in Sedona, not a rushed overnight",
        "Land + horses still happen, fresh off the plane Saturday",
        "Moapa Valley folds into the Monday drive back",
      ],
      cons: [
        "By far the priciest plan — $1,700 of airfare before anything else",
        "The only plan that runs past the yellow-pad budget",
        "Big Saturday: rental pickup, the land, then the drive to Sedona",
        "Last night is still a choice — Henderson at $54 or extend the Luxor for $200",
      ],
    })
    .where(eq(scenarios.slug, "fly"));

  console.log("  fly pros/cons rewritten");
  console.log("Round 16 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
