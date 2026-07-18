import { asc, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  budgetItems,
  checklistItems,
  expenses,
  itineraryEvents,
  lodging,
  scenarios,
  travelers,
  tripSettings,
  votes,
} from "@/db/schema";

export async function getTravelers() {
  return db.select().from(travelers).orderBy(asc(travelers.id));
}

export async function getBudgetItems() {
  return db.select().from(budgetItems).orderBy(asc(budgetItems.id));
}

export async function getLodging() {
  return db.select().from(lodging).orderBy(asc(lodging.checkIn));
}

export async function getItinerary() {
  return db
    .select()
    .from(itineraryEvents)
    .orderBy(asc(itineraryEvents.date), asc(itineraryEvents.sortOrder));
}

export async function getScenarios() {
  return db.select().from(scenarios).orderBy(asc(scenarios.id));
}

export async function getVotes() {
  return db.select().from(votes);
}

export async function getChecklist() {
  return db
    .select()
    .from(checklistItems)
    .orderBy(asc(checklistItems.sortOrder), asc(checklistItems.id));
}

export async function getTripSettings() {
  const rows = await db.select().from(tripSettings);
  return rows[0] ?? { id: 0, lockedScenarioId: null, lockedAt: null, shortfallNote: null };
}

export async function getExpenses() {
  return db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt));
}

export type Traveler = Awaited<ReturnType<typeof getTravelers>>[number];
export type Expense = Awaited<ReturnType<typeof getExpenses>>[number];
export type TripSettings = Awaited<ReturnType<typeof getTripSettings>>;
export type BudgetItem = Awaited<ReturnType<typeof getBudgetItems>>[number];
export type LodgingStay = Awaited<ReturnType<typeof getLodging>>[number];
export type ItineraryEvent = Awaited<ReturnType<typeof getItinerary>>[number];
export type Scenario = Awaited<ReturnType<typeof getScenarios>>[number];
export type Vote = Awaited<ReturnType<typeof getVotes>>[number];
export type ChecklistItem = Awaited<ReturnType<typeof getChecklist>>[number];
