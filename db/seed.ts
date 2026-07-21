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
  type CostLine,
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

  console.log("Seeding budget items (yellow pad / projected / cost key)…");
  // [traveler, label, category, yellowPadCents, plannedCents, costKey, notes?]
  // costKey links a line to the selected scenario's cost line — that scenario decides
  // its real price. No matching cost line => the line is RELEASED and its yellow pad
  // goes back in the owner's bucket (flying hands Amma back gas + road food).
  // A line with a costKey is "shared" by definition.
  const budgetRows: [
    typeof pithya,
    string,
    string,
    number,
    number,
    string | null,
    string?,
  ][] = [
    [pithya, "Flagstaff Hotel (Sat)", "lodging", 15000, 8450, "flagstaff"],
    [pithya, "Caesar Ranch Adventure", "experience", 40000, 40000, null, "~4 hours of horses at the land in Valle"],
    [pithya, "BW Henderson (Sun–Wed)", "lodging", 50000, 20000, "henderson", "~$54/night on John's rate"],
    [pithya, "Sedona Hotel (Fri)", "lodging", 25000, 14400, "sedona"],
    [pithya, "Spending Money", "misc", 25000, 25000, null],
    [bex, "Luxor / Excalibur All-Inclusive", "lodging", 160000, 72096, null, "Fully BeX's — all-inclusive covers breakfast, lunch & dinner Wed–Fri · real deal came in at $720.96 for 2 rooms"],
    [bex, "Wynn Buffet (All Four)", "food", 40000, 40000, null, "~$100 a head — BeX covers everyone"],
    [bex, "Vegas Meals — BeX's Share", "food", 75000, 75000, "vegas-food-bex"],
    [bex, "Spending Money", "misc", 25000, 25000, null],
    [amma, "Road Trip Gas", "gas", 60000, 60000, "gas"],
    [amma, "Road Trip Food", "food", 40000, 40000, "road-food"],
    [amma, "Vegas Meals — Amma's Share", "food", 25000, 25000, "vegas-food-amma"],
    [amma, "Caesar Gifts", "gifts", 15000, 15000, null],
    [amma, "Spending Money", "misc", 25000, 25000, null],
    [shy, "Pre-Vegas Trip", "misc", 20000, 20000, null],
    [shy, "Spending Money", "misc", 25000, 25000, null],
  ];
  await db.insert(budgetItems).values(
    budgetRows.map(([t, label, category, yellowPadCents, plannedCents, costKey, notes]) => ({
      travelerId: t.id,
      label,
      category,
      yellowPadCents,
      plannedCents,
      costKey,
      shared: costKey !== null,
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

  // plan tags + fly events (three plans only — see db/migrate-round13.ts)
  console.log("Tagging plans + fly events…");
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
        // Sedona at the end is drive-only; the fly plan does Sedona up front
        "Check Out → Drive to Sedona",
        "Slide Rock + Downtown Sedona",
      ]),
    );
  await db.insert(itineraryEvents).values([
    // Fly plan: fly in Friday, land + Sedona the first weekend, full Vegas week, fly home Saturday
    // Rental SUV variant: same ten days, plus pickup and drop-off on either end
    { date: "2026-08-07", sortOrder: -1, time: "4:00 PM", title: "Pick Up the Rental SUV", description: "Enterprise full-size SUV for the whole trip — grab it before Amma's pickup so it's loaded and ready for the 5 AM haul.", location: "Enterprise, Cedar Park", theme: "desert", plan: "driveb" },
    { date: "2026-08-16", sortOrder: 1, time: "11:00 AM", title: "Return the Rental SUV", description: "Unload, sleep in, then drop the SUV back. Check the fuel level before you go.", location: "Enterprise, Cedar Park", theme: "desert", plan: "driveb" },
    { date: "2026-08-07", sortOrder: 0, time: "3:39 PM", title: "Fly AUS → LAS", description: "Delta nonstop — all four of us, wheels down at 4:32 PM.", location: "Austin-Bergstrom → Harry Reid Intl", theme: "vegas", plan: "fly" },
    { date: "2026-08-07", sortOrder: 1, time: "Evening", title: "Uber to Henderson + Crash", description: "Straight to Best Western Henderson on John's rate — settle in and rest up.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 0, time: "Morning", title: "Rent the SUV + Check Out", description: "Pick up the midsize luxury SUV at Harry Reid and check out of Henderson for the weekend loop.", location: "Harry Reid Intl, Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 1, time: "Midday", title: "The Land — Horses with Caesar", description: "~3.5 hours out to the land in Valle — ride and hang with Caesar's crew.", location: "287 S Victoria Dr, Valle, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-08", sortOrder: 2, time: "Evening", title: "Drive to Sedona + Overnight", description: "On to Sedona for the night — Best Western Red Rock, John's rate.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-14", sortOrder: 0, time: "Morning", title: "Check Out the Luxor → Henderson", description: "Last stretch — back to Best Western Henderson for the final night.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-14", sortOrder: 1, time: "Afternoon", title: "Explore More Vegas", description: "Open day — more Vegas, or maybe meet Shy's aunt. Undecided, and that's fine.", location: "Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-15", sortOrder: 0, time: "5:15 PM", title: "Fly LAS → AUS", description: "Delta nonstop home — lands 10:05 PM, in bed by midnight.", location: "Harry Reid Intl → Austin-Bergstrom", theme: "vegas", plan: "fly" },
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
    { date: "2026-08-09", sortOrder: 0, time: "9:00 AM", title: "Full Day in Sedona", description: "A slow second day in the red rocks — Slide Rock, the vortexes, downtown — and a second night at Best Western Red Rock.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-10", sortOrder: 0, time: "8:00 AM", title: "Check Out Sedona + Drive Back", description: "Pack up and point the SUV back toward Nevada (~4.5 hr).", location: "Sedona → Moapa Valley", theme: "desert", plan: "fly" },
    { date: "2026-08-10", sortOrder: 1, time: "12:30 PM", title: "Moapa Valley on the Way", description: "Break the drive in Shy's hometown before the last push to Vegas.", location: "Moapa Valley, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-10", sortOrder: 2, time: "6:00 PM", title: "Check Into Henderson", description: "Best Western Henderson on John's rate — home base for the Vegas week.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
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
  // Shared cost lines. `owner` = whose yellow-pad bucket covers it (absent = drawn from
  // the family pool, i.e. nobody budgeted for it); `key` links back to a budget line.
  // `confidence`: quoted = a real price we were given · rate = John's BW rate, an
  // assumption not a booking · estimate = rough.
  // Every cents value is a GROUP TOTAL for all four, never per person.
  const gas = (): CostLine => ({ label: "Gas (Round Trip)", cents: 60000, owner: "amma", key: "gas", confidence: "estimate" });
  const roadFood = (): CostLine => ({ label: "Road Trip Food", cents: 40000, owner: "amma", key: "road-food", confidence: "estimate" });
  const flagstaff = (): CostLine => ({ label: "Flagstaff Night (John's Rate)", cents: 8450, owner: "pithya", key: "flagstaff", confidence: "rate" });
  const sedona = (label: string, cents: number): CostLine => ({ label, cents, owner: "pithya", key: "sedona", confidence: "rate" });
  const henderson = (label: string, cents: number): CostLine => ({ label, cents, owner: "pithya", key: "henderson", confidence: "rate" });
  const enterprise = (): CostLine => ({ label: "Enterprise Full-Size SUV (Whole Trip)", cents: 65000, confidence: "estimate" });
  const ammaFlight = (): CostLine => ({ label: "Amma's Flight, Sun–Fri (Quoted)", cents: 35300, confidence: "quoted" });
  const ammaUbers = (): CostLine => ({ label: "Amma's Ubers", cents: 8000, confidence: "estimate" });
  // Non-resort food, owned 75/25 by BeX and Amma. The fly plan eats out more days
  // than the road trip does — Fri, Sat, Sun, Mon, Tue plus the closing Fri and Sat
  // (Wed/Thu are covered by the Luxor all-inclusive).
  const foodLines = (totalCents: number, dayNote: string): CostLine[] => [
    {
      label: `Non-Resort Food — BeX's Share (${dayNote})`,
      cents: Math.round(totalCents * 0.75),
      owner: "bex",
      key: "vegas-food-bex",
      confidence: "estimate",
    },
    {
      label: `Non-Resort Food — Amma's Share (${dayNote})`,
      cents: Math.round(totalCents * 0.25),
      owner: "amma",
      key: "vegas-food-amma",
      confidence: "estimate",
    },
  ];
  const driveFood = () => foodLines(100000, "Vegas week");
  const flyFood = () => foodLines(125000, "7 days off-resort");
  const flyCore = (): CostLine[] => [
    // $1,700 covers all four round trip incl. seat selection — bags are separate
    { label: "Delta Round Trip × 4, Seats Included (Fri–Sat)", cents: 170000, confidence: "quoted" },
    { label: "Midsize Luxury SUV, Sat–Sat (Quoted)", cents: 65865, confidence: "quoted" },
    { label: "Checked Bags (All Four · $90 Each)", cents: 36000, confidence: "estimate" },
    // one shared XL each way, Austin only — we have the rental car in Vegas
    { label: "Austin Airport Uber — One Ride Each Way (All Four)", cents: 30000, confidence: "estimate" },
    { label: "Arizona Driving Fuel (The Land + Sedona)", cents: 40000, confidence: "estimate" },
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
        gas(),
        roadFood(),
        flagstaff(),
        sedona("Sedona Night (John's Rate)", 14400),
        henderson("BW Henderson (Vegas Base)", 20000),
        ...driveFood(),
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
        enterprise(),
        gas(),
        roadFood(),
        flagstaff(),
        sedona("Sedona Night (John's Rate)", 14400),
        henderson("BW Henderson (Vegas Base)", 20000),
        ...driveFood(),
      ],
      itineraryOutline: roadOutline,
    },
    {
      slug: "fly",
      name: "Fly · Sedona Weekend",
      tagline: "Same Friday fly-in — but a two-night red-rock weekend",
      travelSummary: "All fly Fri Aug 7 · two Sedona nights · Moapa on the Monday drive back",
      emoji: "✈️",
      pros: [
        "A slow two-night Sedona weekend, not a one-night dash",
        "Everyone flies together — zero 15-hour drives",
        "Land + horses still happen on Saturday",
        "Moapa Valley folds into the Monday drive back",
      ],
      cons: [
        "The priciest fly option — a second Sedona night",
        "One fewer Best Western night in Vegas",
        "Big Saturday: rental, the land, then the drive to Sedona",
        "Friday's last Vegas day is still up in the air",
      ],
      costLines: [
        ...flyCore(),
        sedona("Sedona — 2 Nights (BW Red Rock, John's Rate)", 28800),
        henderson("BW Henderson (Fri fly-in + Mon–Wed + Fri, 4 nights)", 21600),
        ...flyFood(),
      ],
      itineraryOutline: [
        { day: "Fri 7", plan: "Fly in 4:32 PM · Uber to Henderson · crash" },
        { day: "Sat 8", plan: "Rent the SUV · horses at the land · drive to Sedona overnight" },
        { day: "Sun 9", plan: "A full, slow day in Sedona · second red-rock night" },
        { day: "Mon 10", plan: "Check out Sedona · Moapa Valley on the drive back · into Henderson" },
        { day: "Tue 11", plan: "Old Vegas + Fremont Street" },
        { day: "Wed 12", plan: "Wynn Buffet → Luxor All-Inclusive" },
        { day: "Thu 13", plan: "Luxor day · BeX at the Backstreet Boys, Sphere" },
        { day: "Fri 14", plan: "Last night: Henderson or extend the Luxor · explore more Vegas" },
        { day: "Sat 15", plan: "Fly home 5:15 PM" },
      ],
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
