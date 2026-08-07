import {
  BedDouble,
  Home,
  type LucideIcon,
  ListChecks,
  Map as MapIcon,
  Receipt,
  Wallet,
} from "lucide-react";

/** Nav destinations → Lucide icon. Keyed by route so Nav stays declarative. */
export const NAV_ICON: Record<string, LucideIcon> = {
  "/": Home,
  "/itinerary": MapIcon,
  "/finances": Wallet,
  "/expenses": Receipt,
  "/lodging": BedDouble,
  "/lists": ListChecks,
};

/** A traveler's avatar: a color-tinted circle with their monogram initial. */
export function TravelerAvatar({
  name,
  color,
  className = "h-10 w-10 text-base",
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 22%, transparent)`,
        color,
      }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
