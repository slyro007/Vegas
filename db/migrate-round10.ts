/**
 * Round 10 one-off migration (2026-07-18):
 * - Luxor all-inclusive is fully BeX's — mark the budget line NOT shared, and pull
 *   the Luxor line out of every scenario's cost breakdown (so it isn't double-counted
 *   or split four ways; it lives on BeX's card).
 * - Vegas meals split exactly $750 BeX / $250 Amma (pooled).
 * - Fly Henderson line spells out the fly-in Friday night; new "Fly · Sedona Weekend"
 *   scenario prices the two-night Sedona routing (double the Sedona nights).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, scenarios } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Luxor → BeX's alone (not shared)…");
  await sql.query("UPDATE budget_items SET shared = false WHERE label = 'Luxor / Excalibur All-Inclusive'");

  console.log("Vegas meals split $750 BeX / $250 Amma…");
  await sql.query(
    "UPDATE budget_items SET label = 'Vegas Meals — BeX''s Share', yellow_pad_cents = 75000, planned_cents = 75000 WHERE label = 'Vegas Meals — Mon, Tue & Sedona Dinner'",
  );
  await sql.query(
    "UPDATE budget_items SET label = 'Vegas Meals — Amma''s Share', yellow_pad_cents = 25000, planned_cents = 25000 WHERE label = 'Vegas Meals — Sunday'",
  );

  console.log("Pulling the Luxor out of every scenario breakdown…");
  const all = await db.select().from(scenarios);
  for (const s of all) {
    const lines = s.costLines.filter((l) => !/Luxor/i.test(l.label));
    // spell out the fly-in Friday night on the fly Henderson line
    const relabeled = lines.map((l) =>
      s.slug === "fly" && /^BW Henderson/.test(l.label)
        ? { ...l, label: "BW Henderson (Fri fly-in + Sun–Wed + Fri, 5 nights)" }
        : l,
    );
    await db.update(scenarios).set({ costLines: relabeled }).where(eq(scenarios.id, s.id));
  }

  console.log("Adding the Fly · Sedona Weekend scenario…");
  const have = new Set(all.map((s) => s.slug));
  if (!have.has("flyb")) {
    await db.insert(scenarios).values({
      slug: "flyb",
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
        { label: "Delta Round Trip × 4 (Fri–Sat)", cents: 134800 },
        { label: "Midsize Luxury SUV, Sat–Sat (quoted)", cents: 65865 },
        { label: "Checked Bags (×4)", cents: 36000, estimate: true },
        { label: "Sedona — 2 Nights (BW Red Rock)", cents: 28800 },
        { label: "BW Henderson (Fri fly-in + Mon–Wed + Fri, 4 nights)", cents: 21600 },
        { label: "Airport Ubers", cents: 12000, estimate: true },
        { label: "Land + Sedona Fuel", cents: 12000, estimate: true },
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
    });
  }

  console.log("Round 10 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
