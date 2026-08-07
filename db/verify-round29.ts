import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { budgetItems, expenses, lodging, travelers } from "./schema";

/**
 * Guards the ledger's one rule: every page's money comes from the expense log.
 *
 * Round 23's checker asserted a snapshot of hardcoded totals, which any real
 * edit invalidates. These are structural instead — they hold no matter how much
 * the family spends. Each payment sits on exactly one line (one column) and has
 * exactly one payer, so the same dollars have to add up three different ways.
 */
const db = drizzle(neon(process.env.DATABASE_URL!));
const f = (c: number) => "$" + (c / 100).toFixed(2);

async function main() {
  const [ts, items, exps, stays] = await Promise.all([
    db.select().from(travelers),
    db.select().from(budgetItems),
    db.select().from(expenses),
    db.select().from(lodging),
  ]);
  const nameById = new Map(ts.map((t) => [t.id, t.name]));
  const itemById = new Map(items.map((i) => [i.id, i]));

  let fails = 0;
  const fail = (...m: unknown[]) => {
    fails++;
    console.error("  FAIL:", ...m);
  };

  const paidByLine = new Map<number, number>();
  for (const e of exps) {
    paidByLine.set(e.budgetItemId, (paidByLine.get(e.budgetItemId) ?? 0) + e.amountCents);
  }

  // 1. actualCents is a cache of the log, nothing more
  for (const i of items) {
    const logged = paidByLine.get(i.id) ?? 0;
    const cached = i.actualCents ?? 0;
    if (cached !== logged) {
      fail(`${i.label}: cached paid ${f(cached)} ≠ logged ${f(logged)}`);
    }
  }

  // 2. an expense on a dormant ($0) line is money the board can't show
  for (const e of exps) {
    const line = itemById.get(e.budgetItemId);
    if (!line) fail(`expense ${e.id} points at a missing line`);
    else if (line.plannedCents === 0) {
      fail(`${line.label}: has ${f(paidByLine.get(line.id) ?? 0)} logged but costs $0 (dormant)`);
    }
  }

  // 3. a hotel has one price, on its budget line — nothing left on lodging to drift
  for (const s of stays) {
    if (s.actualCents !== null) {
      fail(`${s.name}: still carries its own price (${f(s.actualCents)}) — round 30 retired that`);
    }
    if (s.budgetItemId === null) {
      console.warn(`  WARN: ${s.name} isn't linked to a budget line — shows projected only`);
    } else if (!itemById.has(s.budgetItemId)) {
      fail(`${s.name}: points at a budget line that no longer exists`);
    }
  }

  // 4. the same dollars, three ways: the raw log, grouped by line owner, grouped by payer
  const total = exps.reduce((s, e) => s + e.amountCents, 0);
  const byColumn = new Map<string, number>();
  for (const i of items.filter((i) => i.plannedCents > 0)) {
    const col = i.travelerId === null ? "The Crew" : (nameById.get(i.travelerId) ?? "?");
    byColumn.set(col, (byColumn.get(col) ?? 0) + (paidByLine.get(i.id) ?? 0));
  }
  const byPayer = new Map<string, number>();
  for (const e of exps) {
    const who = nameById.get(e.travelerId) ?? "?";
    byPayer.set(who, (byPayer.get(who) ?? 0) + e.amountCents);
  }
  const coveredSum = [...byColumn.values()].reduce((s, c) => s + c, 0);
  const payerSum = [...byPayer.values()].reduce((s, c) => s + c, 0);
  if (coveredSum !== total) fail("covered by column", f(coveredSum), "≠ logged", f(total));
  if (payerSum !== total) fail("put in by payer", f(payerSum), "≠ logged", f(total));

  const tripTotal = items
    .filter((i) => i.plannedCents > 0)
    .reduce((s, i) => s + i.plannedCents, 0);

  console.log("  Covered, by whose line it is:");
  for (const [col, cents] of [...byColumn].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${col.padEnd(9)} ${f(cents)}`);
  }
  console.log("  Put in, by who paid:");
  for (const [who, cents] of [...byPayer].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${who.padEnd(9)} ${f(cents)}`);
  }

  // reported, not failed: overpaying a line is real life, not corruption
  const over = items
    .filter((i) => i.plannedCents > 0 && (paidByLine.get(i.id) ?? 0) > i.plannedCents)
    .map((i) => `${i.label}: paid ${f(paidByLine.get(i.id) ?? 0)} vs cost ${f(i.plannedCents)}`);
  if (over.length) {
    console.log("\n  Over plan (worth a look, not an error):");
    for (const line of over) console.log(`    ${line}`);
  }

  console.log(
    `\n  Trip total ${f(tripTotal)} · paid ${f(total)} · ${
      tripTotal >= total ? `left ${f(tripTotal - total)}` : `over ${f(total - tripTotal)}`
    }`,
  );
  console.log(fails ? `\n${fails} FAILURE(S)` : "\nLedger reconciles.");
  if (fails) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
