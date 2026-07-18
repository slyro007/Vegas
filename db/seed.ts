/**
 * Full reseed — DESTRUCTIVE: wipes votes, expenses, checklist state, and edits.
 * Reflects the round-2 (2026-07-17) corrected data. For targeted changes prefer
 * a one-off migration like db/migrate-round2.ts.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { inArray } from "drizzle-orm";
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
  tripSettings,
  votes,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Clearing existing data…");
  await db.delete(tripSettings);
  await db.delete(votes);
  await db.delete(expenses);
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
        clerkEmail: "dansol6@gmail.com",
        budgetTotalCents: 165000,
        nonNegotiableCents: 125000,
        color: "#ca6c34",
        emoji: "🤠",
      },
      {
        slug: "shy",
        name: "Shy",
        clerkEmail: "shyannejohnsoncano@gmail.com",
        budgetTotalCents: 45000,
        nonNegotiableCents: 20000,
        color: "#b88931",
        emoji: "🌙",
      },
      {
        slug: "bex",
        name: "BeX",
        clerkEmail: "solomonrebecca@gmail.com",
        budgetTotalCents: 325000,
        color: "#d34f8c",
        emoji: "🎰",
      },
      {
        slug: "amma",
        name: "Amma",
        clerkEmail: "kamakshi63@gmail.com",
        budgetTotalCents: 205000,
        color: "#4da06b",
        emoji: "🌸",
      },
    ])
    .returning();

  console.log("Seeding budget items (yellow pad / projected / shared)…");
  const S = true;
  // [traveler, label, category, yellowPadCents, plannedCents, shared, notes?]
  const budgetRows: [
    typeof pithya,
    string,
    string,
    number,
    number,
    boolean,
    string?,
  ][] = [
    [pithya, "Flagstaff Hotel (Sat)", "lodging", 15000, 8450, S],
    [pithya, "Caesar Ranch Adventure", "experience", 40000, 40000, false, "~4 hours of horses at the land in Valle"],
    [pithya, "BW Henderson (Sun–Wed)", "lodging", 50000, 20000, S, "~$54/night on John's rate"],
    [pithya, "Sedona Hotel (Fri)", "lodging", 25000, 14400, S],
    [pithya, "Spending Money", "misc", 25000, 25000, false],
    [bex, "Luxor / Excalibur All-Inclusive", "lodging", 160000, 72096, S, "All-inclusive — covers all breakfast, lunch & dinner Wed–Fri · real deal came in at $720.96 for 2 rooms"],
    [bex, "Wynn Buffet (All Four)", "food", 40000, 40000, false, "~$100 a head — BeX covers everyone"],
    [bex, "Vegas Meals — Mon, Tue & Sedona Dinner", "food", 80000, 80000, false],
    [bex, "Spending Money", "misc", 25000, 25000, false],
    [amma, "Road Trip Gas", "gas", 60000, 60000, S],
    [amma, "Road Trip Food", "food", 40000, 40000, S],
    [amma, "Vegas Meals — Sunday", "food", 20000, 20000, false],
    [amma, "Caesar Gifts", "gifts", 15000, 15000, false],
    [amma, "Spending Money", "misc", 25000, 25000, false],
    [shy, "Pre-Vegas Trip", "misc", 20000, 20000, false],
    [shy, "Spending Money", "misc", 25000, 25000, false],
  ];
  await db.insert(budgetItems).values(
    budgetRows.map(([t, label, category, yellowPadCents, plannedCents, shared, notes]) => ({
      travelerId: t.id,
      label,
      category,
      yellowPadCents,
      plannedCents,
      shared,
      notes: notes ?? null,
    })),
  );

  console.log("Seeding lodging…");
  await db.insert(lodging).values([
    {
      name: "Aiden by Best Western",
      location: "Flagstaff, AZ",
      checkIn: "2026-08-08",
      checkOut: "2026-08-09",
      plannedCents: 8450,
      bookingStatus: "planned",
      theme: "desert",
      notes: "2 queens · super-late-night check-in after the drive from Muir Lake · John's rate",
    },
    {
      name: "Best Western Henderson",
      location: "Henderson, NV",
      checkIn: "2026-08-09",
      checkOut: "2026-08-12",
      plannedCents: 20000,
      bookingStatus: "planned",
      theme: "vegas",
      notes: "2 queens · ~$54/night via John — ~$200-ish for the whole thing",
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
        "$360.48 per room × 2 rooms — the deal is priced for 2 guests and we're 4 · Pyramid Premier Two Queen, Aug 12–14 · free cancellation until Aug 9 · vouchers worth up to $300 per room",
    },
    {
      name: "Best Western — Red Rock Balcony",
      location: "Sedona, AZ",
      checkIn: "2026-08-14",
      checkOut: "2026-08-15",
      plannedCents: 14400,
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
      title: "Pick Up Amma",
      description:
        "Amma arrives in the evening — grab her from her apartment, final packing, load the cooler.",
      location: "City View at the Park",
      theme: "desert",
      plan: "drive", // fly plan: everyone flies together; hybrid: Amma flies solo
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
      time: "Late Night",
      title: "Check In at Flagstaff",
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
      title: "The Land — Horses with Caesar",
      description: "About 4 hours riding and hanging with Caesar's horse-adventure crew on our land.",
      location: "287 S Victoria Dr, Valle, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-09",
      sortOrder: 4, // 2–3 are Amma's hybrid flight + Uber, which land mid-afternoon
      time: "Evening",
      title: "Drive to Vegas + Check In",
      description: "Best Western Henderson · 2 queens via John's rate.",
      location: "Henderson, NV",
      theme: "vegas",
    },
    {
      date: "2026-08-10",
      sortOrder: 0,
      title: "Moapa Valley Day",
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
      title: "Check Out → Wynn Buffet",
      description: "The legendary buffet, budgeted and non-negotiable.",
      location: "Wynn Las Vegas",
      theme: "vegas",
    },
    {
      date: "2026-08-12",
      sortOrder: 1,
      time: "Afternoon",
      title: "Check In: Luxor All-Inclusive",
      description: "Pyramid Premier Two Queen · vouchers worth up to $300.",
      location: "Luxor, Las Vegas Strip",
      theme: "vegas",
    },
    {
      date: "2026-08-13",
      sortOrder: 0,
      title: "All-Inclusive Day at the Luxor",
      description: "Pool, vouchers, wander the Strip. Zero obligations.",
      location: "Luxor, Las Vegas Strip",
      theme: "vegas",
    },
    {
      date: "2026-08-13",
      sortOrder: 1,
      time: "Night",
      title: "Backstreet Boys at the Sphere",
      description: "BeX's solo night 🎤 — everyone else holds down the Luxor.",
      location: "Sphere, Las Vegas",
      theme: "vegas",
    },
    {
      date: "2026-08-14",
      sortOrder: 0,
      time: "Morning",
      title: "Check Out → Drive to Sedona",
      description: "About 4.5 hours back into red-rock country.",
      location: "Sedona, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-14",
      sortOrder: 1,
      time: "Afternoon",
      title: "Slide Rock + Downtown Sedona",
      description: "Slide Rock State Park, then the shops downtown.",
      location: "Sedona, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-14",
      sortOrder: 3, // 2 is Amma's 5:15 PM hybrid flight home
      time: "Evening",
      title: "Dinner, Groceries, Pack the Cooler",
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

  // plan tags + fly/hybrid events (kept in sync with db/migrate-round3.ts + db/migrate-round4.ts)
  console.log("Tagging plans + fly/hybrid events…");
  await db
    .update(itineraryEvents)
    .set({ plan: "drive hybrid" })
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
        // Sedona at the end belongs to drive + hybrid; the fly plan does Sedona up front
        "Check Out → Drive to Sedona",
        "Slide Rock + Downtown Sedona",
      ]),
    );
  await db.insert(itineraryEvents).values([
    // Fly plan: fly in Friday, land + Sedona the first weekend, full Vegas week, fly home Saturday
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
    { date: "2026-08-07", sortOrder: 0, time: "Evening", title: "Pack the Car — Party of Three", description: "Final packing at Muir Lake — cooler for three · Amma packs a carry-on for Sunday's flight.", location: "Muir Lake, TX", theme: "desert", plan: "hybrid" },
    { date: "2026-08-09", sortOrder: 2, time: "3:39 PM", title: "Amma Flies AUS → LAS", description: "Delta nonstop — wheels down at 4:32 PM, right as the trio rolls in from the land.", location: "Austin-Bergstrom → Harry Reid Intl", theme: "vegas", plan: "hybrid" },
    { date: "2026-08-09", sortOrder: 3, time: "5:00 PM", title: "Amma Ubers to the Hotel", description: "Straight from Harry Reid to Best Western Henderson — checked in before the trio pulls up.", location: "Henderson, NV", theme: "vegas", plan: "hybrid" },
    { date: "2026-08-14", sortOrder: 2, time: "5:15 PM", title: "Amma Flies Home", description: "Delta nonstop LAS → AUS — lands 10:05 PM, Uber home · the trio drives on to Sedona.", location: "Harry Reid Intl → Austin-Bergstrom", theme: "vegas", plan: "hybrid" },
  ]);

  // round 9: real clock times, the fly Friday-night wording, and the flyb variant
  console.log("Timing events + wiring the second fly routing…");
  const eventTimes: [string, string, string][] = [
    ["2026-08-10", "Moapa Valley Day", "10:00 AM"],
    ["2026-08-11", "Old Vegas + Fremont Street", "1:00 PM"],
    ["2026-08-12", "Check Out → Wynn Buffet", "10:30 AM"],
    ["2026-08-12", "Check In: Luxor All-Inclusive", "3:00 PM"],
    ["2026-08-13", "All-Inclusive Day at the Luxor", "10:00 AM"],
    ["2026-08-13", "Backstreet Boys at the Sphere", "8:00 PM"],
    ["2026-08-07", "Pick Up Amma", "6:00 PM"],
    ["2026-08-08", "Check In at Flagstaff", "8:30 PM"],
    ["2026-08-09", "Breakfast in Flagstaff", "8:00 AM"],
    ["2026-08-09", "The Land — Horses with Caesar", "11:00 AM"],
    ["2026-08-09", "Drive to Vegas + Check In", "5:00 PM"],
    ["2026-08-14", "Check Out → Drive to Sedona", "9:00 AM"],
    ["2026-08-14", "Slide Rock + Downtown Sedona", "2:00 PM"],
    ["2026-08-14", "Dinner, Groceries, Pack the Cooler", "6:30 PM"],
    ["2026-08-16", "Home — Muir Lake", "1:00 AM"],
    ["2026-08-07", "Uber to Henderson + Crash", "5:30 PM"],
    ["2026-08-08", "Rent the SUV + Check Out", "9:00 AM"],
    ["2026-08-08", "The Land — Horses with Caesar", "12:30 PM"],
    ["2026-08-08", "Drive to Sedona + Overnight", "6:00 PM"],
    ["2026-08-09", "Explore All of Sedona", "9:00 AM"],
    ["2026-08-09", "Drive Back to Vegas + Check In", "3:00 PM"],
    ["2026-08-14", "Explore More Vegas", "2:00 PM"],
    ["2026-08-07", "Pack the Car — Party of Three", "6:00 PM"],
  ];
  for (const [date, title, time] of eventTimes) {
    await sql.query("UPDATE itinerary_events SET time = $1 WHERE date = $2 AND title = $3", [time, date, title]);
  }
  await sql.query("UPDATE itinerary_events SET plan = 'drive fly hybrid' WHERE plan = 'all' AND title = 'Moapa Valley Day'");
  await sql.query(
    "UPDATE itinerary_events SET plan = 'fly flyb' WHERE plan = 'fly' AND title IN ('Fly AUS → LAS','Uber to Henderson + Crash','Rent the SUV + Check Out','The Land — Horses with Caesar','Drive to Sedona + Overnight','Explore More Vegas','Fly LAS → AUS')",
  );
  await sql.query(
    "UPDATE itinerary_events SET plan = 'fly flyb', title = 'Last Night — Henderson or Extend the Luxor', time = '11:00 AM', description = 'One more Vegas night before Saturday''s flight: check out of the Luxor back to Best Western Henderson on John''s rate, or see if the Luxor/Excalibur will extend a night. TBD.' WHERE plan = 'fly' AND title = 'Check Out the Luxor → Henderson'",
  );
  await db.insert(itineraryEvents).values([
    { date: "2026-08-09", sortOrder: 0, time: "9:00 AM", title: "Full Day in Sedona", description: "A slow second day in the red rocks — Slide Rock, the vortexes, downtown — and a second night at Best Western Red Rock.", location: "Sedona, AZ", theme: "desert", plan: "flyb" },
    { date: "2026-08-10", sortOrder: 0, time: "8:00 AM", title: "Check Out Sedona + Drive Back", description: "Pack up and point the SUV back toward Nevada (~4.5 hr).", location: "Sedona → Moapa Valley", theme: "desert", plan: "flyb" },
    { date: "2026-08-10", sortOrder: 1, time: "12:30 PM", title: "Moapa Valley on the Way", description: "Break the drive in Shy's hometown before the last push to Vegas.", location: "Moapa Valley, NV", theme: "vegas", plan: "flyb" },
    { date: "2026-08-10", sortOrder: 2, time: "6:00 PM", title: "Check Into Henderson", description: "Best Western Henderson on John's rate — home base for the Vegas week.", location: "Henderson, NV", theme: "vegas", plan: "flyb" },
  ]);

  console.log("Seeding trip settings…");
  await db.insert(tripSettings).values({ lockedScenarioId: null, lockedAt: null });

  console.log("Seeding scenarios…");
  const hybridOutline = [
    { day: "Fri 7", plan: "Trio packs the car · cooler prep for three · Amma packs a carry-on" },
    { day: "Sat 8", plan: "Trio departs 5 AM → Flagstaff overnight · Amma home in Austin" },
    { day: "Sun 9", plan: "Trio: horses with Caesar → Vegas · Amma lands 4:32 PM, Ubers to the hotel" },
    { day: "Mon 10", plan: "Moapa Valley day — all four back together" },
    { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
    { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
    { day: "Thu 13", plan: "Luxor day · BeX at the Backstreet Boys, Sphere" },
    { day: "Fri 14", plan: "Amma flies home 5:15 PM · trio drives to Sedona" },
    { day: "Sat 15", plan: "5 AM depart Sedona" },
    { day: "Sun 16", plan: "Trio home at Muir Lake, early morning" },
  ];
  const roadOutline = [
    { day: "Fri 7", plan: "Pick up Amma · pack the cooler" },
    { day: "Sat 8", plan: "5 AM depart Muir Lake · ~15 hr · Flagstaff late night" },
    { day: "Sun 9", plan: "Breakfast · horses with Caesar at the land · on to Vegas" },
    { day: "Mon 10", plan: "Moapa Valley day" },
    { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
    { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
    { day: "Thu 13", plan: "Luxor day · BeX at the Backstreet Boys, Sphere" },
    { day: "Fri 14", plan: "Drive to Sedona · Slide Rock + shops · grocery restock" },
    { day: "Sat 15", plan: "5 AM depart Sedona" },
    { day: "Sun 16", plan: "Home at Muir Lake, early morning" },
  ];
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
        { label: "Gas (Round Trip)", cents: 60000 },
        { label: "Road Trip Food", cents: 40000 },
        { label: "Flagstaff Night", cents: 8450 },
        { label: "Sedona Night", cents: 14400 },
        { label: "BW Henderson (Vegas Base)", cents: 20000 },
        { label: "Luxor All-Inclusive (2 Rooms)", cents: 72096 },
      ],
      itineraryOutline: roadOutline,
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
        { label: "Enterprise Full-Size SUV (Whole Trip)", cents: 65000, estimate: true },
        { label: "Gas (Round Trip)", cents: 60000, estimate: true },
        { label: "Road Trip Food", cents: 40000 },
        { label: "Flagstaff Night", cents: 8450 },
        { label: "Sedona Night", cents: 14400 },
        { label: "BW Henderson (Vegas Base)", cents: 20000 },
        { label: "Luxor All-Inclusive (2 Rooms)", cents: 72096 },
      ],
      itineraryOutline: roadOutline,
    },
    {
      slug: "fly",
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
        { label: "BW Henderson (5 Vegas Nights)", cents: 27000 },
        { label: "Luxor All-Inclusive (2 Rooms)", cents: 72096 },
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
    },
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
        { label: "BW Henderson (Vegas Base)", cents: 20000 },
        { label: "Luxor All-Inclusive (2 Rooms)", cents: 72096 },
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
        { label: "BW Henderson (Vegas Base)", cents: 20000 },
        { label: "Luxor All-Inclusive (2 Rooms)", cents: 72096 },
      ],
      itineraryOutline: hybridOutline,
    },
  ]);

  console.log("Seeding checklists…");
  await db.insert(checklistItems).values([
    // Pre-trip
    { list: "pre-trip", sortOrder: 0, label: "Decide: Forester vs Rental vs Fly", note: "Vote on the Decide page!" },
    { list: "pre-trip", sortOrder: 1, label: "Confirm Caesar Meetup at the Land (Sun Aug 9)", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 2, label: "Book Luxor All-Inclusive", assignee: "BeX", note: "Free cancellation until Aug 9" },
    { list: "pre-trip", sortOrder: 3, label: "Confirm John's BW Rate — Flagstaff, Henderson, Sedona", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 4, label: "Oil Change + Tire Check on the Forester", note: "Skip if we rent or fly" },
    { list: "pre-trip", sortOrder: 5, label: "Pick Up Amma from City View at the Park (Fri Aug 7)" },
    { list: "pre-trip", sortOrder: 6, label: "Download Offline Maps for the Desert Stretches" },
    // Groceries (Amma-safe cooler)
    { list: "groceries", sortOrder: 0, label: "Amma's Staples", note: "Her list — restrictions for health + age" },
    { list: "groceries", sortOrder: 1, label: "Fruit + Easy Snacks" },
    { list: "groceries", sortOrder: 2, label: "Water Flats" },
    { list: "groceries", sortOrder: 3, label: "Ice Packs + Ice for the Cooler" },
    { list: "groceries", sortOrder: 4, label: "Breakfast Items" },
    { list: "groceries", sortOrder: 5, label: "Road-Lunch Fixings" },
    // Sedona restock
    { list: "sedona-restock", sortOrder: 0, label: "Groceries for the Drive Home (Amma-Safe)", note: "Friday night, Aug 14" },
    { list: "sedona-restock", sortOrder: 1, label: "Re-Ice + Repack the Cooler" },
    { list: "sedona-restock", sortOrder: 2, label: "Gas Up for the 5 AM Start" },
    // Packing
    { list: "packing", sortOrder: 0, label: "Chargers + Car Mounts" },
    { list: "packing", sortOrder: 1, label: "Swimsuits — Luxor Pool + Slide Rock" },
    { list: "packing", sortOrder: 2, label: "Water Shoes for Slide Rock" },
    { list: "packing", sortOrder: 3, label: "Sun Hats + Sunscreen" },
    { list: "packing", sortOrder: 4, label: "Amma's Meds" },
    { list: "packing", sortOrder: 5, label: "Jeans + Closed Shoes for the Horses" },
  ]);

  console.log("Seed complete ✅");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
