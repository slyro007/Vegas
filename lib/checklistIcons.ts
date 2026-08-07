import {
  Backpack,
  Camera,
  Car,
  ClipboardList,
  Coffee,
  Dices,
  Fuel,
  Gift,
  Heart,
  ListChecks,
  type LucideIcon,
  MapPin,
  Mountain,
  Music,
  Pill,
  Plane,
  Shirt,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Sun,
  Ticket,
  Utensils,
  Wallet,
  Waves,
} from "lucide-react";

/**
 * The icons a list can wear, keyed by the exact Lucide name stored in
 * `checklists.icon`. This map is the whole allow-list: the server validates
 * against it and the picker renders it, so adding an icon here offers it.
 */
export const CHECKLIST_ICONS = {
  ClipboardList,
  ListChecks,
  ShoppingCart,
  Snowflake,
  Utensils,
  Coffee,
  Backpack,
  Shirt,
  Pill,
  Camera,
  Music,
  Gift,
  Car,
  Plane,
  Fuel,
  MapPin,
  Mountain,
  Waves,
  Sun,
  Ticket,
  Dices,
  Wallet,
  Heart,
  Sparkles,
} satisfies Record<string, LucideIcon>;

export type ChecklistIconName = keyof typeof CHECKLIST_ICONS;

export const DEFAULT_CHECKLIST_ICON: ChecklistIconName = "ClipboardList";

export function isChecklistIcon(name: string): name is ChecklistIconName {
  return Object.hasOwn(CHECKLIST_ICONS, name);
}

/** Every stored name resolves to something renderable — unknown ones fall back. */
export function checklistIcon(name: string): LucideIcon {
  return isChecklistIcon(name) ? CHECKLIST_ICONS[name] : CHECKLIST_ICONS[DEFAULT_CHECKLIST_ICON];
}

/** "ShoppingCart" → "Shopping cart", for the picker's labels. */
export function iconTitle(name: string) {
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0) + spaced.slice(1).toLowerCase();
}
