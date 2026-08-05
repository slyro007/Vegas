// The trip is booked — one itinerary. Drive-era events stay in the DB as
// history; only "all" + PLAN_KEY events render. The pages and the server
// actions must agree on that rule, so it lives here (a plain module both
// client and server code can import).
export const PLAN_KEY = "fly";

export function isVisibleEvent(plan: string): boolean {
  return plan === "all" || plan.split(" ").includes(PLAN_KEY);
}

export const TRIP_START = "2026-08-07";
export const TRIP_END = "2026-08-14";

export const TRIP_DAYS = [
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Day number relative to TRIP_START — stable whether or not empty days render. */
export function dayNumberFor(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(TRIP_START)) / DAY_MS) + 1;
}
