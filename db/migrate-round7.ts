/**
 * Round 7 one-off migration (2026-07-17):
 * - Replace the "fly" plan (was Saturday-in + a long day-trip to the land) with the
 *   Friday-night-in routing: fly in Fri Aug 7, land + Sedona the first weekend, full
 *   Vegas week, fly home Sat Aug 15. New $1,348 (×4) Delta fare.
 * - Retag the Aug 14 Sedona events so they no longer apply to the fly plan.
 * - Rename Bex → BeX everywhere in the data.
 * Preserves votes, checklists, expenses, lodging, trip settings.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { itineraryEvents, scenarios } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Dropping old fly-plan events…");
  await db.delete(itineraryEvents).where(eq(itineraryEvents.plan, "fly"));

  console.log("Retagging Aug 14 Sedona events off the fly plan…");
  await sql.query(
    "UPDATE itinerary_events SET plan = 'drive hybrid' WHERE plan = 'all' AND title IN ('Check Out → Drive to Sedona', 'Slide Rock + Downtown Sedona')",
  );

  console.log("Inserting new Friday-night fly events…");
  await db.insert(itineraryEvents).values([
    { date: "2026-08-07", sortOrder: 0, time: "3:39 PM", title: "Fly AUS → LAS", description: "Delta nonstop — all four of us, wheels down at 4:32 PM.", location: "Austin-Bergstrom → Harry Reid Intl", theme: "vegas", plan: "fly" },
    { date: "2026-08-07", sortOrder: 1, time: "Evening", title: "Uber to Henderson + Crash", description: "Straight to Best Western Henderson on John's rate — settle in and rest up.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 0, time: "Morning", title: "Rent the SUV + Check Out", description: "Pick up the midsize luxury SUV at Harry Reid and check out of Henderson for the weekend loop.", location: "Harry Reid Intl, Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 1, time: "Midday", title: "The Land — Horses with Caesar", description: "~3.5 hours out to the land in Valle — ride and hang with Caesar's crew.", location: "287 S Victoria Dr, Valle, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-08", sortOrder: 2, time: "Evening", title: "Drive to Sedona + Overnight", description: "On to Sedona for the night — Best Western Red Rock, John's rate.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-09", sortOrder: 0, time: "Morning", title: "Explore All of Sedona", description: "Slide Rock, the red rocks, downtown shops — take our time before rolling out.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-09", sortOrder: 1, time: "Afternoon", title: "Drive Back to Vegas + Check In", description: "~4.5 hours back to Vegas — check into Best Western Henderson for the week.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-14", sortOrder: 0, time: "Morning", title: "Check Out the Luxor → Henderson", description: "Last stretch — back to Best Western Henderson for the final night.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-14", sortOrder: 1, time: "Afternoon", title: "Explore More Vegas", description: "Open day — more Vegas, or maybe meet Shy's aunt. Undecided, and that's fine.", location: "Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-15", sortOrder: 0, time: "5:15 PM", title: "Fly LAS → AUS", description: "Delta nonstop home — lands 10:05 PM, in bed by midnight.", location: "Harry Reid Intl → Austin-Bergstrom", theme: "vegas", plan: "fly" },
  ]);

  console.log("Rewriting the fly scenario…");
  await db
    .update(scenarios)
    .set({
      name: "Fly · Friday Night In",
      tagline: "All four fly in Friday — Sedona first, then a full Vegas week",
      travelSummary: "All fly · AUS→LAS Fri Aug 7, 3:39–4:32 PM · LAS→AUS Sat Aug 15, 5:15–10:05 PM",
      emoji: "✈️",
      pros: [
        "Everyone flies together — zero 15-hour drives",
        "Land + Sedona knocked out the first weekend, fresh off the plane",
        "A full, unhurried Vegas week Monday through Friday",
        "Midsize luxury SUV for the whole trip",
      ],
      cons: [
        "Priciest plan — four weekend round-trip flights",
        "Saturday is a big day: rental, the land, then the drive to Sedona",
        "Friday's last Vegas day is still up in the air",
        "Checked bags + airport Ubers on top of the fares",
      ],
      costLines: [
        { label: "Delta Round Trip × 4 (Fri–Sat)", cents: 134800 },
        { label: "Midsize Luxury SUV, Sat–Sat (quoted)", cents: 65865 },
        { label: "Checked Bags (×4)", cents: 36000, estimate: true },
        { label: "Sedona Night (BW Red Rock, John's Rate)", cents: 14400 },
        { label: "Airport Ubers", cents: 12000, estimate: true },
        { label: "Land + Sedona Fuel", cents: 12000, estimate: true },
      ],
      itineraryOutline: [
        { day: "Fri 7", plan: "Fly in 4:32 PM · Uber to Henderson · crash" },
        { day: "Sat 8", plan: "Rent the SUV · check out · horses at the land · drive to Sedona overnight" },
        { day: "Sun 9", plan: "Explore Sedona · drive back to Vegas · check into BW Henderson" },
        { day: "Mon 10", plan: "Moapa Valley day" },
        { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
        { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
        { day: "Thu 13", plan: "Luxor day · BeX at the Backstreet Boys, Sphere" },
        { day: "Fri 14", plan: "Check out Luxor · explore more Vegas (maybe Shy's aunt — TBD)" },
        { day: "Sat 15", plan: "Fly home 5:15 PM" },
      ],
    })
    .where(eq(scenarios.slug, "fly"));

  console.log("Renaming Bex → BeX across the data…");
  await sql.query("UPDATE travelers SET name = 'BeX' WHERE slug = 'bex'");
  await sql.query("UPDATE itinerary_events SET description = replace(description, 'Bex', 'BeX') WHERE description LIKE '%Bex%'");
  await sql.query("UPDATE budget_items SET notes = replace(notes, 'Bex', 'BeX') WHERE notes LIKE '%Bex%'");
  await sql.query("UPDATE checklist_items SET assignee = 'BeX' WHERE assignee = 'Bex'");
  await sql.query("UPDATE scenarios SET itinerary_outline = replace(itinerary_outline::text, 'Bex', 'BeX')::jsonb WHERE itinerary_outline::text LIKE '%Bex%'");

  console.log("Round 7 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
