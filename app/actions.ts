"use server";

import { asc, eq, max, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  budgetItems,
  checklistItems,
  expenses,
  itineraryEvents,
  lodging,
  tripSettings,
} from "@/db/schema";
import { requireActor } from "@/lib/identity";
import { isVisibleEvent } from "@/lib/itinerary";

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
  const allowed = ["travel", "lodging", "food", "gas", "experience", "gifts", "misc"];
  const planned = Math.max(0, Math.round(plannedCents));
  await db.insert(budgetItems).values({
    travelerId,
    label: trimmed,
    category: allowed.includes(category) ? category : "misc",
    // a new line's yellow-pad baseline is whatever it's first planned at
    yellowPadCents: planned,
    plannedCents: planned,
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

export async function updateShortfallNote(note: string) {
  await requireActor();
  await db.update(tripSettings).set({ shortfallNote: note.trim().slice(0, 400) || null });
  revalidatePath("/finances");
}

const ITINERARY_THEMES = ["desert", "vegas"];
// Date.parse alone rolls "2026-02-30" over to March — round-trip the components
// so Postgres never sees a calendar-invalid date.
const isIsoDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** New and moved events land after everything already on that date — hidden
 *  drive-era rows included — so they render last among the visible ones. */
async function nextSortOrder(date: string) {
  const [row] = await db
    .select({ top: max(itineraryEvents.sortOrder) })
    .from(itineraryEvents)
    .where(eq(itineraryEvents.date, date));
  return (row?.top == null ? -1 : Number(row.top)) + 1;
}

export async function addItineraryEvent(
  date: string,
  input: { title: string; time?: string; description?: string; location?: string; theme?: string },
) {
  await requireActor();
  const title = input.title.trim().slice(0, 200);
  if (!title || !isIsoDate(date)) return;
  await db.insert(itineraryEvents).values({
    date,
    sortOrder: await nextSortOrder(date),
    title,
    time: input.time?.trim().slice(0, 40) || null,
    description: input.description?.trim().slice(0, 400) || null,
    location: input.location?.trim().slice(0, 200) || null,
    theme: input.theme && ITINERARY_THEMES.includes(input.theme) ? input.theme : "desert",
    plan: "all", // never exposed in the UI; "all" renders under any plan key
  });
  revalidatePath("/itinerary");
  revalidatePath("/");
}

export async function updateItineraryEvent(
  id: number,
  patch: {
    title?: string;
    time?: string | null;
    description?: string | null;
    location?: string | null;
    theme?: string;
    date?: string;
  },
) {
  await requireActor();
  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, 200);
    if (title) set.title = title; // title is NOT NULL — an emptied field stays unchanged
  }
  if (patch.time !== undefined) set.time = patch.time?.trim().slice(0, 40) || null;
  if (patch.description !== undefined) {
    set.description = patch.description?.trim().slice(0, 400) || null;
  }
  if (patch.location !== undefined) set.location = patch.location?.trim().slice(0, 200) || null;
  if (patch.theme !== undefined && ITINERARY_THEMES.includes(patch.theme)) set.theme = patch.theme;
  if (patch.date !== undefined && isIsoDate(patch.date)) {
    // a moved event lands at the end of its new day
    set.date = patch.date;
    set.sortOrder = await nextSortOrder(patch.date);
  }
  if (Object.keys(set).length === 0) return;
  await db.update(itineraryEvents).set(set).where(eq(itineraryEvents.id, id));
  revalidatePath("/itinerary");
  revalidatePath("/");
}

export async function deleteItineraryEvent(id: number) {
  await requireActor();
  await db.delete(itineraryEvents).where(eq(itineraryEvents.id, id));
  revalidatePath("/itinerary");
  revalidatePath("/");
}

export async function moveItineraryEvent(id: number, direction: "up" | "down") {
  await requireActor();
  const [target] = await db.select().from(itineraryEvents).where(eq(itineraryEvents.id, id));
  if (!target) return;
  const dayRows = await db
    .select()
    .from(itineraryEvents)
    .where(eq(itineraryEvents.date, target.date))
    .orderBy(asc(itineraryEvents.sortOrder), asc(itineraryEvents.id));
  const visible = dayRows.filter((e) => isVisibleEvent(e.plan));
  const i = visible.findIndex((e) => e.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= visible.length) return;
  [visible[i], visible[j]] = [visible[j], visible[i]];
  // Renumber the visible events 0..n-1, touching only rows that change: heals
  // any sortOrder ties, never rewrites hidden drive-era rows, and stays safe
  // without transactions (neon-http has none) — a mid-sequence failure leaves
  // at worst a transient tie that the next move repairs.
  for (let k = 0; k < visible.length; k++) {
    if (visible[k].sortOrder !== k) {
      await db
        .update(itineraryEvents)
        .set({ sortOrder: k })
        .where(eq(itineraryEvents.id, visible[k].id));
    }
  }
  revalidatePath("/itinerary");
  revalidatePath("/");
}


