import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { and, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, travelers } from "./schema";

/** Insert a Pithya budget line only if one with that label doesn't already exist. */
async function ensureLine(
  db: ReturnType<typeof drizzle>,
  pithyaId: number,
  line: { label: string; plannedCents: number; yellowPadCents: number; notes: string | null },
) {
  const [existing] = await db
    .select()
    .from(budgetItems)
    .where(and(eq(budgetItems.travelerId, pithyaId), eq(budgetItems.label, line.label)));
  if (existing) {
    console.log(`  exists:  ${line.label}`);
    return;
  }
  await db.insert(budgetItems).values({
    travelerId: pithyaId,
    label: line.label,
    category: "lodging",
    yellowPadCents: line.yellowPadCents,
    plannedCents: line.plannedCents,
    costKey: null,
    shared: false,
    notes: line.notes,
  });
  console.log(`  added:   ${line.label} · $${(line.plannedCents / 100).toFixed(2)}`);
}

/**
 * Round 24 — Pithya's lodging lines mirror the booked itinerary.
 *
 * The two lines carried drive-era labels that contradicted the trip:
 * "Sedona Hotel (Fri)" (Sedona is Sat+Sun) and "BW Henderson (Sun–Wed)"
 * (Henderson is the Fri fly-in night + Mon+Tue). Same money — $162 Henderson +
 * $344 Sedona = $506 — just split into the three real Best Western stays, in
 * itinerary order, matching the `lodging` table rows.
 *
 * OG yellow pad preserved: the retired lines held 500 + 250 = 750; the new three
 * carry 0 / 250 / 500 so Pithya's yellowPadCents still sums to $1,550.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const NEW_LINES = [
  {
    label: "BW Henderson — Fri Aug 7 (Fly-In Night)",
    plannedCents: 5400,
    yellowPadCents: 0,
    notes: "Land 4:32, drive over in the SUV · $54, John's rate",
  },
  {
    label: "Sedona — Sat + Sun, Aug 8–9",
    plannedCents: 34400,
    yellowPadCents: 25000,
    notes: "Sat $200 weekend rate + Sun $144 · BW Red Rock, John's rate",
  },
  {
    label: "BW Henderson — Mon + Tue, Aug 10–11",
    plannedCents: 10800,
    yellowPadCents: 50000,
    notes: "Home base for Old Vegas · $54/night, John's rate",
  },
];

async function main() {
  const [pithya] = await db.select().from(travelers).where(eq(travelers.slug, "pithya"));
  if (!pithya) throw new Error("missing Pithya");

  for (const stale of ["Sedona Hotel (Fri)", "BW Henderson (Sun–Wed)"]) {
    await db
      .delete(budgetItems)
      .where(and(eq(budgetItems.travelerId, pithya.id), eq(budgetItems.label, stale)));
    console.log(`  removed: ${stale}`);
  }

  for (const line of NEW_LINES) {
    await ensureLine(db, pithya.id, line);
  }

  // Restore the OG-budget Flagstaff night ($150) as a dormant line — deleted in
  // an earlier round, which had dropped the yellow-pad reference to $6,500. It's
  // hidden from the ledger (planned 0) like Amma's released road-trip lines, and
  // only feeds the "what we first planned" reference so Pithya reads $1,550 again.
  await ensureLine(db, pithya.id, {
    label: "Flagstaff Hotel (Sat)",
    plannedCents: 0,
    yellowPadCents: 15000,
    notes: null,
  });

  console.log("Round 24 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
