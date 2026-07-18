"use server";

import { eq, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  budgetItems,
  checklistItems,
  expenses,
  lodging,
  tripSettings,
  votes,
} from "@/db/schema";
import { requireActor } from "@/lib/identity";

/** A budget line with logged expenses always shows their sum as its actual. */
async function recomputeActual(budgetItemId: number) {
  const [row] = await db
    .select({ total: sum(expenses.amountCents) })
    .from(expenses)
    .where(eq(expenses.budgetItemId, budgetItemId));
  const total = row?.total == null ? null : Number(row.total);
  await db.update(budgetItems).set({ actualCents: total }).where(eq(budgetItems.id, budgetItemId));
}

export async function addExpense(
  travelerId: number,
  budgetItemId: number,
  amountCents: number,
  note?: string,
) {
  await requireActor();
  const amount = Math.round(amountCents);
  if (!Number.isFinite(amount) || amount <= 0) return;
  await db.insert(expenses).values({
    travelerId,
    budgetItemId,
    amountCents: amount,
    note: note?.trim().slice(0, 200) || null,
  });
  await recomputeActual(budgetItemId);
  revalidatePath("/expenses");
  revalidatePath("/finances");
  revalidatePath("/");
}

export async function deleteExpense(id: number) {
  await requireActor();
  const [gone] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
  if (gone) await recomputeActual(gone.budgetItemId);
  revalidatePath("/expenses");
  revalidatePath("/finances");
  revalidatePath("/");
}

/** Voting is a toggle: voting for the scenario you already picked removes your vote. */
export async function castVote(travelerId: number, scenarioId: number) {
  await requireActor();
  const [existing] = await db.select().from(votes).where(eq(votes.travelerId, travelerId));
  if (existing && existing.scenarioId === scenarioId) {
    await db.delete(votes).where(eq(votes.id, existing.id));
  } else {
    await db
      .insert(votes)
      .values({ travelerId, scenarioId })
      .onConflictDoUpdate({
        target: votes.travelerId,
        set: { scenarioId, createdAt: new Date() },
      });
  }
  revalidatePath("/scenarios");
  revalidatePath("/");
}

export async function toggleChecklistItem(id: number, done: boolean) {
  await requireActor();
  await db.update(checklistItems).set({ done }).where(eq(checklistItems.id, id));
  revalidatePath("/lists");
}

export async function addChecklistItem(list: string, label: string) {
  await requireActor();
  const trimmed = label.trim().slice(0, 200);
  if (!trimmed) return;
  await db.insert(checklistItems).values({ list, label: trimmed, sortOrder: 999 });
  revalidatePath("/lists");
}

export async function deleteChecklistItem(id: number) {
  await requireActor();
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
  revalidatePath("/lists");
}

export async function updateBudgetItem(
  id: number,
  patch: { label?: string; plannedCents?: number; actualCents?: number | null },
) {
  await requireActor();
  const set: Record<string, unknown> = {};
  if (patch.label !== undefined) set.label = patch.label.trim().slice(0, 200);
  if (patch.plannedCents !== undefined) set.plannedCents = Math.max(0, Math.round(patch.plannedCents));
  if (patch.actualCents !== undefined) {
    set.actualCents = patch.actualCents === null ? null : Math.max(0, Math.round(patch.actualCents));
  }
  if (Object.keys(set).length === 0) return;
  await db.update(budgetItems).set(set).where(eq(budgetItems.id, id));
  revalidatePath("/finances");
  revalidatePath("/");
}

export async function addBudgetItem(
  travelerId: number,
  label: string,
  category: string,
  plannedCents: number,
  actualCents: number | null = null,
) {
  await requireActor();
  const trimmed = label.trim().slice(0, 200);
  if (!trimmed) return;
  const allowed = ["lodging", "food", "gas", "experience", "gifts", "misc"];
  await db.insert(budgetItems).values({
    travelerId,
    label: trimmed,
    category: allowed.includes(category) ? category : "misc",
    plannedCents: Math.max(0, Math.round(plannedCents)),
    actualCents: actualCents === null ? null : Math.max(0, Math.round(actualCents)),
  });
  revalidatePath("/finances");
  revalidatePath("/");
}

export async function deleteBudgetItem(id: number) {
  await requireActor();
  await db.delete(budgetItems).where(eq(budgetItems.id, id));
  revalidatePath("/finances");
  revalidatePath("/");
}

export async function updateLodgingBooking(
  id: number,
  patch: {
    bookingStatus: "planned" | "booked";
    actualCents?: number | null;
    confirmationNumber?: string | null;
  },
) {
  await requireActor();
  const set: Record<string, unknown> = { bookingStatus: patch.bookingStatus };
  if (patch.actualCents !== undefined) {
    set.actualCents = patch.actualCents === null ? null : Math.max(0, Math.round(patch.actualCents));
  }
  if (patch.confirmationNumber !== undefined) {
    set.confirmationNumber = patch.confirmationNumber?.trim().slice(0, 60) || null;
  }
  await db.update(lodging).set(set).where(eq(lodging.id, id));
  revalidatePath("/lodging");
  revalidatePath("/");
}

const scenarioPaths = ["/scenarios", "/finances", "/itinerary", "/"];

export async function lockScenario(scenarioId: number) {
  await requireActor();
  await db.update(tripSettings).set({ lockedScenarioId: scenarioId, lockedAt: new Date() });
  for (const p of scenarioPaths) revalidatePath(p);
}

export async function unlockScenario() {
  await requireActor();
  await db.update(tripSettings).set({ lockedScenarioId: null, lockedAt: null });
  for (const p of scenarioPaths) revalidatePath(p);
}
