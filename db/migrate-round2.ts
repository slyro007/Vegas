/**
 * Round 2 one-off migration (2026-07-17):
 * - travelers: real family emails
 * - budget_items: replaced with the corrected per-person structure
 * - scenarios: fly plan reworked around the real rental quote + outlines for all three
 * - itinerary: Backstreet Boys at the Sphere (Bex, Thu Aug 13) + Title Case titles
 * - lodging/checklists: Title Case labels, preserving done-state and bookings
 * Votes, checklist done-state, and lodging statuses are untouched.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  budgetItems,
  checklistItems,
  expenses,
  itineraryEvents,
  lodging,
  scenarios,
  travelers,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Updating traveler emails…");
  const emailBySlug: Record<string, string> = {
    pithya: "dansol6@gmail.com",
    bex: "solomonrebecca@gmail.com",
    shy: "shyannejohnsoncano@gmail.com",
    amma: "kamakshi63@gmail.com",
  };
  const rows = await db.select().from(travelers);
  const idBySlug: Record<string, number> = {};
  for (const t of rows) {
    idBySlug[t.slug] = t.id;
    await db
      .update(travelers)
      .set({ clerkEmail: emailBySlug[t.slug] })
      .where(eq(travelers.id, t.id));
  }

  console.log("Replacing budget items…");
  await db.delete(expenses);
  await db.delete(budgetItems);
  await db.insert(budgetItems).values([
    // Pithya
    {
      travelerId: idBySlug.pithya,
      label: "All Best Western Stays",
      category: "lodging",
      plannedCents: 90000,
      actualCents: 42850,
      notes:
        "Flagstaff $84.50 + Henderson ~$200 + Sedona $144 — all on John's employee rate",
    },
    {
      travelerId: idBySlug.pithya,
      label: "Caesar / Ranch Adventure",
      category: "experience",
      plannedCents: 40000,
      notes: "~4 hours of horses at the land in Valle · Amma is backup if Pithya can't cover it",
    },
    {
      travelerId: idBySlug.pithya,
      label: "Spend Money",
      category: "misc",
      plannedCents: 25000,
    },
    // Bex
    {
      travelerId: idBySlug.bex,
      label: "Luxor All-Inclusive",
      category: "experience",
      plannedCents: 36048,
      actualCents: 36048,
      notes:
        "Pyramid Premier Two Queen, Aug 12–14 · $170.60 due now + $189.88 at resort · vouchers worth up to $300 · was penciled at $1,600 — using the real number",
    },
    {
      travelerId: idBySlug.bex,
      label: "Non-Resort / Non-Road-Trip Food",
      category: "food",
      plannedCents: 75000,
      notes: "Everything that isn't the resort or the road: Vegas meals, snacks, coffee runs",
    },
    {
      travelerId: idBySlug.bex,
      label: "Wynn Buffet",
      category: "food",
      plannedCents: 40000,
      notes: "~$100 a head — Bex covers all four of us",
    },
    {
      travelerId: idBySlug.bex,
      label: "Spend Money",
      category: "misc",
      plannedCents: 25000,
    },
    // Amma
    {
      travelerId: idBySlug.amma,
      label: "Road Trip Gas",
      category: "gas",
      plannedCents: 60000,
    },
    {
      travelerId: idBySlug.amma,
      label: "Road Trip Food",
      category: "food",
      plannedCents: 40000,
    },
    {
      travelerId: idBySlug.amma,
      label: "Non-Resort / Non-Road-Trip Food",
      category: "food",
      plannedCents: 25000,
    },
    {
      travelerId: idBySlug.amma,
      label: "Caesar Gifts",
      category: "gifts",
      plannedCents: 15000,
    },
    {
      travelerId: idBySlug.amma,
      label: "Spend Money",
      category: "misc",
      plannedCents: 25000,
    },
    // Shy
    {
      travelerId: idBySlug.shy,
      label: "Pre-Vegas Trip",
      category: "misc",
      plannedCents: 20000,
    },
    {
      travelerId: idBySlug.shy,
      label: "Spend Money",
      category: "misc",
      plannedCents: 25000,
      notes: "Amma is backup if Shy can't cover it",
    },
  ]);

  console.log("Reworking scenarios…");
  const roadOutline = [
    { day: "Fri 7", plan: "Pick up Amma · pack the cooler" },
    { day: "Sat 8", plan: "5 AM depart Muir Lake · ~15 hr · Flagstaff late night" },
    { day: "Sun 9", plan: "Breakfast · horses with Caesar at the land · on to Vegas" },
    { day: "Mon 10", plan: "Moapa Valley day" },
    { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
    { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
    { day: "Thu 13", plan: "Luxor day · Bex at the Backstreet Boys, Sphere" },
    { day: "Fri 14", plan: "Drive to Sedona · Slide Rock + shops · grocery restock" },
    { day: "Sat 15", plan: "5 AM depart Sedona" },
    { day: "Sun 16", plan: "Home at Muir Lake, early morning" },
  ];

  await db
    .update(scenarios)
    .set({ itineraryOutline: roadOutline })
    .where(eq(scenarios.slug, "forester"));
  await db
    .update(scenarios)
    .set({ itineraryOutline: roadOutline })
    .where(eq(scenarios.slug, "rental-suv"));

  await db
    .update(scenarios)
    .set({
      name: "Fly · Delta Nonstop",
      tagline: "Fly in, rent the SUV, keep every stop",
      travelSummary: "AUS→LAS Aug 8, 3:39–4:32 PM · LAS→AUS Aug 15, 5:15–10:05 PM",
      emoji: "✈️",
      pros: [
        "~3 hours in the air instead of ~15 on the road, each way",
        "Still hits everything — the land, Moapa Valley, and Sedona",
        "BMW X5-class rental with unlimited miles for the whole week",
        "Land Saturday evening with energy to spare",
      ],
      cons: [
        "Long day trip to the land (~7 hr round trip driving)",
        "Packing light — one checked bag for all four of us",
        "No packed cooler from home — Amma's groceries get bought in Vegas",
        "Airport logistics × 4 people",
      ],
      costLines: [
        { label: "Delta Round Trip × 4", cents: 94800 },
        { label: "Midsize Luxury SUV, Sat–Sat (quoted, unlimited miles)", cents: 65865 },
        { label: "Checked Bag", cents: 9000 },
        { label: "Extra Vegas Night (Sat Aug 8)", cents: 5400, estimate: true },
        { label: "Sedona Night (BW Red Rock, John's Rate)", cents: 14400 },
        { label: "Day-Trip Gas", cents: 18000, estimate: true },
      ],
      itineraryOutline: [
        { day: "Sat 8", plan: "Land 4:32 PM · pick up the SUV 5 PM · check in Henderson" },
        { day: "Sun 9", plan: "Early day trip to the land — horses with Caesar" },
        { day: "Mon 10", plan: "Moapa Valley day" },
        { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
        { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
        { day: "Thu 13", plan: "Luxor day · Bex at the Backstreet Boys, Sphere" },
        { day: "Fri 14", plan: "Drive to Sedona (~4.5 hr) · Slide Rock + downtown · overnight" },
        { day: "Sat 15", plan: "Drive back · rental due 2:30 PM · fly out 5:15 PM" },
      ],
    })
    .where(eq(scenarios.slug, "fly"));

  console.log("Adding the Sphere night + Title Case itinerary titles…");
  const existingSphere = await db
    .select()
    .from(itineraryEvents)
    .where(eq(itineraryEvents.title, "Backstreet Boys at the Sphere"));
  if (existingSphere.length === 0) {
    await db.insert(itineraryEvents).values({
      date: "2026-08-13",
      sortOrder: 1,
      time: "Night",
      title: "Backstreet Boys at the Sphere",
      description: "Bex's solo night 🎤 — everyone else holds down the Luxor.",
      location: "Sphere, Las Vegas",
      theme: "vegas",
    });
  }

  const titleFixes: [string, string][] = [
    ["Pick up Amma", "Pick Up Amma"],
    ["Check in at Flagstaff", "Check In at Flagstaff"],
    ["The land — horses with Caesar", "The Land — Horses with Caesar"],
    ["Drive to Vegas + check in", "Drive to Vegas + Check In"],
    ["Moapa Valley day", "Moapa Valley Day"],
    ["Check out → Wynn Buffet", "Check Out → Wynn Buffet"],
    ["Check in: Luxor all-inclusive", "Check In: Luxor All-Inclusive"],
    ["All-inclusive day at the Luxor", "All-Inclusive Day at the Luxor"],
    ["Check out → drive to Sedona", "Check Out → Drive to Sedona"],
    ["Slide Rock + downtown Sedona", "Slide Rock + Downtown Sedona"],
    ["Dinner, groceries, pack the cooler", "Dinner, Groceries, Pack the Cooler"],
  ];
  for (const [from, to] of titleFixes) {
    await db.update(itineraryEvents).set({ title: to }).where(eq(itineraryEvents.title, from));
  }

  console.log("Title Case lodging + checklist labels…");
  await db
    .update(lodging)
    .set({ name: "Best Western — Red Rock Balcony" })
    .where(eq(lodging.name, "Best Western — Red Rock balcony"));

  const labelFixes: [string, string][] = [
    ["Decide: Forester vs rental vs fly", "Decide: Forester vs Rental vs Fly"],
    ["Confirm Caesar meetup at the land (Sun Aug 9)", "Confirm Caesar Meetup at the Land (Sun Aug 9)"],
    ["Book Luxor all-inclusive", "Book Luxor All-Inclusive"],
    ["Confirm John's BW rate — Flagstaff, Henderson, Sedona", "Confirm John's BW Rate — Flagstaff, Henderson, Sedona"],
    ["Oil change + tire check on the Forester", "Oil Change + Tire Check on the Forester"],
    ["Pick up Amma from City View at the Park (Fri Aug 7)", "Pick Up Amma from City View at the Park (Fri Aug 7)"],
    ["Download offline maps for the desert stretches", "Download Offline Maps for the Desert Stretches"],
    ["Amma's staples", "Amma's Staples"],
    ["Fruit + easy snacks", "Fruit + Easy Snacks"],
    ["Water flats", "Water Flats"],
    ["Ice packs + ice for the cooler", "Ice Packs + Ice for the Cooler"],
    ["Breakfast items", "Breakfast Items"],
    ["Road-lunch fixings", "Road-Lunch Fixings"],
    ["Groceries for the drive home (Amma-safe)", "Groceries for the Drive Home (Amma-Safe)"],
    ["Re-ice + repack the cooler", "Re-Ice + Repack the Cooler"],
    ["Gas up for the 5 AM start", "Gas Up for the 5 AM Start"],
    ["Chargers + car mounts", "Chargers + Car Mounts"],
    ["Swimsuits — Luxor pool + Slide Rock", "Swimsuits — Luxor Pool + Slide Rock"],
    ["Water shoes for Slide Rock", "Water Shoes for Slide Rock"],
    ["Sun hats + sunscreen", "Sun Hats + Sunscreen"],
    ["Amma's meds", "Amma's Meds"],
    ["Jeans + closed shoes for the horses", "Jeans + Closed Shoes for the Horses"],
  ];
  for (const [from, to] of labelFixes) {
    await db.update(checklistItems).set({ label: to }).where(eq(checklistItems.label, from));
  }

  console.log("Round 2 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
