import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { itineraryEvents } from "./schema";

/**
 * Round 14 — the drive plan gets a Forester / Rental SUV sub-toggle.
 *
 * The two road-trip plans share every day of the trip; what the rental actually
 * changes is the logistics on either end — pick the SUV up before the 5 AM
 * departure, drop it back after we roll in. Those two events are tagged `driveb`
 * and the rental variant renders `drive` + `driveb` together, so the shared days
 * needed no retagging.
 *
 * Times are estimates, consistent with how the rest of the timeline is built.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const RENTAL_EVENTS = [
  {
    date: "2026-08-07",
    sortOrder: -1,
    time: "4:00 PM",
    title: "Pick Up the Rental SUV",
    description:
      "Enterprise full-size SUV for the whole trip — grab it before Amma's pickup so it's loaded and ready for the 5 AM haul.",
    location: "Enterprise, Cedar Park",
    theme: "desert",
    plan: "driveb",
  },
  {
    date: "2026-08-16",
    sortOrder: 1,
    time: "11:00 AM",
    title: "Return the Rental SUV",
    description: "Unload, sleep in, then drop the SUV back. Check the fuel level before you go.",
    location: "Enterprise, Cedar Park",
    theme: "desert",
    plan: "driveb",
  },
];

async function main() {
  for (const e of RENTAL_EVENTS) {
    const [existing] = await db
      .select()
      .from(itineraryEvents)
      .where(eq(itineraryEvents.title, e.title));
    if (existing) {
      await db.update(itineraryEvents).set(e).where(eq(itineraryEvents.id, existing.id));
      console.log(`  updated: ${e.title}`);
    } else {
      await db.insert(itineraryEvents).values(e);
      console.log(`  added:   ${e.title}`);
    }
  }
  console.log("Round 14 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
