/**
 * Round 4 one-off migration (2026-07-17):
 * - itinerary_events.plan becomes multi-tag (space-separated):
 *   'both' → 'all' (except "Pick Up Amma" → 'drive fly' — she skips the hybrid road trip),
 *   'drive' → 'drive hybrid' (the trio's road events), 'fly' unchanged.
 * - Insert the three hybrid-only Amma events (flies in Sun Aug 9, Ubers, flies home Fri Aug 14).
 * - Insert the two Split scenarios: hybrid-forester ($1,661.50) + hybrid-rental ($2,311.50).
 * Preserves votes, checklists, expenses, lodging statuses, trip settings.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ne } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { itineraryEvents, scenarios } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Retagging event plans to multi-tag…");
  await db
    .update(itineraryEvents)
    .set({ plan: "drive fly" })
    .where(and(eq(itineraryEvents.plan, "both"), eq(itineraryEvents.title, "Pick Up Amma")));
  await db
    .update(itineraryEvents)
    .set({ plan: "all" })
    .where(and(eq(itineraryEvents.plan, "both"), ne(itineraryEvents.title, "Pick Up Amma")));
  await db.update(itineraryEvents).set({ plan: "drive hybrid" }).where(eq(itineraryEvents.plan, "drive"));

  console.log("Making room for Amma's flights in the day order…");
  await db
    .update(itineraryEvents)
    .set({ sortOrder: 4 })
    .where(eq(itineraryEvents.title, "Drive to Vegas + Check In"));
  // Amma's 5:15 PM departure slots in before the trio's evening in Sedona
  await db
    .update(itineraryEvents)
    .set({ sortOrder: 3 })
    .where(eq(itineraryEvents.title, "Dinner, Groceries, Pack the Cooler"));

  console.log("Inserting hybrid-only events…");
  const existing = await db
    .select()
    .from(itineraryEvents)
    .where(eq(itineraryEvents.plan, "hybrid"));
  if (existing.length === 0) {
    await db.insert(itineraryEvents).values([
      {
        date: "2026-08-07",
        sortOrder: 0,
        time: "Evening",
        title: "Pack the Car — Party of Three",
        description:
          "Final packing at Muir Lake — cooler for three · Amma packs a carry-on for Sunday's flight.",
        location: "Muir Lake, TX",
        theme: "desert",
        plan: "hybrid",
      },
      {
        date: "2026-08-09",
        sortOrder: 2,
        time: "3:39 PM",
        title: "Amma Flies AUS → LAS",
        description:
          "Delta nonstop — wheels down at 4:32 PM, right as the trio rolls in from the land.",
        location: "Austin-Bergstrom → Harry Reid Intl",
        theme: "vegas",
        plan: "hybrid",
      },
      {
        date: "2026-08-09",
        sortOrder: 3,
        time: "5:00 PM",
        title: "Amma Ubers to the Hotel",
        description:
          "Straight from Harry Reid to Best Western Henderson — checked in before the trio pulls up.",
        location: "Henderson, NV",
        theme: "vegas",
        plan: "hybrid",
      },
      {
        date: "2026-08-14",
        sortOrder: 2,
        time: "5:15 PM",
        title: "Amma Flies Home",
        description:
          "Delta nonstop LAS → AUS — lands 10:05 PM, Uber home · the trio drives on to Sedona.",
        location: "Harry Reid Intl → Austin-Bergstrom",
        theme: "vegas",
        plan: "hybrid",
      },
    ]);
  }

  console.log("Inserting the two Split scenarios…");
  const hybridOutline = [
    { day: "Fri 7", plan: "Trio packs the car · cooler prep for three · Amma packs a carry-on" },
    { day: "Sat 8", plan: "Trio departs 5 AM → Flagstaff overnight · Amma home in Austin" },
    { day: "Sun 9", plan: "Trio: horses with Caesar → Vegas · Amma lands 4:32 PM, Ubers to the hotel" },
    { day: "Mon 10", plan: "Moapa Valley day — all four back together" },
    { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
    { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
    { day: "Thu 13", plan: "Luxor day · Bex at the Backstreet Boys, Sphere" },
    { day: "Fri 14", plan: "Amma flies home 5:15 PM · trio drives to Sedona" },
    { day: "Sat 15", plan: "5 AM depart Sedona" },
    { day: "Sun 16", plan: "Trio home at Muir Lake, early morning" },
  ];
  const have = await db.select({ slug: scenarios.slug }).from(scenarios);
  const slugs = new Set(have.map((s) => s.slug));
  const rows = [
    {
      slug: "hybrid-forester",
      name: "Split · Forester + Amma Flies",
      tagline: "The road trip lives on — Amma takes the sky",
      travelSummary: "3 drive ~15 hr each way · Amma flies Sun Aug 9 → Fri Aug 14",
      emoji: "🚙✈️",
      pros: [
        "Amma skips both 15-hour hauls entirely",
        "The road trip still happens — Flagstaff, the land, and Sedona",
        "She lands 4:32 PM Sunday, right as the trio rolls in from the land",
        "Only $353 + Ubers more than the all-drive plan",
      ],
      cons: [
        "Amma travels alone both ways",
        "She misses Flagstaff, the horses, and Sedona",
        "She flies home Friday and skips the Sedona finale",
        "More room in the car, but the cooler only feeds three",
      ],
      costLines: [
        { label: "Gas (Round Trip)", cents: 60000 },
        { label: "Road Trip Food", cents: 40000 },
        { label: "Flagstaff Night", cents: 8450 },
        { label: "Sedona Night", cents: 14400 },
        { label: "Amma's Flight, Sun–Fri (Quoted)", cents: 35300 },
        { label: "Amma's Ubers", cents: 8000, estimate: true },
      ],
      itineraryOutline: hybridOutline,
    },
    {
      slug: "hybrid-rental",
      name: "Split · Rental + Amma Flies",
      tagline: "Same split, way more room for the trio",
      travelSummary: "3 drive ~15 hr each way · Amma flies Sun Aug 9 → Fri Aug 14",
      emoji: "🚐✈️",
      pros: [
        "Amma skips both 15-hour hauls entirely",
        "Rental SUV gives the trio real stretch-out room",
        "Zero wear on the Forester",
        "Full road itinerary for the trio — land, Flagstaff, Sedona",
      ],
      cons: [
        "Amma travels alone both ways",
        "She misses Flagstaff, the horses, and Sedona",
        "+$650 for the rental on top of her flight",
        "Pickup and drop-off logistics on a 5 AM departure day",
      ],
      costLines: [
        { label: "Enterprise Full-Size SUV (Whole Trip)", cents: 65000, estimate: true },
        { label: "Gas (Round Trip)", cents: 60000, estimate: true },
        { label: "Road Trip Food", cents: 40000 },
        { label: "Flagstaff Night", cents: 8450 },
        { label: "Sedona Night", cents: 14400 },
        { label: "Amma's Flight, Sun–Fri (Quoted)", cents: 35300 },
        { label: "Amma's Ubers", cents: 8000, estimate: true },
      ],
      itineraryOutline: hybridOutline,
    },
  ].filter((r) => !slugs.has(r.slug));
  if (rows.length > 0) await db.insert(scenarios).values(rows);

  console.log("Round 4 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
