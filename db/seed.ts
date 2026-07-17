import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  budgetItems,
  checklistItems,
  itineraryEvents,
  lodging,
  scenarios,
  travelers,
  votes,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Clearing existing data…");
  await db.delete(votes);
  await db.delete(budgetItems);
  await db.delete(checklistItems);
  await db.delete(itineraryEvents);
  await db.delete(lodging);
  await db.delete(scenarios);
  await db.delete(travelers);

  console.log("Seeding travelers…");
  const [pithya, shy, bex, amma] = await db
    .insert(travelers)
    .values([
      {
        slug: "pithya",
        name: "Pithya",
        clerkEmail: "danny@longhornhouses.com",
        budgetTotalCents: 165000,
        nonNegotiableCents: 125000,
        color: "#ca6c34",
        emoji: "🤠",
      },
      {
        slug: "shy",
        name: "Shy",
        budgetTotalCents: 45000,
        nonNegotiableCents: 20000,
        color: "#b88931",
        emoji: "🌙",
      },
      {
        slug: "bex",
        name: "Bex",
        budgetTotalCents: 325000,
        color: "#d34f8c",
        emoji: "🎰",
      },
      {
        slug: "amma",
        name: "Amma",
        budgetTotalCents: 205000,
        color: "#4da06b",
        emoji: "🌸",
      },
    ])
    .returning();

  console.log("Seeding budget items…");
  await db.insert(budgetItems).values([
    // Amma
    { travelerId: amma.id, label: "Road trip gas", category: "gas", plannedCents: 60000 },
    { travelerId: amma.id, label: "Road trip food", category: "food", plannedCents: 40000 },
    { travelerId: amma.id, label: "Caesar gifts", category: "gifts", plannedCents: 15000 },
    { travelerId: amma.id, label: "Misc spend", category: "misc", plannedCents: 25000 },
    // Bex
    {
      travelerId: bex.id,
      label: "Luxor all-inclusive experience",
      category: "experience",
      plannedCents: 160000,
      actualCents: 36048,
      notes:
        "Pyramid Premier Two Queen, Aug 12–14 · $170.60 due now + $189.88 at resort · free cancellation until Aug 9 · includes vouchers worth up to $300",
    },
    { travelerId: bex.id, label: "Wynn buffet", category: "food", plannedCents: 40000 },
    { travelerId: bex.id, label: "Misc spend", category: "misc", plannedCents: 25000 },
    // Pithya
    {
      travelerId: pithya.id,
      label: "Flagstaff hotel (Aiden by Best Western)",
      category: "lodging",
      plannedCents: 15000,
      actualCents: 8450,
      notes: "2 queens, night of Aug 8 → 9 · John's employee rate",
    },
    {
      travelerId: pithya.id,
      label: "Caesar / Ranch Adventure",
      category: "experience",
      plannedCents: 40000,
      notes: "~4 hours of horses at the land in Valle · Amma is backup on this one",
    },
    {
      travelerId: pithya.id,
      label: "Vegas Best Western, Sun–Wed",
      category: "lodging",
      plannedCents: 50000,
      actualCents: 20000,
      notes: "Henderson · 2 queens · ~$54/night via John — ~$200 for the whole stay",
    },
    {
      travelerId: pithya.id,
      label: "Sedona Best Western (Red Rock balcony)",
      category: "lodging",
      plannedCents: 25000,
      actualCents: 14400,
      notes: "2 queens with the balcony · John's rate",
    },
    { travelerId: pithya.id, label: "Sunday night food", category: "food", plannedCents: 20000 },
    { travelerId: pithya.id, label: "Monday food", category: "food", plannedCents: 40000 },
    { travelerId: pithya.id, label: "Tuesday food", category: "food", plannedCents: 20000 },
    { travelerId: pithya.id, label: "Sedona Friday dinner", category: "food", plannedCents: 10000 },
    { travelerId: pithya.id, label: "Misc spend", category: "misc", plannedCents: 25000 },
    // Shy
    { travelerId: shy.id, label: "Pre-Vegas trip", category: "misc", plannedCents: 20000 },
    { travelerId: shy.id, label: "Misc spend", category: "misc", plannedCents: 25000 },
  ]);

  console.log("Seeding lodging…");
  await db.insert(lodging).values([
    {
      name: "Aiden by Best Western",
      location: "Flagstaff, AZ",
      checkIn: "2026-08-08",
      checkOut: "2026-08-09",
      plannedCents: 15000,
      actualCents: 8450,
      bookingStatus: "planned",
      theme: "desert",
      notes: "2 queens · super-late-night check-in after the drive from Muir Lake · John's rate",
    },
    {
      name: "Best Western Henderson",
      location: "Henderson, NV",
      checkIn: "2026-08-09",
      checkOut: "2026-08-12",
      plannedCents: 50000,
      actualCents: 20000,
      bookingStatus: "planned",
      theme: "vegas",
      notes: "2 queens · ~$54/night via John — ~$200-ish for the whole thing",
    },
    {
      name: "Luxor — All-Inclusive Experience",
      location: "Las Vegas Strip",
      checkIn: "2026-08-12",
      checkOut: "2026-08-14",
      plannedCents: 160000,
      actualCents: 36048,
      bookingStatus: "planned",
      cancelBy: "2026-08-09",
      theme: "vegas",
      notes:
        "Pyramid Premier Two Queen · $170.60 due now + $189.88 at resort · vouchers worth up to $300 · budgeted $1,600 — actual is way lower",
    },
    {
      name: "Best Western — Red Rock balcony",
      location: "Sedona, AZ",
      checkIn: "2026-08-14",
      checkOut: "2026-08-15",
      plannedCents: 25000,
      actualCents: 14400,
      bookingStatus: "planned",
      theme: "desert",
      notes: "2 queens with the balcony · John's rate",
    },
  ]);

  console.log("Seeding itinerary…");
  await db.insert(itineraryEvents).values([
    {
      date: "2026-08-07",
      sortOrder: 0,
      time: "Evening",
      title: "Pick up Amma",
      description: "Amma arrives in the evening — grab her from her apartment, final packing, load the cooler.",
      location: "City View at the Park",
      theme: "desert",
    },
    {
      date: "2026-08-08",
      sortOrder: 0,
      time: "5:00 AM",
      title: "Depart Muir Lake",
      description: "The big haul west — about 15 hours. Rotate drivers, gas-and-snack stops only.",
      location: "Muir Lake, TX",
      theme: "desert",
    },
    {
      date: "2026-08-08",
      sortOrder: 1,
      time: "Late night",
      title: "Check in at Flagstaff",
      description: "Aiden by Best Western · 2 queens · crash hard.",
      location: "Flagstaff, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-09",
      sortOrder: 0,
      time: "Morning",
      title: "Breakfast in Flagstaff",
      description: "Fuel up before the land.",
      location: "Flagstaff, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-09",
      sortOrder: 1,
      time: "Midday",
      title: "The land — horses with Caesar",
      description: "About 4 hours riding and hanging with Caesar's horse-adventure crew on our land.",
      location: "287 S Victoria Dr, Valle, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-09",
      sortOrder: 2,
      time: "Evening",
      title: "Drive to Vegas + check in",
      description: "Best Western Henderson · 2 queens via John's rate.",
      location: "Henderson, NV",
      theme: "vegas",
    },
    {
      date: "2026-08-10",
      sortOrder: 0,
      title: "Moapa Valley day",
      description: "Day trip to Shy's hometown.",
      location: "Moapa Valley, NV",
      theme: "vegas",
    },
    {
      date: "2026-08-11",
      sortOrder: 0,
      title: "Old Vegas + Fremont Street",
      description: "Downtown, no agenda — roam anywhere.",
      location: "Downtown Las Vegas",
      theme: "vegas",
    },
    {
      date: "2026-08-12",
      sortOrder: 0,
      time: "Morning",
      title: "Check out → Wynn Buffet",
      description: "The legendary buffet, budgeted and non-negotiable.",
      location: "Wynn Las Vegas",
      theme: "vegas",
    },
    {
      date: "2026-08-12",
      sortOrder: 1,
      time: "Afternoon",
      title: "Check in: Luxor all-inclusive",
      description: "Pyramid Premier Two Queen · vouchers worth up to $300.",
      location: "Luxor, Las Vegas Strip",
      theme: "vegas",
    },
    {
      date: "2026-08-13",
      sortOrder: 0,
      title: "All-inclusive day at the Luxor",
      description: "Pool, vouchers, wander the Strip. Zero obligations.",
      location: "Luxor, Las Vegas Strip",
      theme: "vegas",
    },
    {
      date: "2026-08-14",
      sortOrder: 0,
      time: "Morning",
      title: "Check out → drive to Sedona",
      description: "About 4.5 hours back into red-rock country.",
      location: "Sedona, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-14",
      sortOrder: 1,
      time: "Afternoon",
      title: "Slide Rock + downtown Sedona",
      description: "Slide Rock State Park, then the shops downtown.",
      location: "Sedona, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-14",
      sortOrder: 2,
      time: "Evening",
      title: "Dinner, groceries, pack the cooler",
      description: "Amma-safe grocery run and a fully packed cooler for the drive home.",
      location: "Sedona, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-15",
      sortOrder: 0,
      time: "5:00 AM",
      title: "Depart Sedona",
      description: "5–6 AM start for the long haul home.",
      location: "Sedona, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-16",
      sortOrder: 0,
      time: "Early AM",
      title: "Home — Muir Lake",
      description: "Roll in super early Sunday morning. Trip complete.",
      location: "Muir Lake, TX",
      theme: "desert",
    },
  ]);

  console.log("Seeding scenarios…");
  await db.insert(scenarios).values([
    {
      slug: "forester",
      name: "Road Trip · Our Forester",
      tagline: "The current plan — take the 2019 Subaru",
      travelSummary: "~15 hr drive each way · ~30 hr total behind the wheel",
      emoji: "🚙",
      pros: [
        "Full itinerary: the land, Caesar's horses, Flagstaff AND Sedona",
        "Cooler packed for Amma's dietary needs the whole way",
        "No rental cost — the car is already ours",
        "Total flexibility on stops and timing",
      ],
      cons: [
        "~30 hours of driving round trip",
        "Two 5 AM departure days",
        "Four adults + luggage + cooler is snug in the Forester",
        "Puts ~2,400 miles on the 2019 Forester",
      ],
      costLines: [
        { label: "Gas (round trip)", cents: 60000 },
        { label: "Road trip food", cents: 40000 },
        { label: "Flagstaff night", cents: 8450 },
        { label: "Sedona night", cents: 14400 },
      ],
    },
    {
      slug: "rental-suv",
      name: "Road Trip · Rental SUV",
      tagline: "Same trip, way more room",
      travelSummary: "~15 hr drive each way · ~30 hr total behind the wheel",
      emoji: "🚐",
      pros: [
        "Way more room for 4 people, luggage, and the cooler",
        "Zero wear on the Forester",
        "Newer vehicle — peace of mind in the desert heat",
        "Keeps the full itinerary, land visit and all",
      ],
      cons: [
        "+$650 over taking our own car",
        "Pickup and drop-off logistics on a 5 AM departure day",
        "Still ~30 hours of driving",
      ],
      costLines: [
        { label: "Enterprise full-size SUV (whole trip)", cents: 65000, estimate: true },
        { label: "Gas (round trip)", cents: 60000, estimate: true },
        { label: "Road trip food", cents: 40000 },
        { label: "Flagstaff night", cents: 8450 },
        { label: "Sedona night", cents: 14400 },
      ],
    },
    {
      slug: "fly",
      name: "Fly · Delta Nonstop",
      tagline: "Trade 30 hours of road for 6 in the air",
      travelSummary: "AUS→LAS Aug 8, 3:39–4:32 PM · LAS→AUS Aug 15, 5:15–10:05 PM",
      emoji: "✈️",
      pros: [
        "~3 hours each way instead of ~15",
        "No exhausting overnight drives — easiest on everyone",
        "Land Saturday evening with energy to spare",
        "Full week in Vegas, Aug 8–15",
      ],
      cons: [
        "Skips the land + horses with Caesar",
        "Skips Flagstaff and Sedona entirely",
        "No packed cooler — Amma's food needs get harder",
        "Still need a rental car for Moapa Valley + getting around",
        "Bags and airport logistics × 4 people",
      ],
      costLines: [
        { label: "Delta round trip × 4", cents: 94800 },
        { label: "Vegas rental car (week)", cents: 35000, estimate: true },
        { label: "Checked bags × 4", cents: 28000, estimate: true },
        { label: "Airport parking / rides", cents: 10000, estimate: true },
      ],
    },
  ]);

  console.log("Seeding checklists…");
  await db.insert(checklistItems).values([
    // pre-trip
    { list: "pre-trip", sortOrder: 0, label: "Decide: Forester vs rental vs fly", note: "Vote on the Scenarios page!" },
    { list: "pre-trip", sortOrder: 1, label: "Confirm Caesar meetup at the land (Sun Aug 9)", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 2, label: "Book Luxor all-inclusive", assignee: "Bex", note: "Free cancellation until Aug 9" },
    { list: "pre-trip", sortOrder: 3, label: "Confirm John's BW rate — Flagstaff, Henderson, Sedona", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 4, label: "Oil change + tire check on the Forester", note: "Skip if we rent or fly" },
    { list: "pre-trip", sortOrder: 5, label: "Pick up Amma from City View at the Park (Fri Aug 7)" },
    { list: "pre-trip", sortOrder: 6, label: "Download offline maps for the desert stretches" },
    // groceries (Amma-safe cooler)
    { list: "groceries", sortOrder: 0, label: "Amma's staples", note: "Her list — restrictions for health + age" },
    { list: "groceries", sortOrder: 1, label: "Fruit + easy snacks" },
    { list: "groceries", sortOrder: 2, label: "Water flats" },
    { list: "groceries", sortOrder: 3, label: "Ice packs + ice for the cooler" },
    { list: "groceries", sortOrder: 4, label: "Breakfast items" },
    { list: "groceries", sortOrder: 5, label: "Road-lunch fixings" },
    // sedona-restock
    { list: "sedona-restock", sortOrder: 0, label: "Groceries for the drive home (Amma-safe)", note: "Friday night, Aug 14" },
    { list: "sedona-restock", sortOrder: 1, label: "Re-ice + repack the cooler" },
    { list: "sedona-restock", sortOrder: 2, label: "Gas up for the 5 AM start" },
    // packing
    { list: "packing", sortOrder: 0, label: "Chargers + car mounts" },
    { list: "packing", sortOrder: 1, label: "Swimsuits — Luxor pool + Slide Rock" },
    { list: "packing", sortOrder: 2, label: "Water shoes for Slide Rock" },
    { list: "packing", sortOrder: 3, label: "Sun hats + sunscreen" },
    { list: "packing", sortOrder: 4, label: "Amma's meds" },
    { list: "packing", sortOrder: 5, label: "Jeans + closed shoes for the horses" },
  ]);

  console.log("Seed complete ✅");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
