import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { and, eq, isNull } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems } from "./schema";

/**
 * Round 23 — one booked ledger.
 *
 * The trip is booked, so Finances/Spend stop comparing scenarios and read the
 * real ledger: every cost is a budget line with an owner (or none = shared),
 * a real price, and what's been paid. Two data gaps to close:
 *
 *  1. The shared costs (rental SUV, bags, Austin uber, AZ fuel) only ever
 *     existed as scenario cost lines, so they couldn't be logged. Add them as
 *     owner-less budget lines — "The Crew" — that anyone can pay toward.
 *  2. Non-resort food still carried the yellow-pad 750/250; the booked trip is
 *     $1,250 split 75/25 = 937.50/312.50. Sync + relabel.
 *
 * The released lines (Flagstaff, Road Trip Gas, Road Trip Food) stay at
 * plannedCents 0 — hidden from the ledger by the active-line rule, but their
 * yellowPadCents is preserved for the OG-budget reference.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// owner-less shared lines — the whole crew, loggable by anyone
const SHARED: { label: string; category: string; cents: number; notes: string }[] = [
  {
    label: "Rental SUV — Fri–Fri, Airport Pickup",
    category: "travel",
    cents: 65865,
    notes: "Midsize luxury SUV, quoted — grab it at Harry Reid on landing, drop it before the flight home. Not booked yet.",
  },
  {
    label: "Checked Bags — 3 at $90",
    category: "travel",
    cents: 27000,
    notes: "Three checked bags on Delta, ~$90 each.",
  },
  {
    label: "Austin Airport Uber — Both Ways",
    category: "travel",
    cents: 30000,
    notes: "One shared XL home→airport and airport→home. Buffered over ~$100 each way.",
  },
  {
    label: "Arizona Driving Fuel",
    category: "gas",
    cents: 40000,
    notes: "Gas for the SUV: Valle, Sedona, and the Moapa drive back.",
  },
];

async function main() {
  for (const s of SHARED) {
    const [existing] = await db
      .select()
      .from(budgetItems)
      .where(and(eq(budgetItems.label, s.label), isNull(budgetItems.travelerId)));
    if (existing) {
      await db
        .update(budgetItems)
        .set({ plannedCents: s.cents, category: s.category, notes: s.notes })
        .where(eq(budgetItems.id, existing.id));
      console.log(`  updated shared: ${s.label}`);
    } else {
      await db.insert(budgetItems).values({
        travelerId: null,
        label: s.label,
        category: s.category,
        yellowPadCents: 0,
        plannedCents: s.cents,
        costKey: null,
        shared: true,
        notes: s.notes,
      });
      console.log(`  added shared:   ${s.label} · $${(s.cents / 100).toFixed(2)}`);
    }
  }

  // non-resort food, booked split
  await db
    .update(budgetItems)
    .set({ label: "Non-Resort Food — BeX's Share", plannedCents: 93750 })
    .where(eq(budgetItems.label, "Vegas Meals — BeX's Share"));
  await db
    .update(budgetItems)
    .set({ label: "Non-Resort Food — Amma's Share", plannedCents: 31250 })
    .where(eq(budgetItems.label, "Vegas Meals — Amma's Share"));

  console.log("Round 23 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
