import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, type CostLine, scenarios } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/**
 * Round 11 — the bucket model.
 *
 * Shared trip cost used to be recorded twice: once as a `shared` budget line owned
 * by a person, once in scenario.costLines. They drifted (Amma's gas read $0 planned
 * while forester's cost line said $600). Now scenario.costLines is the truth, and
 * each line carries `owner` (whose yellow-pad bucket covers it) + `key` (which budget
 * line it satisfies). A budget line with no matching cost line in the selected
 * scenario is RELEASED — its yellow pad goes back in the owner's bucket. That's how
 * flying hands Amma back her $600 gas + $400 road food.
 *
 * Also fixes two placeholder fly costs: Arizona driving fuel $120 -> $400, and the
 * airport uber $120 -> $300 (one shared XL each way from Austin only — we rent a car
 * in Vegas). Every cents value here is a GROUP TOTAL, never per person.
 */

// whose bucket covers each shared cost, by key
const AMMA = "amma";
const PITHYA = "pithya";

const gas = (cents: number): CostLine => ({
  label: "Gas (Round Trip)",
  cents,
  owner: AMMA,
  key: "gas",
  confidence: "estimate",
});
const roadFood = (cents: number): CostLine => ({
  label: "Road Trip Food",
  cents,
  owner: AMMA,
  key: "road-food",
  confidence: "estimate",
});
const flagstaff = (): CostLine => ({
  label: "Flagstaff Night (John's Rate)",
  cents: 8450,
  owner: PITHYA,
  key: "flagstaff",
  confidence: "rate",
});
const sedona = (label: string, cents: number): CostLine => ({
  label,
  cents,
  owner: PITHYA,
  key: "sedona",
  confidence: "rate",
});
const henderson = (label: string, cents: number): CostLine => ({
  label,
  cents,
  owner: PITHYA,
  key: "henderson",
  confidence: "rate",
});

// unowned — nobody yellow-padded these, so they come out of the family pool
const enterprise = (): CostLine => ({
  label: "Enterprise Full-Size SUV (Whole Trip)",
  cents: 65000,
  confidence: "estimate",
});
const ammaFlight = (): CostLine => ({
  label: "Amma's Flight, Sun–Fri (Quoted)",
  cents: 35300,
  confidence: "quoted",
});
const ammaUbers = (): CostLine => ({ label: "Amma's Ubers", cents: 8000, confidence: "estimate" });

// shared by both fly variants
const flyCore = (): CostLine[] => [
  { label: "Delta Round Trip × 4 (Fri–Sat)", cents: 134800, confidence: "quoted" },
  { label: "Midsize Luxury SUV, Sat–Sat (Quoted)", cents: 65865, confidence: "quoted" },
  { label: "Checked Bags (All Four)", cents: 36000, confidence: "estimate" },
  // one shared XL each way, Austin only — we have the rental in Vegas
  { label: "Austin Airport Uber — One Ride Each Way (All Four)", cents: 30000, confidence: "estimate" },
  { label: "Arizona Driving Fuel (The Land + Sedona)", cents: 40000, confidence: "estimate" },
];

const COST_LINES: Record<string, CostLine[]> = {
  forester: [
    gas(60000),
    roadFood(40000),
    flagstaff(),
    sedona("Sedona Night (John's Rate)", 14400),
    henderson("BW Henderson (Vegas Base)", 20000),
  ],
  "rental-suv": [
    enterprise(),
    gas(60000),
    roadFood(40000),
    flagstaff(),
    sedona("Sedona Night (John's Rate)", 14400),
    henderson("BW Henderson (Vegas Base)", 20000),
  ],
  fly: [
    ...flyCore(),
    sedona("Sedona Night (BW Red Rock, John's Rate)", 14400),
    henderson("BW Henderson (Fri fly-in + Sun–Wed + Fri, 5 nights)", 27000),
  ],
  flyb: [
    ...flyCore(),
    sedona("Sedona — 2 Nights (BW Red Rock, John's Rate)", 28800),
    henderson("BW Henderson (Fri fly-in + Mon–Wed + Fri, 4 nights)", 21600),
  ],
  "hybrid-forester": [
    gas(60000),
    roadFood(40000),
    flagstaff(),
    sedona("Sedona Night (John's Rate)", 14400),
    ammaFlight(),
    ammaUbers(),
    henderson("BW Henderson (Vegas Base)", 20000),
  ],
  "hybrid-rental": [
    enterprise(),
    gas(60000),
    roadFood(40000),
    flagstaff(),
    sedona("Sedona Night (John's Rate)", 14400),
    ammaFlight(),
    ammaUbers(),
    henderson("BW Henderson (Vegas Base)", 20000),
  ],
};

// budget line label -> the cost line key it satisfies
const COST_KEYS: [string, string][] = [
  ["Road Trip Gas", "gas"],
  ["Road Trip Food", "road-food"],
  ["Flagstaff Hotel (Sat)", "flagstaff"],
  ["Sedona Hotel (Fri)", "sedona"],
  ["BW Henderson (Sun–Wed)", "henderson"],
];

async function main() {
  await db.execute(`ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS cost_key text`);

  for (const [slug, lines] of Object.entries(COST_LINES)) {
    await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.slug, slug));
    const total = lines.reduce((a, l) => a + l.cents, 0);
    console.log(`  ${slug.padEnd(16)} ${lines.length} lines · $${(total / 100).toFixed(2)}`);
  }

  for (const [label, key] of COST_KEYS) {
    await db.update(budgetItems).set({ costKey: key }).where(eq(budgetItems.label, label));
  }

  // these got zeroed in an earlier round; the line should show its real price on a
  // drive plan (the bucket math reads the cost line, but the row shouldn't say $0)
  await db
    .update(budgetItems)
    .set({ plannedCents: 60000 })
    .where(eq(budgetItems.label, "Road Trip Gas"));
  await db
    .update(budgetItems)
    .set({ plannedCents: 40000 })
    .where(eq(budgetItems.label, "Road Trip Food"));

  console.log("Round 11 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
