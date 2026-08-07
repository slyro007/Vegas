import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";

/**
 * Round 28 — the road trip is over. We fly, and we have since round 10; the
 * drive-era itinerary rows have been carried along hidden ever since, filtered
 * out of every page by isVisibleEvent(). They were kept as a record of the plan
 * we didn't take. That record has outlived its use, so this drops them.
 *
 * The rule here is deliberately the same one lib/itinerary.ts renders by: a row
 * survives if its plan is "all" or lists "fly" among its space-separated tags.
 * Anything else was never going to appear on the site again. Idempotent — a
 * second run matches nothing.
 */
if (!process.env.DATABASE_URL) {
  console.log("Round 28 migration skipped — no DATABASE_URL.");
  process.exit(0);
}

const sql = neon(process.env.DATABASE_URL);

// mirrors isVisibleEvent(): plan === "all" || plan.split(" ").includes("fly")
const INVISIBLE = `plan <> 'all' AND plan !~ '(^| )fly( |$)'`;

async function main() {
  const doomed = await sql.query(
    `SELECT id, date, title, plan FROM itinerary_events WHERE ${INVISIBLE} ORDER BY date, sort_order`,
  );

  if (doomed.length === 0) {
    console.log("Round 28 — no drive-era events left to clear.");
    return;
  }

  console.log(`Clearing ${doomed.length} drive-era events:`);
  for (const row of doomed) {
    console.log(`  ${String(row.plan).padEnd(7)} ${String(row.date).slice(0, 10)}  ${row.title}`);
  }

  await sql.query(`DELETE FROM itinerary_events WHERE ${INVISIBLE}`);

  const [{ count }] = await sql.query(`SELECT count(*)::int AS count FROM itinerary_events`);
  console.log(`Round 28 migration complete — ${count} events remain, all of them the real trip.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
