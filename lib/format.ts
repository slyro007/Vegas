export function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  const hasCents = cents % 100 !== 0;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-08-08" → local Date at midnight */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDay(iso: string): string {
  return parseDay(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtDayLong(iso: string): string {
  return parseDay(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((parseDay(checkOut).getTime() - parseDay(checkIn).getTime()) / DAY_MS);
}

export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = parseDay(iso);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export const CATEGORY_META: Record<string, { label: string; cssVar: string }> = {
  lodging: { label: "Lodging", cssVar: "var(--cat-lodging)" },
  food: { label: "Food", cssVar: "var(--cat-food)" },
  gas: { label: "Gas", cssVar: "var(--cat-gas)" },
  experience: { label: "Experience", cssVar: "var(--cat-experience)" },
  gifts: { label: "Gifts", cssVar: "var(--cat-gifts)" },
  misc: { label: "Misc", cssVar: "var(--cat-misc)" },
};
