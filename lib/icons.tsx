import {
  BedDouble,
  Car,
  Dices,
  Home,
  type LucideIcon,
  ListChecks,
  Map as MapIcon,
  Plane,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";

/** Nav destinations → Lucide icon. Keyed by route so Nav stays declarative. */
export const NAV_ICON: Record<string, LucideIcon> = {
  "/": Home,
  "/itinerary": MapIcon,
  "/scenarios": Dices,
  "/finances": Wallet,
  "/expenses": Receipt,
  "/lodging": BedDouble,
  "/lists": ListChecks,
};

/** The road vehicle for a scenario slug (Forester = car, rental = truck/SUV). */
function roadIcon(slug: string): LucideIcon {
  return slug.includes("rental") ? Truck : Car;
}

/**
 * Renders the travel-mode marker for a plan. Handles the itinerary plan keys
 * ("drive" | "fly" | "hybrid") and the scenario slugs ("forester", "rental-suv",
 * "fly", "hybrid-forester", "hybrid-rental"). Split plans show car + plane.
 */
export function PlanIcon({
  plan,
  className = "h-4 w-4",
}: {
  plan: string;
  className?: string;
}) {
  const isHybrid = plan.startsWith("hybrid") || plan === "hybrid";
  const isFly = plan === "fly";

  if (isHybrid) {
    const Road = roadIcon(plan);
    return (
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        <Road className={className} />
        <Plane className={className} />
      </span>
    );
  }
  const Icon = isFly ? Plane : roadIcon(plan);
  return <Icon className={className} aria-hidden />;
}

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
