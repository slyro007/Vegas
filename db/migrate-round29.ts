import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { budgetItems, itineraryEvents, travelers } from "./schema";

/**
 * Round 29 — personal budgets come back, as a ceiling.
 *
 * `budget_total_cents` has been seeded-and-ignored since the yellow-pad era; the
 * ledger now shows it on each card, with whatever the person's lines don't claim
 * reading as unallocated. Amma's real number is $2,050 and Pithya's is $1,650 —
 * their line items are still road-trip-era and get fixed by hand in the UI, but
 * the budget is theirs regardless of what's been allocated out of it.
 *
 * Shy's and BeX's seeded values are pre-flight guesses, and a wrong budget on
 * screen is worse than none — they zero out until each sets their own by tapping
 * the cell.
 */
const db = drizzle(neon(process.env.DATABASE_URL!));

const BUDGETS: Record<string, number> = {
  amma: 205000,
  pithya: 165000,
  shy: 0,
  bex: 0,
};

async function main() {
  for (const [slug, cents] of Object.entries(BUDGETS)) {
    const [row] = await db
      .update(travelers)
      .set({ budgetTotalCents: cents })
      .where(eq(travelers.slug, slug))
      .returning({ name: travelers.name, budget: travelers.budgetTotalCents });
    if (!row) {
      console.warn(`  missing: ${slug}`);
      continue;
    }
    console.log(
      `  ${row.name.padEnd(7)} ${row.budget > 0 ? "$" + (row.budget / 100).toFixed(2) : "(unset — they'll enter it)"}`,
    );
  }

  // "(Booked)" said nothing the paid amount doesn't — every line carries its own
  // status now, so the suffix was just noise on the board.
  const renamed = await db
    .update(budgetItems)
    .set({ label: sql`trim(replace(label, '(Booked)', ''))` })
    .where(sql`label like '%(Booked)%'`)
    .returning({ label: budgetItems.label });
  for (const r of renamed) console.log(`  renamed: ${r.label}`);

  // fuel for the rental is its own cost, kept apart from the Arizona driving gas
  const FUEL = "Car Rental Fuel";
  const [existing] = await db.select().from(budgetItems).where(eq(budgetItems.label, FUEL));
  if (existing) {
    console.log(`  exists:  ${FUEL}`);
  } else {
    await db.insert(budgetItems).values({
      travelerId: null, // The Crew
      label: FUEL,
      category: "gas",
      yellowPadCents: 0, // never on the yellow pad
      plannedCents: 25000,
      shared: true,
      notes: "Filling the SUV up over the week — separate from the Arizona driving gas.",
    });
    console.log(`  added:   ${FUEL} · $250.00 (The Crew)`);
  }

  // the rental turned out to be a premium elite SUV, Escalade-class — and it's
  // paid for (confirmation on the Spend entry), so "not booked yet" is stale too
  const SUV_NOTE =
    "Premium Elite SUV — Escalade-class. Grab it at Harry Reid on landing, drop it before the flight home.";
  await db
    .update(budgetItems)
    .set({ notes: SUV_NOTE })
    .where(eq(budgetItems.label, "Rental SUV — Fri–Fri, Airport Pickup"));
  await db
    .update(itineraryEvents)
    .set({ description: "Premium Elite SUV at Harry Reid, Fri–Fri — loaded and rolling by 6." })
    .where(eq(itineraryEvents.title, "Pick Up the Rental SUV"));
  console.log("  updated: rental SUV is Escalade-class, and booked");

  // The board tracks money, not booking status — a line's Paid already says
  // whether it's handled. Keep the useful detail, drop the "Booked" preamble.
  const NOTES: [string, string][] = [
    [
      "Air Travel — Delta",
      "H2UQO8 · flights $1,756.28 + trip protection $140.80 + taxes & fees $254.92 — BeX covered it",
    ],
    [
      "Luxor All-Inclusive",
      "$816.22 total: $391.10 paid on the 2941 card, $425.12 due at the resort · all-inclusive covers breakfast, lunch & dinner Wed–Fri · fully BeX's",
    ],
  ];
  for (const [label, notes] of NOTES) {
    const [row] = await db
      .update(budgetItems)
      .set({ notes })
      .where(eq(budgetItems.label, label))
      .returning({ label: budgetItems.label });
    console.log(row ? `  denoted: ${row.label}` : `  missing: ${label}`);
  }

  console.log("Round 29 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
