/**
 * Round 8 one-off migration (2026-07-17):
 * Add the Vegas lodging (BW Henderson + the Luxor) into every scenario's cost
 * breakdown, so each plan's total reflects the hotels, not just the road stops.
 * The fly plan carries two extra Henderson nights (Fri in + Fri before the flight).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { scenarios } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  const rows = await db.select().from(scenarios);
  for (const s of rows) {
    const lines = [...s.costLines];
    if (lines.some((l) => /Luxor/i.test(l.label))) {
      console.log(`· ${s.slug} already has lodging, skipping`);
      continue;
    }
    const fly = s.slug === "fly";
    lines.push({
      label: fly ? "BW Henderson (5 Vegas Nights)" : "BW Henderson (Vegas Base)",
      cents: fly ? 27000 : 20000,
    });
    lines.push({ label: "Luxor All-Inclusive (2 Rooms)", cents: 72096 });
    await db.update(scenarios).set({ costLines: lines }).where(eq(scenarios.id, s.id));
    const total = lines.reduce((a, l) => a + l.cents, 0);
    console.log(`✓ ${s.slug} → ${lines.length} lines, total $${(total / 100).toFixed(2)}`);
  }
  console.log("Round 8 migration complete ✅");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
