import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// All money is stored as integer cents.

export const travelers = pgTable("travelers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  clerkEmail: text("clerk_email"),
  budgetTotalCents: integer("budget_total_cents").notNull().default(0),
  nonNegotiableCents: integer("non_negotiable_cents"),
  color: text("color").notNull().default("#e07a3f"),
  emoji: text("emoji").notNull().default("🌵"),
});

export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  travelerId: integer("traveler_id").references(() => travelers.id),
  label: text("label").notNull(),
  // lodging | food | gas | experience | gifts | misc
  category: text("category").notNull().default("misc"),
  plannedCents: integer("planned_cents").notNull().default(0),
  actualCents: integer("actual_cents"),
  notes: text("notes"),
});

export const lodging = pgTable("lodging", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  plannedCents: integer("planned_cents").notNull().default(0),
  actualCents: integer("actual_cents"),
  // planned | booked
  bookingStatus: text("booking_status").notNull().default("planned"),
  cancelBy: date("cancel_by"),
  // desert | vegas — drives the section theming
  theme: text("theme").notNull().default("desert"),
  notes: text("notes"),
});

export const itineraryEvents = pgTable("itinerary_events", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  time: text("time"),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  theme: text("theme").notNull().default("desert"),
});

export type CostLine = { label: string; cents: number; estimate?: boolean };

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  travelSummary: text("travel_summary"),
  emoji: text("emoji").notNull().default("🚗"),
  pros: jsonb("pros").$type<string[]>().notNull().default([]),
  cons: jsonb("cons").$type<string[]>().notNull().default([]),
  costLines: jsonb("cost_lines").$type<CostLine[]>().notNull().default([]),
});

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    scenarioId: integer("scenario_id")
      .notNull()
      .references(() => scenarios.id),
    travelerId: integer("traveler_id")
      .notNull()
      .references(() => travelers.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("votes_traveler_unique").on(t.travelerId)],
);

export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  // pre-trip | groceries | sedona-restock | packing
  list: text("list").notNull(),
  label: text("label").notNull(),
  done: boolean("done").notNull().default(false),
  assignee: text("assignee"),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
});
