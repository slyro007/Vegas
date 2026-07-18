/**
 * Round 3 one-off migration (2026-07-17):
 * - itinerary_events: tag drive-only events, insert the fly-plan events
 * - Luxor doubled to 4 people ($360.48 × 2 rooms) in budget_items + lodging
 * - trip_settings row seeded (unlocked)
 * Preserves votes, checklists, expenses, lodging statuses.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, inArray } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, itineraryEvents, lodging, tripSettings } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Tagging drive-only events…");
  await db
    .update(itineraryEvents)
    .set({ plan: "drive" })
    .where(
      inArray(itineraryEvents.title, [
        "Depart Muir Lake",
        "Check In at Flagstaff",
        "Breakfast in Flagstaff",
        "The Land — Horses with Caesar",
        "Drive to Vegas + Check In",
        "Dinner, Groceries, Pack the Cooler",
        "Depart Sedona",
        "Home — Muir Lake",
      ]),
    );

  console.log("Inserting fly-plan events…");
  const existing = await db
    .select()
    .from(itineraryEvents)
    .where(eq(itineraryEvents.plan, "fly"));
  if (existing.length === 0) {
    await db.insert(itineraryEvents).values([
      {
        date: "2026-08-08",
        sortOrder: 0,
        time: "3:39 PM",
        title: "Fly AUS → LAS",
        description: "Delta nonstop — wheels down in Vegas at 4:32 PM with the whole evening ahead.",
        location: "Austin-Bergstrom → Harry Reid Intl",
        theme: "vegas",
        plan: "fly",
      },
      {
        date: "2026-08-08",
        sortOrder: 1,
        time: "5:00 PM",
        title: "Pick Up the Rental SUV",
        description: "Midsize Luxury SUV — BMW X5-class, unlimited miles for the week.",
        location: "Harry Reid Intl, Las Vegas",
        theme: "vegas",
        plan: "fly",
      },
      {
        date: "2026-08-08",
        sortOrder: 2,
        time: "Evening",
        title: "Check In at Henderson",
        description: "Best Western Henderson — 4 nights, Sat → Wed, via John's rate.",
        location: "Henderson, NV",
        theme: "vegas",
        plan: "fly",
      },
      {
        date: "2026-08-09",
        sortOrder: 0,
        time: "Early",
        title: "Day Trip: The Land — Horses with Caesar",
        description:
          "~3.5 hours each way in the SUV. Ride with Caesar's crew, hang at the land, roll back to Vegas as late as we want.",
        location: "287 S Victoria Dr, Valle, AZ",
        theme: "desert",
        plan: "fly",
      },
      {
        date: "2026-08-14",
        sortOrder: 2,
        time: "Evening",
        title: "Dinner in Sedona",
        description: "Red-rock dinner — no cooler haul this time, we fly home tomorrow.",
        location: "Sedona, AZ",
        theme: "desert",
        plan: "fly",
      },
      {
        date: "2026-08-15",
        sortOrder: 0,
        time: "Morning",
        title: "Drive Back to Vegas",
        description: "~4.5 hours from Sedona back to Harry Reid.",
        location: "Sedona → Las Vegas",
        theme: "desert",
        plan: "fly",
      },
      {
        date: "2026-08-15",
        sortOrder: 1,
        time: "2:30 PM",
        title: "Return the Rental",
        description: "SUV back at Harry Reid by 2:30 PM sharp.",
        location: "Harry Reid Intl, Las Vegas",
        theme: "vegas",
        plan: "fly",
      },
      {
        date: "2026-08-15",
        sortOrder: 2,
        time: "5:15 PM",
        title: "Fly LAS → AUS",
        description: "Delta nonstop home — lands 10:05 PM, in bed by midnight.",
        location: "Harry Reid Intl → Austin-Bergstrom",
        theme: "vegas",
        plan: "fly",
      },
    ]);
  }

  console.log("Doubling the Luxor for 4 people…");
  const luxorNote =
    "$360.48 per room × 2 rooms — the deal is priced for 2 guests and we're 4 · Pyramid Premier Two Queen, Aug 12–14 · free cancellation until Aug 9 · vouchers worth up to $300 per room";
  await db
    .update(budgetItems)
    .set({ plannedCents: 72096, actualCents: 72096, notes: luxorNote })
    .where(eq(budgetItems.label, "Luxor All-Inclusive"));
  await db
    .update(lodging)
    .set({ plannedCents: 72096, actualCents: 72096, notes: luxorNote })
    .where(eq(lodging.name, "Luxor — All-Inclusive Experience"));

  console.log("Seeding trip settings…");
  const settings = await db.select().from(tripSettings);
  if (settings.length === 0) {
    await db.insert(tripSettings).values({ lockedScenarioId: null, lockedAt: null });
  }

  console.log("Round 3 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
