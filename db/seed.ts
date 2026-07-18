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
        name: "Bex",
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

  console.log("Seeding budget items…");
  await db.insert(budgetItems).values([
    // Pithya
    {
      travelerId: pithya.id,
      label: "All Best Western Stays",
      category: "lodging",
      plannedCents: 90000,
      actualCents: 42850,
      notes: "Flagstaff $84.50 + Henderson ~$200 + Sedona $144 — all on John's employee rate",
    },
    {
      travelerId: pithya.id,
      label: "Caesar / Ranch Adventure",
      category: "experience",
      plannedCents: 40000,
      notes: "~4 hours of horses at the land in Valle · Amma is backup if Pithya can't cover it",
    },
    { travelerId: pithya.id, label: "Spend Money", category: "misc", plannedCents: 25000 },
    // Bex
    {
      travelerId: bex.id,
      label: "Luxor All-Inclusive",
      category: "experience",
      plannedCents: 72096,
      actualCents: 72096,
      notes:
        "$360.48 per room × 2 rooms — the deal is priced for 2 guests and we're 4 · Pyramid Premier Two Queen, Aug 12–14 · free cancellation until Aug 9 · vouchers worth up to $300 per room",
    },
    {
      travelerId: bex.id,
      label: "Non-Resort / Non-Road-Trip Food",
      category: "food",
      plannedCents: 75000,
      notes: "Everything that isn't the resort or the road: Vegas meals, snacks, coffee runs",
    },
    {
      travelerId: bex.id,
      label: "Wynn Buffet",
      category: "food",
      plannedCents: 40000,
      notes: "~$100 a head — Bex covers all four of us",
    },
    { travelerId: bex.id, label: "Spend Money", category: "misc", plannedCents: 25000 },
    // Amma
    { travelerId: amma.id, label: "Road Trip Gas", category: "gas", plannedCents: 60000 },
    { travelerId: amma.id, label: "Road Trip Food", category: "food", plannedCents: 40000 },
    {
      travelerId: amma.id,
      label: "Non-Resort / Non-Road-Trip Food",
      category: "food",
      plannedCents: 25000,
    },
    { travelerId: amma.id, label: "Caesar Gifts", category: "gifts", plannedCents: 15000 },
    { travelerId: amma.id, label: "Spend Money", category: "misc", plannedCents: 25000 },
    // Shy
    { travelerId: shy.id, label: "Pre-Vegas Trip", category: "misc", plannedCents: 20000 },
    {
      travelerId: shy.id,
      label: "Spend Money",
      category: "misc",
      plannedCents: 25000,
      notes: "Amma is backup if Shy can't cover it",
    },
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
      plannedCents: 72096,
      actualCents: 72096,
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
      title: "Pick Up Amma",
      description:
        "Amma arrives in the evening — grab her from her apartment, final packing, load the cooler.",
      location: "City View at the Park",
      theme: "desert",
      plan: "drive fly", // in the split plans she flies solo on Sunday instead
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
      description: "Bex's solo night 🎤 — everyone else holds down the Luxor.",
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
      ]),
    );
  await db.insert(itineraryEvents).values([
    { date: "2026-08-08", sortOrder: 0, time: "3:39 PM", title: "Fly AUS → LAS", description: "Delta nonstop — wheels down in Vegas at 4:32 PM with the whole evening ahead.", location: "Austin-Bergstrom → Harry Reid Intl", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 1, time: "5:00 PM", title: "Pick Up the Rental SUV", description: "Midsize Luxury SUV — BMW X5-class, unlimited miles for the week.", location: "Harry Reid Intl, Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 2, time: "Evening", title: "Check In at Henderson", description: "Best Western Henderson — 4 nights, Sat → Wed, via John's rate.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-09", sortOrder: 0, time: "Early", title: "Day Trip: The Land — Horses with Caesar", description: "~3.5 hours each way in the SUV. Ride with Caesar's crew, hang at the land, roll back to Vegas as late as we want.", location: "287 S Victoria Dr, Valle, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-14", sortOrder: 2, time: "Evening", title: "Dinner in Sedona", description: "Red-rock dinner — no cooler haul this time, we fly home tomorrow.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-15", sortOrder: 0, time: "Morning", title: "Drive Back to Vegas", description: "~4.5 hours from Sedona back to Harry Reid.", location: "Sedona → Las Vegas", theme: "desert", plan: "fly" },
    { date: "2026-08-15", sortOrder: 1, time: "2:30 PM", title: "Return the Rental", description: "SUV back at Harry Reid by 2:30 PM sharp.", location: "Harry Reid Intl, Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-15", sortOrder: 2, time: "5:15 PM", title: "Fly LAS → AUS", description: "Delta nonstop home — lands 10:05 PM, in bed by midnight.", location: "Harry Reid Intl → Austin-Bergstrom", theme: "vegas", plan: "fly" },
    { date: "2026-08-07", sortOrder: 0, time: "Evening", title: "Pack the Car — Party of Three", description: "Final packing at Muir Lake — cooler for three · Amma packs a carry-on for Sunday's flight.", location: "Muir Lake, TX", theme: "desert", plan: "hybrid" },
    { date: "2026-08-09", sortOrder: 2, time: "3:39 PM", title: "Amma Flies AUS → LAS", description: "Delta nonstop — wheels down at 4:32 PM, right as the trio rolls in from the land.", location: "Austin-Bergstrom → Harry Reid Intl", theme: "vegas", plan: "hybrid" },
    { date: "2026-08-09", sortOrder: 3, time: "5:00 PM", title: "Amma Ubers to the Hotel", description: "Straight from Harry Reid to Best Western Henderson — checked in before the trio pulls up.", location: "Henderson, NV", theme: "vegas", plan: "hybrid" },
    { date: "2026-08-14", sortOrder: 2, time: "5:15 PM", title: "Amma Flies Home", description: "Delta nonstop LAS → AUS — lands 10:05 PM, Uber home · the trio drives on to Sedona.", location: "Harry Reid Intl → Austin-Bergstrom", theme: "vegas", plan: "hybrid" },
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
    { day: "Thu 13", plan: "Luxor day · Bex at the Backstreet Boys, Sphere" },
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
    { day: "Thu 13", plan: "Luxor day · Bex at the Backstreet Boys, Sphere" },
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
      ],
      itineraryOutline: roadOutline,
    },
    {
      slug: "fly",
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
  ]);

  console.log("Seeding checklists…");
  await db.insert(checklistItems).values([
    // Pre-trip
    { list: "pre-trip", sortOrder: 0, label: "Decide: Forester vs Rental vs Fly", note: "Vote on the Decide page!" },
    { list: "pre-trip", sortOrder: 1, label: "Confirm Caesar Meetup at the Land (Sun Aug 9)", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 2, label: "Book Luxor All-Inclusive", assignee: "Bex", note: "Free cancellation until Aug 9" },
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
