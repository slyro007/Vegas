import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { budgetItems, lodging } from "./schema";

/**
 * Round 30 — one price per hotel.
 *
 * Every stay was recorded twice: a `lodging` row with its own planned/actual,
 * and a `budget_items` line with the same hotel's cost. Nothing synced them, so
 * they drifted — the real booked prices (with confirmation numbers) sat on the
 * Lodging page while Finances still showed the old projections, three of four
 * of them wrong.
 *
 * The budget line wins: it's what the ledger, the expense log and every total
 * already read. Each stay now points at its line and reads cost and payments
 * through it. `lodging.actual_cents` is retired — the booked price it held gets
 * copied onto the line first, then nulled, so there's nothing left to drift.
 */
const db = drizzle(neon(process.env.DATABASE_URL!));
const f = (c: number) => "$" + (c / 100).toFixed(2);

/** Matched on check-in date + the line's label — both are stable and unique here. */
const LINKS: { checkIn: string; label: string }[] = [
  { checkIn: "2026-08-07", label: "BW Henderson — Fri Aug 7 (Fly-In Night)" },
  { checkIn: "2026-08-08", label: "Sedona — Sat + Sun, Aug 8–9" },
  { checkIn: "2026-08-10", label: "BW Henderson — Mon + Tue, Aug 10–11" },
  { checkIn: "2026-08-12", label: "Luxor All-Inclusive" },
];

async function main() {
  await db.execute(sql`
    alter table lodging
      add column if not exists budget_item_id integer
      references budget_items(id) on delete set null
  `);
  console.log("  column:  lodging.budget_item_id");

  for (const link of LINKS) {
    const [stay] = await db.select().from(lodging).where(eq(lodging.checkIn, link.checkIn));
    const [line] = await db.select().from(budgetItems).where(eq(budgetItems.label, link.label));
    if (!stay || !line) {
      console.warn(`  missing: ${link.label} (stay ${!!stay}, line ${!!line})`);
      continue;
    }

    // the booked price is the real cost — move it onto the line before it's lost
    const booked = stay.actualCents;
    const priceChanged = booked !== null && booked !== line.plannedCents;
    if (priceChanged) {
      await db
        .update(budgetItems)
        .set({ plannedCents: booked })
        .where(eq(budgetItems.id, line.id));
    }
    await db
      .update(lodging)
      .set({ budgetItemId: line.id, actualCents: null })
      .where(eq(lodging.id, stay.id));

    console.log(
      `  linked:  ${stay.name} → "${line.label}"` +
        (priceChanged ? ` · cost ${f(line.plannedCents)} → ${f(booked)}` : ` · cost ${f(line.plannedCents)}`),
    );
  }

  const [{ orphans }] = await db
    .select({ orphans: sql<number>`count(*)::int` })
    .from(lodging)
    .where(sql`budget_item_id is null`);
  if (orphans > 0) console.warn(`  ${orphans} stay(s) still unlinked — they'll show projected only`);

  console.log("Round 30 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
