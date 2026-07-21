import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq, inArray, sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
  budgetItems,
  checklistItems,
  type CostLine,
  itineraryEvents,
  lodging,
  scenarios,
  tripSettings,
} from "./schema";

/**
 * Round 19 — booked, locked, Friday-to-Friday.
 *
 * Delta confirmation H2UQO8: DL2260 AUS→LAS Fri Aug 7 3:39 PM, DL1837 LAS→AUS
 * Fri Aug 14 5:15 PM. Flights $1,756.28 + protection $140.80 + taxes $254.92
 * = $2,152.00, paid by BeX. The trip is a day shorter than planned, the last
 * night in Vegas no longer exists, and the plan is no longer a decision.
 *
 * The rental SUV is Fri–Fri with airport pickup — grab it right after landing,
 * drop it before the flight home. Same 7 days the $658.65 was quoted for.
 *
 * BeX's airfare gets a real budget line (category `travel`) so she can log the
 * expense herself on Spend — actuals stay empty until she does.
 *
 * And the site stops being a road trip: lodging becomes the booked stays,
 * road-trip checklist items go away, and the land is called Valle everywhere.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const FLY_LINES: CostLine[] = [
  {
    label: "Air Travel — Delta, Booked Fri–Fri: flights $1,756.28 + protection $140.80 + taxes $254.92",
    cents: 215200,
    owner: "bex",
    key: "airfare",
    confidence: "quoted",
  },
  { label: "Checked Bags — 3 at $90", cents: 27000, confidence: "estimate" },
  { label: "Midsize Luxury SUV — Fri–Fri, Airport Pickup", cents: 65865, confidence: "quoted" },
  {
    label: "Austin Airport Uber — One Ride Each Way (All Four)",
    cents: 30000,
    confidence: "estimate",
  },
  {
    label: "Arizona Driving Fuel (Valle + Sedona)",
    cents: 40000,
    confidence: "estimate",
  },
  {
    label: "BW Henderson — Fri Aug 7, the fly-in night",
    cents: 5400,
    owner: "pithya",
    key: "henderson",
    confidence: "rate",
  },
  {
    label: "Sedona — Sat Aug 8 (weekend rate)",
    cents: 20000,
    owner: "pithya",
    key: "sedona",
    confidence: "rate",
  },
  { label: "Sedona — Sun Aug 9", cents: 14400, owner: "pithya", key: "sedona", confidence: "rate" },
  {
    label: "BW Henderson — Mon + Tue, Aug 10–11",
    cents: 10800,
    owner: "pithya",
    key: "henderson",
    confidence: "rate",
  },
  {
    label: "Non-Resort Food — BeX's Share (6 days off-resort)",
    cents: 93750,
    owner: "bex",
    key: "vegas-food-bex",
    confidence: "estimate",
  },
  {
    label: "Non-Resort Food — Amma's Share (6 days off-resort)",
    cents: 31250,
    owner: "amma",
    key: "vegas-food-amma",
    confidence: "estimate",
  },
];

async function main() {
  /* ---------- 1. money ---------- */
  const [fly] = await db.select().from(scenarios).where(eq(scenarios.slug, "fly"));
  if (!fly) throw new Error("missing fly scenario");

  await db
    .update(scenarios)
    .set({
      costLines: FLY_LINES,
      tagline: "Booked — fly in Friday, a red-rock weekend, then the Vegas week",
      travelSummary:
        "Booked · DL2260 AUS→LAS Fri Aug 7, 3:39–4:32 PM · DL1837 LAS→AUS Fri Aug 14, 5:15–10:05 PM",
      pros: [
        "Flights are booked — confirmation H2UQO8",
        "Everyone flies together — zero 15-hour drives",
        "Two full nights in Sedona, not a rushed overnight",
        "Valle horses Saturday, fresh off the plane",
      ],
      cons: [
        "The priciest way to get there — $2,152 of booked airfare",
        "Runs past the yellow-pad budget",
        "Big Saturday: Henderson checkout, Valle, then the drive to Sedona",
        "Friday home flight lands 10:05 PM — late night back in Austin",
      ],
      itineraryOutline: [
        { day: "Fri 7", plan: "Fly in 4:32 PM · pick up the SUV · drive to Henderson" },
        { day: "Sat 8", plan: "Check out · horses at Valle · overnight in Sedona" },
        { day: "Sun 9", plan: "A full, slow day in Sedona · second red-rock night" },
        { day: "Mon 10", plan: "Check out Sedona · Moapa Valley on the drive back · into Henderson" },
        { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
        { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
        { day: "Thu 13", plan: "Luxor day · BeX at the Backstreet Boys, Sphere" },
        { day: "Fri 14", plan: "Check out · return the SUV · fly home 5:15 PM" },
      ],
    })
    .where(eq(scenarios.slug, "fly"));

  // BeX's airfare line — so she can log the $2,152 she paid. Actuals stay empty
  // until she enters the expense herself.
  const [bex] = await sql`select id from travelers where slug = 'bex'`;
  const existing = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.costKey, "airfare"));
  if (existing.length === 0) {
    await db.insert(budgetItems).values({
      travelerId: bex.id as number,
      label: "Air Travel — Delta (Booked)",
      category: "travel",
      yellowPadCents: 0, // airfare was never on anyone's yellow pad
      plannedCents: 215200,
      shared: true,
      costKey: "airfare",
      notes:
        "Booked · H2UQO8 · flights $1,756.28 + trip protection $140.80 + taxes & fees $254.92 — BeX covered it",
    });
  }

  // the decision is made
  await db.update(tripSettings).set({ lockedScenarioId: fly.id, lockedAt: new Date() });

  /* ---------- 2. itinerary — the booked Fri–Fri trip ---------- */
  // Fri Aug 7: land 4:32 → SUV → drive to Henderson (no Vegas uber)
  await db
    .update(itineraryEvents)
    .set({
      description: "Booked — Delta DL2260, all four of us. Wheels down 4:32 PM.",
    })
    .where(eq(itineraryEvents.title, "Fly AUS → LAS"));
  await db
    .update(itineraryEvents)
    .set({
      time: "5:00 PM",
      title: "Pick Up the Rental SUV",
      description: "Midsize luxury SUV at Harry Reid, Fri–Fri — loaded and rolling by 6.",
      location: "Harry Reid Intl, Las Vegas",
    })
    .where(eq(itineraryEvents.title, "Uber to Henderson + Crash"));
  await db.insert(itineraryEvents).values({
    date: "2026-08-07",
    sortOrder: 2,
    time: "6:00 PM",
    title: "Drive to Henderson + Crash",
    description: "Twenty minutes to Best Western Henderson on John's rate — settle in, rest up.",
    location: "Henderson, NV",
    theme: "vegas",
    plan: "fly",
  });

  // Sat Aug 8: the SUV is already ours
  await db
    .update(itineraryEvents)
    .set({
      title: "Check Out of Henderson",
      description: "Pack the SUV and point it at Arizona — Valle first, then Sedona.",
      location: "Henderson, NV",
    })
    .where(eq(itineraryEvents.title, "Rent the SUV + Check Out"));

  // Fri Aug 14 is now the travel day home
  await db
    .delete(itineraryEvents)
    .where(
      inArray(itineraryEvents.title, [
        "Last Night — Henderson or Extend the Luxor",
        "Explore More Vegas",
      ]),
    );
  await db.insert(itineraryEvents).values([
    {
      date: "2026-08-14",
      sortOrder: 0,
      time: "11:00 AM",
      title: "Check Out the Luxor",
      description: "Last morning on the Strip — pack up, one more walk through the pyramid.",
      location: "Las Vegas, NV",
      theme: "vegas",
      plan: "fly",
    },
    {
      date: "2026-08-14",
      sortOrder: 1,
      time: "3:00 PM",
      title: "Return the SUV at the Airport",
      description: "Gas it up, drop it at Harry Reid, roll straight to the gate.",
      location: "Harry Reid Intl, Las Vegas",
      theme: "vegas",
      plan: "fly",
    },
  ]);
  await db
    .update(itineraryEvents)
    .set({
      date: "2026-08-14",
      sortOrder: 2,
      description: "Booked — Delta DL1837, 5:15 PM. Lands Austin 10:05 PM, home by midnight.",
    })
    .where(eq(itineraryEvents.title, "Fly LAS → AUS"));

  // the land is called Valle
  await db.execute(dsql`
    update itinerary_events set
      title = replace(replace(title, 'The Land — Horses with Caesar', 'Valle — Horses with Caesar'), 'the land', 'Valle'),
      description = replace(replace(coalesce(description, ''), 'the land in Valle', 'Valle'), 'the land', 'Valle')
  `);

  /* ---------- 3. lodging — the booked stays ---------- */
  await db.delete(lodging);
  await db.insert(lodging).values([
    {
      name: "Best Western Henderson",
      location: "Henderson, NV",
      checkIn: "2026-08-07",
      checkOut: "2026-08-08",
      plannedCents: 5400,
      bookingStatus: "planned",
      theme: "vegas",
      notes: "The fly-in night — land 4:32 PM, drive over in the SUV. John's rate, ~$54.",
    },
    {
      name: "Best Western — Red Rock Balcony",
      location: "Sedona, AZ",
      checkIn: "2026-08-08",
      checkOut: "2026-08-10",
      plannedCents: 34400,
      bookingStatus: "planned",
      theme: "desert",
      notes: "Two red-rock nights — Saturday at the $200 weekend rate, Sunday $144 on John's rate.",
    },
    {
      name: "Best Western Henderson",
      location: "Henderson, NV",
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      plannedCents: 10800,
      bookingStatus: "planned",
      theme: "vegas",
      notes: "Home base for Old Vegas + Fremont — two nights on John's rate.",
    },
    {
      name: "Luxor — All-Inclusive Experience",
      location: "Las Vegas Strip",
      checkIn: "2026-08-12",
      checkOut: "2026-08-14",
      plannedCents: 72096,
      bookingStatus: "planned",
      cancelBy: "2026-08-09",
      theme: "vegas",
      notes:
        "Pyramid Premier Two Queen × 2 · all-inclusive covers breakfast, lunch & dinner Wed–Fri · fully BeX's.",
    },
  ]);

  /* ---------- 4. checklist — no more road trip ---------- */
  await db
    .delete(checklistItems)
    .where(
      inArray(checklistItems.label, [
        "Decide: Forester vs Rental vs Fly", // decided — it's booked
        "Oil Change + Tire Check on the Forester",
        "Ice Packs + Ice for the Cooler",
        "Road-Lunch Fixings",
        "Groceries for the Drive Home (Amma-Safe)",
        "Re-Ice + Repack the Cooler",
        "Gas Up for the 5 AM Start",
      ]),
    );
  await db
    .update(checklistItems)
    .set({ label: "Confirm Caesar Meetup at Valle (Sat Aug 8)" })
    .where(eq(checklistItems.label, "Confirm Caesar Meetup at the Land (Sun Aug 9)"));
  await db
    .update(checklistItems)
    .set({ label: "Confirm John's BW Rate — Henderson + Sedona" })
    .where(eq(checklistItems.label, "Confirm John's BW Rate — Flagstaff, Henderson, Sedona"));
  await db
    .update(checklistItems)
    .set({ label: "Pick Up Amma on the Way to the Airport (Fri Aug 7)" })
    .where(eq(checklistItems.label, "Pick Up Amma from City View at the Park (Fri Aug 7)"));
  await db
    .update(checklistItems)
    .set({ label: "Chargers + Cables" })
    .where(eq(checklistItems.label, "Chargers + Car Mounts"));
  await db.insert(checklistItems).values([
    {
      list: "pre-trip",
      label: "Delta Check-In Opens Thu Aug 6 (H2UQO8)",
      sortOrder: 0,
      note: "24 hours before the 3:39 PM flight",
    },
    {
      list: "pre-trip",
      label: "Book the Midsize SUV — Fri–Fri, Airport Pickup",
      sortOrder: 1,
    },
    {
      list: "sedona-restock",
      label: "Amma-Safe Grocery Run in Sedona",
      sortOrder: 0,
    },
    {
      list: "sedona-restock",
      label: "Fuel Up the SUV Before the Moapa Drive",
      sortOrder: 1,
    },
  ]);

  console.log("Round 19 migration complete.");
  const total = FLY_LINES.reduce((a, l) => a + l.cents, 0);
  console.log(`  fly cost lines $${(total / 100).toFixed(2)} · locked scenario ${fly.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
