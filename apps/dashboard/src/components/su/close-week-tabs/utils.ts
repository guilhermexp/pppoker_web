import { cn } from "@midpoker/ui/cn";

export const VARIANT_LABELS: Record<string, string> = {
  nlh: "NLH",
  plo4: "PLO4",
  plo5: "PLO5",
  plo6: "PLO6",
  ofc: "OFC",
  short: "SHORT",
  "6plus": "6+",
  spinup: "SPINUP",
  pko: "PKO",
  mko: "MKO",
  satellite: "SAT",
};

export const VARIANT_COLORS: Record<string, string> = {
  nlh: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  spinup: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  pko: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  mko: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  satellite:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  plo4: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  plo5: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  plo6: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  ofc: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  short: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "6plus": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

const DEFAULT_COLOR =
  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

export function getVariantLabel(variant: string): string {
  return VARIANT_LABELS[variant] ?? variant.toUpperCase();
}

export function getVariantColor(variant: string): string {
  return VARIANT_COLORS[variant] ?? DEFAULT_COLOR;
}

export function variantBadgeClassName(variant: string): string {
  return cn(
    "px-2 py-0.5 rounded text-xs font-medium",
    getVariantColor(variant),
  );
}
