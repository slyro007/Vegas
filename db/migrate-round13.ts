import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, type CostLine, itineraryEvents, scenarios, votes } from "./schema";

/**
 * Round 13 — down to three plans, plus real non-resort food on the fly plan.
 *
 * 1. Three scenarios only: Road Trip · Forester, Road Trip · Rental SUV, and the
 *    two-night-Sedona fly plan. The split (hybrid) plans and the one-night Sedona
 *    fly variant are gone. `flyb` takes over the `fly` slug so there's a single
 *    fly plan and no sub-toggle on the itinerary.
 *
 * 2. Non-resort food is now a scenario cost line, because the fly plan eats out
 *    more days than the road trip does. Flying covers Fri, Sat, Sun, Mon, Tue +
 *    the closing Fri and Sat = 7 days at $1,250 (Wed/Thu are the Luxor
 *    all-inclusive). The road trip keeps $1,000. Split 75/25 as always —
 *    BeX $937.50 / Amma $312.50 when flying, $750 / $250 when driving.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const DROP = ["fly", "hybrid-forester", "hybrid-rental"];

// non-resort food, owned 75/25 by BeX and Amma
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

const DRIVE_FOOD = foodLines(100000, "Vegas week");
const FLY_FOOD = foodLines(125000, "7 days off-resort");

async function main() {
  /* ---------- 1. collapse to three scenarios ---------- */
  const doomed = await db.select().from(scenarios).where(inArray(scenarios.slug, DROP));
  const doomedIds = doomed.map((s) => s.id);
  if (doomedIds.length) {
    await db.delete(votes).where(inArray(votes.scenarioId, doomedIds));
    await db.delete(scenarios).where(inArray(scenarios.id, doomedIds));
    console.log(`  dropped ${doomed.map((s) => s.slug).join(", ")}`);
  }
  // the surviving two-night plan becomes THE fly plan
  await db
    .update(scenarios)
    .set({ slug: "fly", name: "Fly · Sedona Weekend" })
    .where(eq(scenarios.slug, "flyb"));

  /* ---------- 2. non-resort food as a scenario cost line ---------- */
  await db
    .update(budgetItems)
    .set({ costKey: "vegas-food-bex", shared: true })
    .where(eq(budgetItems.label, "Vegas Meals — BeX's Share"));
  await db
    .update(budgetItems)
    .set({ costKey: "vegas-food-amma", shared: true })
    .where(eq(budgetItems.label, "Vegas Meals — Amma's Share"));

  for (const slug of ["forester", "rental-suv", "fly"]) {
    const [row] = await db.select().from(scenarios).where(eq(scenarios.slug, slug));
    if (!row) throw new Error(`missing scenario ${slug}`);
    const kept = row.costLines.filter((l) => !l.key?.startsWith("vegas-food"));
    const lines = [...kept, ...(slug === "fly" ? FLY_FOOD : DRIVE_FOOD)];
    await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.slug, slug));
    console.log(
      `  ${slug.padEnd(11)} $${(lines.reduce((a, l) => a + l.cents, 0) / 100).toFixed(2)}`,
    );
  }

  /* ---------- 3. retag the itinerary ---------- */
  const events = await db.select().from(itineraryEvents);
  for (const e of events) {
    const tags = new Set(e.plan.split(" ").filter(Boolean));
    // the one-night Sedona routing is gone; its two exclusive events go with it
    if (tags.has("fly") && !tags.has("flyb") && !tags.has("drive") && !tags.has("hybrid")) {
      await db.delete(itineraryEvents).where(eq(itineraryEvents.id, e.id));
      console.log(`  removed one-night event: ${e.title}`);
      continue;
    }
    // hybrid-only events have no plan left to belong to
    if (tags.size === 1 && tags.has("hybrid")) {
      await db.delete(itineraryEvents).where(eq(itineraryEvents.id, e.id));
      console.log(`  removed hybrid-only event: ${e.title}`);
      continue;
    }
    tags.delete("hybrid");
    // flyb is now simply "fly"
    if (tags.has("flyb")) {
      tags.delete("flyb");
      tags.add("fly");
    } else if (tags.has("fly") && tags.has("drive")) {
      // Moapa was shared; the fly plan now has its own Moapa stop on the drive back
      tags.delete("fly");
    }
    const plan = [...tags].join(" ");
    if (plan !== e.plan) {
      await db.update(itineraryEvents).set({ plan }).where(eq(itineraryEvents.id, e.id));
    }
  }

  console.log("Round 13 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
