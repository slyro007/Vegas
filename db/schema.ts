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
  // yellow pad = the original hand-planned budget; planned = the refined/real number
  yellowPadCents: integer("yellow_pad_cents").notNull().default(0),
  plannedCents: integer("planned_cents").notNull().default(0),
  actualCents: integer("actual_cents"),
  // shared trip cost (transport/lodging/road food) — the Estimated column splits
  // these evenly 4 ways per scenario; personal lines stay with the person
  shared: boolean("shared").notNull().default(false),
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
  confirmationNumber: text("confirmation_number"),
  // desert | vegas — drives the section theming
  theme: text("theme").notNull().default("desert"),
  notes: text("notes"),
});

export const tripSettings = pgTable("trip_settings", {
  id: serial("id").primaryKey(),
  lockedScenarioId: integer("locked_scenario_id").references(() => scenarios.id),
  lockedAt: timestamp("locked_at"),
  // free-text note for "we're short $X — here's where the rest comes from"
  shortfallNote: text("shortfall_note"),
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
  // space-separated plan tags this event belongs to: "all" or any of drive | fly | hybrid
  plan: text("plan").notNull().default("all"),
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
  itineraryOutline: jsonb("itinerary_outline")
    .$type<{ day: string; plan: string }[]>()
    .notNull()
    .default([]),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  travelerId: integer("traveler_id")
    .notNull()
    .references(() => travelers.id),
  // every expense must land on a budget line; the line's actual = SUM of its expenses
  budgetItemId: integer("budget_item_id")
    .notNull()
    .references(() => budgetItems.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  spentOn: date("spent_on").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
