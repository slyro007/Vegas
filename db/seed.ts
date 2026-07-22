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
        budgetTotalCents: 155000,
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
        budgetTotalCents: 300000,
        color: "#d34f8c",
        emoji: "🎰",
      },
      {
        slug: "amma",
        name: "Amma",
        clerkEmail: "kamakshi63@gmail.com",
        budgetTotalCents: 165000,
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
    [pithya, "Flagstaff Hotel (Sat)", "lodging", 15000, 0, "flagstaff"],
    [pithya, "Caesar Ranch Adventure", "experience", 40000, 40000, null, "~4 hours of horses at Valle"],
    // the three Best Western stays, in itinerary order (see db/migrate-round24.ts)
    [pithya, "BW Henderson — Fri Aug 7 (Fly-In Night)", "lodging", 0, 5400, null, "Land 4:32, drive over in the SUV · $54, John's rate"],
    [pithya, "Sedona — Sat + Sun, Aug 8–9", "lodging", 25000, 34400, null, "Sat $200 weekend rate + Sun $144 · BW Red Rock, John's rate"],
    [pithya, "BW Henderson — Mon + Tue, Aug 10–11", "lodging", 50000, 10800, null, "Home base for Old Vegas · $54/night, John's rate"],
    [pithya, "Spending Money", "misc", 35000, 25000, null],
    [bex, "Air Travel — Delta (Booked)", "travel", 0, 215200, "airfare", "Booked · H2UQO8 · flights $1,756.28 + trip protection $140.80 + taxes & fees $254.92 — BeX covered it"],
    [bex, "Luxor All-Inclusive (Booked)", "lodging", 160000, 81622, null, "Booked — $816.22 total: $391.10 paid on the 2941 card, $425.12 due at the resort · all-inclusive covers breakfast, lunch & dinner Wed–Fri · fully BeX's"],
    [bex, "Wynn Buffet (All Four)", "food", 40000, 40000, null, "~$100 a head — BeX covers everyone"],
    [bex, "Non-Resort Food — BeX's Share", "food", 75000, 93750, "vegas-food-bex"],
    [bex, "Spending Money", "misc", 50000, 25000, null],
    [amma, "Road Trip Gas", "gas", 60000, 0, "gas"],
    [amma, "Road Trip Food", "food", 40000, 0, "road-food"],
    [amma, "Non-Resort Food — Amma's Share", "food", 25000, 31250, "vegas-food-amma"],
    [amma, "Caesar Gifts", "gifts", 15000, 15000, null],
    [amma, "Spending Money", "misc", 65000, 25000, null],
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

  // owner-less shared costs — "The Crew" — anyone can pay toward them on Spend
  await db.insert(budgetItems).values([
    { travelerId: null, label: "Rental SUV — Fri–Fri, Airport Pickup", category: "travel", yellowPadCents: 0, plannedCents: 65865, shared: true, notes: "Midsize luxury SUV, quoted — grab it at Harry Reid on landing, drop it before the flight home. Not booked yet." },
    { travelerId: null, label: "Checked Bags — 3 at $90", category: "travel", yellowPadCents: 0, plannedCents: 27000, shared: true, notes: "Three checked bags on Delta, ~$90 each." },
    { travelerId: null, label: "Austin Airport Uber — Both Ways", category: "travel", yellowPadCents: 0, plannedCents: 30000, shared: true, notes: "One shared XL home→airport and airport→home. Buffered over ~$100 each way." },
    { travelerId: null, label: "Arizona Driving Fuel", category: "gas", yellowPadCents: 0, plannedCents: 40000, shared: true, notes: "Gas for the SUV: Valle, Sedona, and the Moapa drive back." },
  ]);

  console.log("Seeding lodging…");
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
      plannedCents: 81622,
      bookingStatus: "booked",
      cancelBy: "2026-08-09",
      theme: "vegas",
      notes:
        "Booked over Excalibur — $816.22 total for 2 rooms: $391.10 paid, $425.12 due at the resort · covers breakfast, lunch & dinner Wed–Fri · free cancellation until Aug 9",
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
      description: "Fuel up before Valle.",
      location: "Flagstaff, AZ",
      theme: "desert",
    },
    {
      date: "2026-08-09",
      sortOrder: 1,
      time: "Midday",
      title: "Valle — Horses with Caesar",
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
        "Valle — Horses with Caesar",
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
    // Rental SUV drive variant (history — the drive plans no longer render)
    { date: "2026-08-07", sortOrder: -1, time: "4:00 PM", title: "Pick Up the Rental SUV (Drive Variant)", description: "Enterprise full-size SUV for the whole trip — grab it before Amma's pickup so it's loaded and ready for the 5 AM haul.", location: "Enterprise, Cedar Park", theme: "desert", plan: "driveb" },
    { date: "2026-08-16", sortOrder: 1, time: "11:00 AM", title: "Return the Rental SUV (Drive Variant)", description: "Unload, sleep in, then drop the SUV back. Check the fuel level before you go.", location: "Enterprise, Cedar Park", theme: "desert", plan: "driveb" },
    // THE trip — booked (H2UQO8): fly in Friday, Valle + a Sedona weekend, Moapa on the
    // Monday drive back, the Vegas week, fly home Friday. SUV is Fri–Fri, airport pickup.
    { date: "2026-08-07", sortOrder: 0, time: "3:39 PM", title: "Fly AUS → LAS", description: "Booked — Delta DL2260, all four of us. Wheels down 4:32 PM.", location: "Austin-Bergstrom → Harry Reid Intl", theme: "vegas", plan: "fly" },
    { date: "2026-08-07", sortOrder: 1, time: "5:00 PM", title: "Pick Up the Rental SUV", description: "Midsize luxury SUV at Harry Reid, Fri–Fri — loaded and rolling by 6.", location: "Harry Reid Intl, Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-07", sortOrder: 2, time: "6:00 PM", title: "Drive to Henderson + Crash", description: "Twenty minutes to Best Western Henderson on John's rate — settle in, rest up.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 0, time: "9:00 AM", title: "Check Out of Henderson", description: "Pack the SUV and point it at Arizona — Valle first, then Sedona.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-08", sortOrder: 1, time: "12:30 PM", title: "Valle — Horses with Caesar", description: "~3.5 hours out to Valle — ride and hang with Caesar's crew.", location: "287 S Victoria Dr, Valle, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-08", sortOrder: 2, time: "6:00 PM", title: "Drive to Sedona + Overnight", description: "On to Sedona for the night — Best Western Red Rock, John's rate.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-09", sortOrder: 0, time: "9:00 AM", title: "Full Day in Sedona", description: "A slow second day in the red rocks — Slide Rock, the vortexes, downtown — and a second night at Best Western Red Rock.", location: "Sedona, AZ", theme: "desert", plan: "fly" },
    { date: "2026-08-10", sortOrder: 0, time: "8:00 AM", title: "Check Out Sedona + Drive Back", description: "Pack up and point the SUV back toward Nevada (~4.5 hr).", location: "Sedona → Moapa Valley", theme: "desert", plan: "fly" },
    { date: "2026-08-10", sortOrder: 1, time: "12:30 PM", title: "Moapa Valley on the Way", description: "Break the drive in Shy's hometown before the last push to Vegas.", location: "Moapa Valley, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-10", sortOrder: 2, time: "6:00 PM", title: "Check Into Henderson", description: "Best Western Henderson on John's rate — home base for the Vegas week.", location: "Henderson, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-14", sortOrder: 0, time: "11:00 AM", title: "Check Out the Luxor", description: "Last morning on the Strip — pack up, one more walk through the pyramid.", location: "Las Vegas, NV", theme: "vegas", plan: "fly" },
    { date: "2026-08-14", sortOrder: 1, time: "3:00 PM", title: "Return the SUV at the Airport", description: "Gas it up, drop it at Harry Reid, roll straight to the gate.", location: "Harry Reid Intl, Las Vegas", theme: "vegas", plan: "fly" },
    { date: "2026-08-14", sortOrder: 2, time: "5:15 PM", title: "Fly LAS → AUS", description: "Booked — Delta DL1837, 5:15 PM. Lands Austin 10:05 PM, home by midnight.", location: "Harry Reid Intl → Austin-Bergstrom", theme: "vegas", plan: "fly" },
  ]);

  // real clock times on the shared drive-era events (the "all" ones still render)
  console.log("Timing events…");
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
    ["2026-08-09", "Valle — Horses with Caesar", "11:00 AM"],
    ["2026-08-09", "Drive to Vegas + Check In", "5:00 PM"],
    ["2026-08-14", "Check Out → Drive to Sedona", "9:00 AM"],
    ["2026-08-14", "Slide Rock + Downtown Sedona", "2:00 PM"],
    ["2026-08-14", "Dinner, Groceries, Pack the Cooler", "6:30 PM"],
    ["2026-08-16", "Home — Muir Lake", "1:00 AM"],
  ];
  for (const [date, title, time] of eventTimes) {
    await sql.query("UPDATE itinerary_events SET time = $1 WHERE date = $2 AND title = $3", [time, date, title]);
  }

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
    { day: "Sun 9", plan: "Breakfast · horses with Caesar at Valle · on to Vegas" },
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
  const flyFood = () => foodLines(125000, "6 days off-resort");
  const flyCore = (): CostLine[] => [
    // BOOKED — H2UQO8: flights $1,756.28 + trip protection $140.80 + taxes $254.92
    // = $2,152.00 for all four, paid by BeX (owner: her bucket covers it).
    {
      label: "Air Travel — Delta, Booked Fri–Fri: flights $1,756.28 + protection $140.80 + taxes $254.92",
      cents: 215200,
      owner: "bex",
      key: "airfare",
      confidence: "quoted",
    },
    { label: "Checked Bags — 3 at $90", cents: 27000, confidence: "estimate" },
    { label: "Midsize Luxury SUV — Fri–Fri, Airport Pickup", cents: 65865, confidence: "quoted" },
    // one shared XL each way, Austin only — we have the rental car in Vegas
    { label: "Austin Airport Uber — One Ride Each Way (All Four)", cents: 30000, confidence: "estimate" },
    { label: "Arizona Driving Fuel (Valle + Sedona)", cents: 40000, confidence: "estimate" },
  ];

  const insertedScenarios = await db.insert(scenarios).values([
    {
      slug: "forester",
      name: "Road Trip · Our Forester",
      tagline: "The current plan — take the 2019 Subaru",
      travelSummary: "~15 hr drive each way · ~30 hr total behind the wheel",
      emoji: "🚙",
      pros: [
        "Full itinerary: Valle, Caesar's horses, Flagstaff AND Sedona",
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
        "Keeps the full itinerary, Valle visit and all",
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
      tagline: "Booked — fly in Friday, a red-rock weekend, then the Vegas week",
      travelSummary:
        "Booked · DL2260 AUS→LAS Fri Aug 7, 3:39–4:32 PM · DL1837 LAS→AUS Fri Aug 14, 5:15–10:05 PM",
      emoji: "✈️",
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
      costLines: [
        ...flyCore(),
        // lodging itemized per night — the Fri fly-in night and the Sat weekend
        // rate were once invisible inside aggregates (see migrate-round15.ts)
        henderson("BW Henderson — Fri Aug 7, the fly-in night", 5400),
        sedona("Sedona — Sat Aug 8 (weekend rate)", 20000),
        sedona("Sedona — Sun Aug 9", 14400),
        henderson("BW Henderson — Mon + Tue, Aug 10–11", 10800),
        ...flyFood(),
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
    },
  ]).returning();

  console.log("Seeding trip settings…");
  // the decision is made — the fly plan is booked (H2UQO8)
  const flyScenario = insertedScenarios.find((sc) => sc.slug === "fly");
  await db.insert(tripSettings).values({
    lockedScenarioId: flyScenario?.id ?? null,
    lockedAt: new Date(),
  });


  console.log("Seeding checklists…");
  await db.insert(checklistItems).values([
    // Pre-trip — the trip is booked; what's left is confirming and packing
    { list: "pre-trip", sortOrder: 0, label: "Delta Check-In Opens Thu Aug 6 (H2UQO8)", note: "24 hours before the 3:39 PM flight" },
    // NOTE: the homepage "left to book" tile matches this row by label prefix
    // ("Book the Midsize SUV") — keep the prefix if rewording (app/page.tsx)
    { list: "pre-trip", sortOrder: 1, label: "Book the Midsize SUV — Fri–Fri, Airport Pickup" },
    { list: "pre-trip", sortOrder: 2, label: "Confirm Caesar Meetup at Valle (Sat Aug 8)", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 3, label: "Booked: Luxor All-Inclusive", assignee: "BeX", done: true, note: "$391.10 paid · $425.12 due at check-in · free cancellation until Aug 9" },
    { list: "pre-trip", sortOrder: 7, label: "Pay the Luxor Balance at Check-In — $425.12", assignee: "BeX", note: "Wed Aug 12, at the desk — the rest of the $816.22" },
    { list: "pre-trip", sortOrder: 4, label: "Confirm John's BW Rate — Henderson + Sedona", assignee: "Pithya" },
    { list: "pre-trip", sortOrder: 5, label: "Pick Up Amma on the Way to the Airport (Fri Aug 7)" },
    { list: "pre-trip", sortOrder: 6, label: "Download Offline Maps for the Desert Stretches" },
    // Groceries (Amma-safe, once we have the SUV)
    { list: "groceries", sortOrder: 0, label: "Amma's Staples", note: "Her list — restrictions for health + age" },
    { list: "groceries", sortOrder: 1, label: "Fruit + Easy Snacks" },
    { list: "groceries", sortOrder: 2, label: "Water Flats" },
    { list: "groceries", sortOrder: 3, label: "Breakfast Items" },
    // Sedona restock
    { list: "sedona-restock", sortOrder: 0, label: "Amma-Safe Grocery Run in Sedona" },
    { list: "sedona-restock", sortOrder: 1, label: "Fuel Up the SUV Before the Moapa Drive" },
    // Packing
    { list: "packing", sortOrder: 0, label: "Chargers + Cables" },
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
