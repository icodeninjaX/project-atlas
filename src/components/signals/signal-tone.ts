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
 * and meters, `soft`/`text`/`ring` tint chips and icon tiles, `fill` and
 * `stroke` color the radar, and `edge` marks urgent cards. Outlines use
 * `ring-*` because the unlayered `* { border-color }` rule in globals.css
 * overrides `border-*` colors. Text shades keep 4.5:1 on tinted panels.
 */
export const severityTones: Record<
  SignalSeverity,
  {
    icon: LucideIcon;
    dot: string;
    soft: string;
    text: string;
    ring: string;
    fill: string;
    stroke: string;
    edge: string;
  }
> = {
  critical: {
    icon: CircleAlert,
    dot: "bg-destructive",
    soft: "bg-destructive/10",
    text: "text-destructive",
    ring: "ring-destructive/25",
    fill: "fill-destructive",
    stroke: "stroke-destructive",
    edge: "bg-destructive",
  },
  warning: {
    icon: TriangleAlert,
    dot: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/25",
    fill: "fill-amber-500",
    stroke: "stroke-amber-500",
    edge: "bg-amber-500",
  },
  positive: {
    icon: CircleCheck,
    dot: "bg-positive",
    soft: "bg-positive/10",
    text: "text-positive",
    ring: "ring-positive/25",
    fill: "fill-positive",
    stroke: "stroke-positive",
    edge: "bg-positive",
  },
  info: {
    icon: Info,
    dot: "bg-primary",
    soft: "bg-primary/10",
    // A deeper blue keeps 4.5:1 on the light tint.
    text: "text-blue-700 dark:text-primary",
    ring: "ring-primary/25",
    fill: "fill-primary",
    stroke: "stroke-primary",
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
