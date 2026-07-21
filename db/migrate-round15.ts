import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { type CostLine, scenarios } from "./schema";

/**
 * Round 15 — the fly plan's lodging, itemized per night.
 *
 * It was two aggregate lines that hid three real things:
 *   - the Fri Aug 7 fly-in night was inside "Henderson, 4 nights" and invisible
 *     (and the label misread "Mon–Wed" when Aug 12 is the Luxor check-in)
 *   - Sat Aug 8 in Sedona is a weekend night and costs more than Sunday
 *   - the Fri Aug 14 last night silently assumed Henderson, with no sign of what
 *     extending the Luxor would cost
 *
 * Now every night is its own line, and the last night carries an `alternative`
 * so the open decision is visible with both prices.
 *
 * Sedona $288 -> $344 (Sat $200 + Sun $144). Henderson stays $216, just legible.
 */
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const HENDERSON_NIGHT = 5400;

export const FLY_LODGING: CostLine[] = [
  {
    label: "BW Henderson — Fri Aug 7, the fly-in night",
    cents: HENDERSON_NIGHT,
    owner: "pithya",
    key: "henderson",
    confidence: "rate",
  },
  {
    label: "Sedona — Sat Aug 8 (weekend rate)",
    cents: 20000,
    owner: "pithya",
    key: "sedona",
    confidence: "rate",
  },
  {
    label: "Sedona — Sun Aug 9",
    cents: 14400,
    owner: "pithya",
    key: "sedona",
    confidence: "rate",
  },
  {
    label: "BW Henderson — Mon + Tue, Aug 10–11",
    cents: HENDERSON_NIGHT * 2,
    owner: "pithya",
    key: "henderson",
    confidence: "rate",
  },
  {
    label: "Last Night — BW Henderson, Fri Aug 14",
    cents: HENDERSON_NIGHT,
    owner: "pithya",
    key: "henderson",
    confidence: "rate",
    alternative: { label: "or extend the Luxor — 2 rooms × $100", cents: 20000 },
  },
];

async function main() {
  const [row] = await db.select().from(scenarios).where(eq(scenarios.slug, "fly"));
  if (!row) throw new Error("missing fly scenario");

  // keep everything that isn't lodging, then re-add it night by night
  const kept = row.costLines.filter((l) => l.key !== "sedona" && l.key !== "henderson");
  const lines = [...kept, ...FLY_LODGING];
  await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.slug, "fly"));

  for (const l of FLY_LODGING) {
    console.log(
      `  ${l.label.padEnd(42)} $${(l.cents / 100).toFixed(2)}` +
        (l.alternative ? `   [${l.alternative.label} $${(l.alternative.cents / 100).toFixed(2)}]` : ""),
    );
  }
  console.log(`  fly total $${(lines.reduce((a, l) => a + l.cents, 0) / 100).toFixed(2)}`);
  console.log("Round 15 migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
