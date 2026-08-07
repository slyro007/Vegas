import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { checklistItems, checklists } from "./schema";

/**
 * Round 27 — the lists on /lists stop being hard-coded. Creates the `checklists`
 * table and backfills the four the trip started with (keys, labels and blurbs
 * lifted straight off the old LISTS constant in components/Checklist.tsx), so the
 * page looks identical the moment it goes live and the family can add their own.
 *
 * Any list key already sitting in checklist_items but not named here gets a row
 * too — nothing gets stranded. Idempotent: safe to re-run, which is why `build`
 * runs it — a deploy brings its own schema.
 */
if (!process.env.DATABASE_URL) {
  // a build with no database configured (a preview without the env var) still
  // ships; the migration runs on the next build that can reach one
  console.log("Round 27 migration skipped — no DATABASE_URL.");
  process.exit(0);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const BUILT_IN = [
  {
    key: "pre-trip",
    label: "Pre-trip",
    icon: "ClipboardList",
    blurb: "Everything that has to happen before Aug 7.",
  },
  {
    key: "groceries",
    label: "Grocery run",
    icon: "Snowflake",
    blurb: "Amma-safe groceries, first stop once we have the SUV.",
  },
  {
    key: "sedona-restock",
    label: "Sedona restock",
    icon: "Mountain",
    blurb: "Before the Monday drive back — groceries and a full tank.",
  },
  {
    key: "packing",
    label: "Packing",
    icon: "Backpack",
    blurb: "Swimsuits for Slide Rock, jeans for the horses.",
  },
];

async function main() {
  console.log("Creating checklists…");
  await sql.query(`CREATE TABLE IF NOT EXISTS checklists (
    id serial PRIMARY KEY,
    "key" text NOT NULL UNIQUE,
    label text NOT NULL,
    blurb text,
    icon text NOT NULL DEFAULT 'ClipboardList',
    sort_order integer NOT NULL DEFAULT 0
  )`);

  const existing = new Set(
    (await db.select({ key: checklists.key }).from(checklists)).map((r) => r.key),
  );

  let order = 0;
  for (const list of BUILT_IN) {
    if (existing.has(list.key)) {
      console.log(`  ${list.key.padEnd(15)} already there`);
      order++;
      continue;
    }
    await db.insert(checklists).values({ ...list, sortOrder: order++ });
    console.log(`  ${list.key.padEnd(15)} → "${list.label}"`);
  }

  // anything the items point at that we didn't just name (older rounds, hand edits)
  const used = new Set(
    (await db.select({ list: checklistItems.list }).from(checklistItems)).map((r) => r.list),
  );
  const named = new Set([...existing, ...BUILT_IN.map((l) => l.key)]);
  for (const key of used) {
    if (named.has(key)) continue;
    await db.insert(checklists).values({
      key,
      label: key.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
      icon: "ClipboardList",
      sortOrder: order++,
    });
    console.log(`  ${key.padEnd(15)} → rescued (had items, no list)`);
  }

  console.log("Round 27 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
