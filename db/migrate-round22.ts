import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, checklistItems, lodging, travelers } from "./schema";

/**
 * Round 22 — the Luxor is BOOKED (it beat Excalibur), and the Spend data
 * catches up with the booked trip.
 *
 * The real booking: grand total $816.22 · $391.10 paid on the 2941 card ·
 * $425.12 due at the resort. BeX already logged her deposit and the budget
 * line's planned was already bumped to $816.22 — this migration finishes the
 * job: names lose "or Excalibur" everywhere, the lodging row gets the real
 * price and payment story, the decide-and-book checklist item is done, and a
 * new reminder covers the balance due at check-in.
 *
 * Spend-tab hygiene: budget lines that the booked plan prices (costKey) get
 * their plannedCents synced to the plan's real totals — Henderson $162
 * (3 nights), Sedona $344 (Sat $200 + Sun $144) — and lines the plan RELEASED
 * (Flagstaff, road-trip gas + food) drop to $0 planned so no page implies
 * they're still spendable. The engine ignores plannedCents on costKey lines
 * (scenario cost lines are the truth), so family math is untouched.
 * travelers.budgetTotalCents still carried pre-bucket numbers; it now equals
 * each person's yellow-pad bucket, which is what Spend's "Budget left" means.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  /* ---------- the Luxor, booked ---------- */
  await db
    .update(budgetItems)
    .set({
      label: "Luxor All-Inclusive (Booked)",
      notes:
        "Booked — $816.22 total: $391.10 paid on the 2941 card, $425.12 due at the resort · all-inclusive covers breakfast, lunch & dinner Wed–Fri · fully BeX's",
    })
    .where(eq(budgetItems.label, "Luxor / Excalibur All-Inclusive"));

  await db
    .update(lodging)
    .set({
      name: "Luxor — All-Inclusive Experience",
      plannedCents: 81622,
      notes:
        "Booked over Excalibur — $816.22 total for 2 rooms: $391.10 paid, $425.12 due at the resort · covers breakfast, lunch & dinner Wed–Fri · free cancellation until Aug 9",
    })
    .where(eq(lodging.name, "Luxor or Excalibur — All-Inclusive"));

  await db
    .update(checklistItems)
    .set({
      label: "Booked: Luxor All-Inclusive",
      done: true,
      note: "$391.10 paid · $425.12 due at check-in · free cancellation until Aug 9",
    })
    .where(eq(checklistItems.label, "Decide + Book: Luxor vs Excalibur All-Inclusive"));

  // the balance is a during-trip payment nobody should have to remember cold
  const balanceLabel = "Pay the Luxor Balance at Check-In — $425.12";
  const [existing] = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.label, balanceLabel));
  if (!existing) {
    await db.insert(checklistItems).values({
      list: "pre-trip",
      sortOrder: 7,
      label: balanceLabel,
      assignee: "BeX",
      note: "Wed Aug 12, at the desk — the rest of the $816.22",
    });
  }

  /* ---------- Spend catches up with the booked plan ---------- */
  const planned: [string, number][] = [
    ["BW Henderson (Sun–Wed)", 16200], // Fri fly-in + Mon + Tue on John's rate
    ["Sedona Hotel (Fri)", 34400], // Sat $200 weekend rate + Sun $144
    ["Flagstaff Hotel (Sat)", 0], // released — no Flagstaff on the booked trip
    ["Road Trip Gas", 0], // released
    ["Road Trip Food", 0], // released
  ];
  for (const [label, cents] of planned) {
    await db.update(budgetItems).set({ plannedCents: cents }).where(eq(budgetItems.label, label));
  }

  const buckets: [string, number][] = [
    ["pithya", 155000],
    ["shy", 45000],
    ["bex", 300000],
    ["amma", 165000],
  ];
  for (const [slug, cents] of buckets) {
    await db.update(travelers).set({ budgetTotalCents: cents }).where(eq(travelers.slug, slug));
  }

  console.log("Round 22 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
