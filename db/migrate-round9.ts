/**
 * Round 9 one-off migration (2026-07-18):
 * - budget_items: add yellow_pad_cents + shared columns; rebuild every line to the
 *   yellow-pad itemization (yellow = original plan, planned = refined/real number).
 * - trip_settings: add shortfall_note.
 * - Itinerary: real clock times on every event; a second fly routing ("flyb",
 *   2 Sedona nights + Moapa on the Monday drive back); explicit Friday-night wording.
 * Preserves votes, checklists, lodging, trip settings (no expenses logged yet).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, itineraryEvents, scenarios, travelers } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Adding columns…");
  await sql.query("ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS yellow_pad_cents integer NOT NULL DEFAULT 0");
  await sql.query("ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false");
  await sql.query("ALTER TABLE trip_settings ADD COLUMN IF NOT EXISTS shortfall_note text");

  console.log("Rebuilding budget lines to the yellow pad…");
  const ppl = Object.fromEntries(
    (await db.select().from(travelers)).map((t) => [t.slug, t.id]),
  );
  await db.delete(budgetItems);
  // [traveler, label, category, yellow, planned, shared, notes?]
  const S = true;
  const rows: [string, string, string, number, number, boolean, string?][] = [
    // Pithya
    ["pithya", "Flagstaff Hotel (Sat)", "lodging", 15000, 8450, S],
    ["pithya", "Caesar Ranch Adventure", "experience", 40000, 40000, false, "~4 hours of horses at the land in Valle"],
    ["pithya", "BW Henderson (Sun–Wed)", "lodging", 50000, 20000, S, "~$54/night on John's rate"],
    ["pithya", "Sedona Hotel (Fri)", "lodging", 25000, 14400, S],
    ["pithya", "Spending Money", "misc", 25000, 25000, false],
    // BeX
    ["bex", "Luxor / Excalibur All-Inclusive", "lodging", 160000, 72096, S, "All-inclusive — covers all breakfast, lunch & dinner Wed–Fri · real deal came in at $720.96 for 2 rooms"],
    ["bex", "Wynn Buffet (All Four)", "food", 40000, 40000, false, "~$100 a head — BeX covers everyone"],
    ["bex", "Vegas Meals — Mon, Tue & Sedona Dinner", "food", 80000, 80000, false],
    ["bex", "Spending Money", "misc", 25000, 25000, false],
    // Amma
    ["amma", "Road Trip Gas", "gas", 60000, 60000, S],
    ["amma", "Road Trip Food", "food", 40000, 40000, S],
    ["amma", "Vegas Meals — Sunday", "food", 20000, 20000, false],
    ["amma", "Caesar Gifts", "gifts", 15000, 15000, false],
    ["amma", "Spending Money", "misc", 25000, 25000, false],
    // Shy
    ["shy", "Pre-Vegas Trip", "misc", 20000, 20000, false],
    ["shy", "Spending Money", "misc", 25000, 25000, false],
  ];
  await db.insert(budgetItems).values(
    rows.map(([slug, label, category, yellowPadCents, plannedCents, shared, notes]) => ({
      travelerId: ppl[slug],
      label,
      category,
      yellowPadCents,
      plannedCents,
      shared,
      notes: notes ?? null,
    })),
  );

  console.log("Putting real clock times on every event…");
  const times: [string, string, string][] = [
    // [date, title, time]
    ["2026-08-10", "Moapa Valley Day", "10:00 AM"],
    ["2026-08-11", "Old Vegas + Fremont Street", "1:00 PM"],
    ["2026-08-12", "Check Out → Wynn Buffet", "10:30 AM"],
    ["2026-08-12", "Check In: Luxor All-Inclusive", "3:00 PM"],
    ["2026-08-13", "All-Inclusive Day at the Luxor", "10:00 AM"],
    ["2026-08-13", "Backstreet Boys at the Sphere", "8:00 PM"],
    ["2026-08-07", "Pick Up Amma", "6:00 PM"],
    ["2026-08-08", "Depart Muir Lake", "5:00 AM"],
    ["2026-08-08", "Check In at Flagstaff", "8:30 PM"],
    ["2026-08-09", "Breakfast in Flagstaff", "8:00 AM"],
    ["2026-08-09", "The Land — Horses with Caesar", "11:00 AM"],
    ["2026-08-09", "Drive to Vegas + Check In", "5:00 PM"],
    ["2026-08-14", "Check Out → Drive to Sedona", "9:00 AM"],
    ["2026-08-14", "Slide Rock + Downtown Sedona", "2:00 PM"],
    ["2026-08-14", "Dinner, Groceries, Pack the Cooler", "6:30 PM"],
    ["2026-08-15", "Depart Sedona", "5:00 AM"],
    ["2026-08-16", "Home — Muir Lake", "1:00 AM"],
    ["2026-08-07", "Fly AUS → LAS", "3:39 PM"],
    ["2026-08-07", "Uber to Henderson + Crash", "5:30 PM"],
    ["2026-08-08", "Rent the SUV + Check Out", "9:00 AM"],
    ["2026-08-08", "The Land — Horses with Caesar", "12:30 PM"],
    ["2026-08-08", "Drive to Sedona + Overnight", "6:00 PM"],
    ["2026-08-09", "Explore All of Sedona", "9:00 AM"],
    ["2026-08-09", "Drive Back to Vegas + Check In", "3:00 PM"],
    ["2026-08-14", "Explore More Vegas", "2:00 PM"],
    ["2026-08-15", "Fly LAS → AUS", "5:15 PM"],
    ["2026-08-07", "Pack the Car — Party of Three", "6:00 PM"],
    ["2026-08-09", "Amma Flies AUS → LAS", "3:39 PM"],
    ["2026-08-09", "Amma Ubers to the Hotel", "5:00 PM"],
    ["2026-08-14", "Amma Flies Home", "5:15 PM"],
  ];
  for (const [date, title, time] of times) {
    await sql.query("UPDATE itinerary_events SET time = $1 WHERE date = $2 AND title = $3", [time, date, title]);
  }

  console.log("Wiring up the second fly routing (flyb)…");
  // Moapa as a standalone day belongs to drive/fly/hybrid; flyb does Moapa on the drive back
  await sql.query("UPDATE itinerary_events SET plan = 'drive fly hybrid' WHERE plan = 'all' AND title = 'Moapa Valley Day'");
  // shared fly events also power flyb
  await sql.query(
    "UPDATE itinerary_events SET plan = 'fly flyb' WHERE plan = 'fly' AND title IN ('Fly AUS → LAS','Uber to Henderson + Crash','Rent the SUV + Check Out','The Land — Horses with Caesar','Drive to Sedona + Overnight','Explore More Vegas','Fly LAS → AUS')",
  );
  // Friday-night wording (shared by both fly routings)
  await sql.query(
    "UPDATE itinerary_events SET plan = 'fly flyb', title = 'Last Night — Henderson or Extend the Luxor', time = '11:00 AM', description = 'One more Vegas night before Saturday''s flight: check out of the Luxor back to Best Western Henderson on John''s rate, or see if the Luxor/Excalibur will extend a night. TBD.' WHERE plan = 'fly' AND title = 'Check Out the Luxor → Henderson'",
  );
  // flyb-only divergence: 2 Sedona nights + Moapa on the Monday drive back
  const existingFlyb = await db.select().from(itineraryEvents).where(eq(itineraryEvents.plan, "flyb"));
  if (existingFlyb.length === 0) {
    await db.insert(itineraryEvents).values([
      { date: "2026-08-09", sortOrder: 0, time: "9:00 AM", title: "Full Day in Sedona", description: "A slow second day in the red rocks — Slide Rock, the vortexes, downtown — and a second night at Best Western Red Rock.", location: "Sedona, AZ", theme: "desert", plan: "flyb" },
      { date: "2026-08-10", sortOrder: 0, time: "8:00 AM", title: "Check Out Sedona + Drive Back", description: "Pack up and point the SUV back toward Nevada (~4.5 hr).", location: "Sedona → Moapa Valley", theme: "desert", plan: "flyb" },
      { date: "2026-08-10", sortOrder: 1, time: "12:30 PM", title: "Moapa Valley on the Way", description: "Break the drive in Shy's hometown before the last push to Vegas.", location: "Moapa Valley, NV", theme: "vegas", plan: "flyb" },
      { date: "2026-08-10", sortOrder: 2, time: "6:00 PM", title: "Check Into Henderson", description: "Best Western Henderson on John's rate — home base for the Vegas week.", location: "Henderson, NV", theme: "vegas", plan: "flyb" },
    ]);
  }

  console.log("Refreshing the fly scenario Friday-night outline…");
  await sql.query(
    "UPDATE scenarios SET itinerary_outline = replace(itinerary_outline::text, 'Check out Luxor · explore more Vegas (maybe Shy''s aunt — TBD)', 'Last night: Henderson or extend the Luxor/Excalibur · explore more Vegas (maybe Shy''s aunt)')::jsonb WHERE slug = 'fly'",
  );

  console.log("Round 9 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
