"use server";

import { asc, eq, max, sql, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  budgetItems,
  checklistItems,
  checklists,
  expenses,
  itineraryEvents,
  lodging,
  travelers,
  tripSettings,
} from "@/db/schema";
import { DEFAULT_CHECKLIST_ICON, isChecklistIcon } from "@/lib/checklistIcons";
import { CATEGORY_META } from "@/lib/format";
import { requireActor } from "@/lib/identity";
import { isVisibleEvent } from "@/lib/itinerary";

/** Every page derives its money from the expense log, so `actualCents` is only a
 *  cache of it. One statement, not select-then-update: two people logging at once
 *  would otherwise race, and the later write could carry the older sum. */
async function recomputeActual(budgetItemId: number) {
  await db
    .update(budgetItems)
    .set({
      actualCents: sql`(select sum(amount_cents)::int from expenses where budget_item_id = ${budgetItemId})`,
    })
    .where(eq(budgetItems.id, budgetItemId));
}

/** Every money page reads the log, so all three revalidate together. */
function revalidateMoney() {
  revalidatePath("/expenses");
  revalidatePath("/finances");
  revalidatePath("/");
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
  revalidateMoney();
}

/**
 * A spend nobody budgeted for: the line is born from the payment itself, costed
 * at what was actually spent so the budget grows to match reality.
 *
 * The line has to exist before the expense can point at it, and neon-http has no
 * transactions — so a failure on the expense rolls the line back by hand, leaving
 * nothing half-made and making a retry safe.
 */
export async function addExpenseWithNewLine(
  payerTravelerId: number,
  line: { ownerTravelerId: number | null; label: string; category: string },
  amountCents: number,
  note?: string,
) {
  await requireActor();
  const amount = Math.round(amountCents);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const label = line.label.trim().slice(0, 200);
  if (!label) return;

  const [created] = await db
    .insert(budgetItems)
    .values({
      travelerId: line.ownerTravelerId,
      label,
      category: line.category in CATEGORY_META ? line.category : "misc",
      // never on the yellow pad — this cost didn't exist when we planned
      yellowPadCents: 0,
      // must be the amount, not 0: every card filters on plannedCents > 0, so a
      // free line would hide its own payment from the board
      plannedCents: amount,
      shared: line.ownerTravelerId === null,
    })
    .returning({ id: budgetItems.id });

  try {
    await db.insert(expenses).values({
      travelerId: payerTravelerId,
      budgetItemId: created.id,
      amountCents: amount,
      note: note?.trim().slice(0, 200) || null,
    });
  } catch (err) {
    await db.delete(budgetItems).where(eq(budgetItems.id, created.id));
    throw err;
  }

  await recomputeActual(created.id);
  revalidateMoney();
}

export async function deleteExpense(id: number) {
  await requireActor();
  const [gone] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
  if (gone) await recomputeActual(gone.budgetItemId);
  revalidateMoney();
}

export async function toggleChecklistItem(id: number, done: boolean) {
  await requireActor();
  await db.update(checklistItems).set({ done }).where(eq(checklistItems.id, id));
  revalidatePath("/lists");
  revalidatePath("/"); // the homepage counts open to-dos and what's left to book
}

/** A new row carries the same three fields editing one does — who and the note
 *  are both optional, and empty means null rather than an empty string. */
export async function addChecklistItem(
  list: string,
  label: string,
  extra?: { assignee?: string | null; note?: string | null },
) {
  await requireActor();
  const trimmed = label.trim().slice(0, 200);
  if (!trimmed) return;
  // an item belongs to a real list — a stale tab can't strand rows under a dead key
  const [target] = await db.select().from(checklists).where(eq(checklists.key, list));
  if (!target) return;
  await db.insert(checklistItems).values({
    list,
    label: trimmed,
    assignee: extra?.assignee?.trim().slice(0, 60) || null,
    note: extra?.note?.trim().slice(0, 200) || null,
    sortOrder: 999,
  });
  revalidatePath("/lists");
  revalidatePath("/"); // the homepage counts open to-dos
}

export async function updateChecklistItem(
  id: number,
  patch: { label?: string; assignee?: string | null; note?: string | null },
) {
  await requireActor();
  const set: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const label = patch.label.trim().slice(0, 200);
    if (label) set.label = label; // label is NOT NULL — an emptied field stays unchanged
  }
  if (patch.assignee !== undefined) set.assignee = patch.assignee?.trim().slice(0, 60) || null;
  if (patch.note !== undefined) set.note = patch.note?.trim().slice(0, 200) || null;
  if (Object.keys(set).length === 0) return;
  await db.update(checklistItems).set(set).where(eq(checklistItems.id, id));
  revalidatePath("/lists");
  revalidatePath("/"); // the homepage's booking tiles match on pre-trip labels
}

export async function deleteChecklistItem(id: number) {
  await requireActor();
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
  revalidatePath("/lists");
  revalidatePath("/"); // the homepage counts open to-dos
}

const LIST_LABEL_MAX = 60;
const LIST_BLURB_MAX = 200;
const LIST_KEY_MAX = 40;

/** The stable slug a new list's items point at; the label stays free to rename. */
function listKey(label: string) {
  const base = label
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIST_KEY_MAX)
    .replace(/-+$/, "");
  return base || "list";
}

/** Creates a list and returns its key so the page can jump straight to it. */
export async function addChecklist(label: string, icon?: string, blurb?: string) {
  await requireActor();
  const trimmed = label.trim().slice(0, LIST_LABEL_MAX);
  if (!trimmed) return null;

  const existing = await db.select().from(checklists);
  const taken = new Set(existing.map((l) => l.key));
  const base = listKey(trimmed);
  let key = base;
  for (let n = 2; taken.has(key) && n <= 99; n++) {
    key = `${base.slice(0, LIST_KEY_MAX - 3).replace(/-+$/, "")}-${n}`;
  }
  if (taken.has(key)) return null; // 99 lists named the same thing: enough

  await db.insert(checklists).values({
    key,
    label: trimmed,
    blurb: blurb?.trim().slice(0, LIST_BLURB_MAX) || null,
    icon: icon && isChecklistIcon(icon) ? icon : DEFAULT_CHECKLIST_ICON,
    sortOrder: existing.reduce((top, l) => Math.max(top, l.sortOrder), -1) + 1,
  });
  revalidatePath("/lists");
  return key;
}

export async function updateChecklist(
  id: number,
  patch: { label?: string; blurb?: string | null; icon?: string },
) {
  await requireActor();
  const set: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const label = patch.label.trim().slice(0, LIST_LABEL_MAX);
    if (label) set.label = label; // label is NOT NULL — an emptied field stays unchanged
  }
  if (patch.blurb !== undefined) set.blurb = patch.blurb?.trim().slice(0, LIST_BLURB_MAX) || null;
  if (patch.icon !== undefined && isChecklistIcon(patch.icon)) set.icon = patch.icon;
  if (Object.keys(set).length === 0) return;
  await db.update(checklists).set(set).where(eq(checklists.id, id));
  revalidatePath("/lists");
}

/** Deleting a list takes its items with it. Items go first so a failure between
 *  the two (neon-http has no transactions) leaves an empty list rather than rows
 *  orphaned behind a key nothing renders. */
export async function deleteChecklist(id: number) {
  await requireActor();
  const [list] = await db.select().from(checklists).where(eq(checklists.id, id));
  if (!list) return;
  await db.delete(checklistItems).where(eq(checklistItems.list, list.key));
  await db.delete(checklists).where(eq(checklists.id, id));
  revalidatePath("/lists");
  revalidatePath("/"); // the homepage tiles read pre-trip rows
}

/** Paid isn't in the patch: it's the expense log's to write, via recomputeActual. */
export async function updateBudgetItem(
  id: number,
  patch: { label?: string; category?: string; plannedCents?: number },
) {
  await requireActor();
  const set: Record<string, unknown> = {};
  if (patch.label !== undefined) {
    const label = patch.label.trim().slice(0, 200);
    if (label) set.label = label; // label is NOT NULL — an emptied field stays unchanged
  }
  if (patch.category !== undefined && patch.category in CATEGORY_META) {
    set.category = patch.category;
  }
  if (patch.plannedCents !== undefined) {
    const planned = Math.max(0, Math.round(patch.plannedCents));
    // Releasing a line to $0 makes it dormant — every board filters on
    // plannedCents > 0 — which would hide payments the totals still count.
    // Asked of the log, not of actualCents: a stale cache would fail this open.
    if (planned === 0) {
      const [paid] = await db
        .select({ total: sum(expenses.amountCents) })
        .from(expenses)
        .where(eq(expenses.budgetItemId, id));
      if (paid?.total != null && Number(paid.total) > 0) return;
    }
    set.plannedCents = planned;
  }
  if (Object.keys(set).length === 0) return;
  await db.update(budgetItems).set(set).where(eq(budgetItems.id, id));
  revalidateMoney(); // the Spend page picker reads these labels and costs too
}

/** travelerId null puts the line in the shared "The Crew" column. */
export async function addBudgetItem(
  travelerId: number | null,
  label: string,
  category: string,
  plannedCents: number,
) {
  await requireActor();
  const trimmed = label.trim().slice(0, 200);
  if (!trimmed) return;
  const planned = Math.max(0, Math.round(plannedCents));
  await db.insert(budgetItems).values({
    travelerId,
    label: trimmed,
    category: category in CATEGORY_META ? category : "misc",
    // a new line's yellow-pad baseline is whatever it's first planned at
    yellowPadCents: planned,
    plannedCents: planned,
    shared: travelerId === null,
  });
  revalidateMoney();
}

export async function deleteBudgetItem(id: number) {
  await requireActor();
  await db.delete(budgetItems).where(eq(budgetItems.id, id));
  revalidateMoney();
}

/** What one person has to spend on the trip — the ceiling their lines sit under. */
export async function updateTravelerBudget(travelerId: number, cents: number) {
  await requireActor();
  const budget = Math.max(0, Math.round(cents));
  if (!Number.isFinite(budget)) return;
  await db
    .update(travelers)
    .set({ budgetTotalCents: budget })
    .where(eq(travelers.id, travelerId));
  revalidatePath("/finances");
}

/**
 * Booking a stay records two different kinds of fact. The travel ones — booked
 * or not, the confirmation number — belong to the stay. The price belongs to its
 * budget line, the same one Finances and the expense log read, so the two pages
 * can't tell different stories about the same hotel.
 */
export async function updateLodgingBooking(
  id: number,
  patch: {
    bookingStatus: "planned" | "booked";
    priceCents?: number;
    confirmationNumber?: string | null;
  },
) {
  await requireActor();
  const set: Record<string, unknown> = { bookingStatus: patch.bookingStatus };
  if (patch.confirmationNumber !== undefined) {
    set.confirmationNumber = patch.confirmationNumber?.trim().slice(0, 60) || null;
  }
  const [stay] = await db.update(lodging).set(set).where(eq(lodging.id, id)).returning();

  if (patch.priceCents !== undefined && stay?.budgetItemId != null) {
    await updateBudgetItem(stay.budgetItemId, { plannedCents: patch.priceCents });
  }
  revalidatePath("/lodging");
  revalidateMoney();
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


