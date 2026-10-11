import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { moduleTones } from "@/components/timeline/module-tone";
import type { SignalCategory, SignalSeverity } from "@/lib/signals/engine";

/**
 * Each severity's color and icon. Severity is the one color system on the
 * Signals page; areas are told apart by icon and name. `dot` fills markers
 * and meters, `text` colors severity words and changes, `fill` colors the
 * radar's blips, and `edge` marks urgent rows. Text shades keep 4.5:1 on the
 * card in both themes.
 */
export const severityTones: Record<
  SignalSeverity,
  {
    icon: LucideIcon;
    dot: string;
    text: string;
    fill: string;
    edge: string;
  }
> = {
  critical: {
    icon: CircleAlert,
    dot: "bg-destructive",
    text: "text-destructive",
    fill: "fill-destructive",
    edge: "bg-destructive",
  },
  warning: {
    icon: TriangleAlert,
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    fill: "fill-amber-500",
    edge: "bg-amber-500",
  },
  positive: {
    icon: CircleCheck,
    dot: "bg-positive",
    text: "text-positive",
    fill: "fill-positive",
    edge: "bg-positive",
  },
  info: {
    icon: Info,
    dot: "bg-primary",
    text: "text-primary",
    fill: "fill-primary",
    edge: "bg-primary",
  },
};

const categoryModules = {
  Money: "money",
  Debt: "debt",
  Tasks: "tasks",
  Career: "career",
  Goals: "goals",
} as const satisfies Record<SignalCategory, keyof typeof moduleTones>;

/** Each area's icon (matching the navigation) and home. */
export function categoryTone(category: SignalCategory) {
  const tone = moduleTones[categoryModules[category]];
  return { icon: tone.icon, href: tone.href };
}
