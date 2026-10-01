import {
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  HeartPulse,
  PiggyBank,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

type GoalAreaTheme = {
  icon: LucideIcon;
  /** Classes for the tinted icon tile beside a goal's title. */
  tile: string;
  /** Hex accent used for the card's soft corner glow. */
  accent: string;
};

const goalAreaThemes: Record<string, GoalAreaTheme> = {
  finance: {
    icon: PiggyBank,
    tile: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300",
    accent: "#10b981",
  },
  career: {
    icon: Briefcase,
    tile: "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-300",
    accent: "#3b82f6",
  },
  health: {
    icon: HeartPulse,
    tile: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-300",
    accent: "#f43f5e",
  },
  relationship: {
    icon: Heart,
    tile: "bg-pink-500/10 text-pink-600 ring-pink-500/20 dark:text-pink-300",
    accent: "#ec4899",
  },
  family: {
    icon: Users,
    tile: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300",
    accent: "#f59e0b",
  },
  business: {
    icon: Building2,
    tile: "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300",
    accent: "#8b5cf6",
  },
  learning: {
    icon: GraduationCap,
    tile: "bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-300",
    accent: "#06b6d4",
  },
  personal: {
    icon: Sparkles,
    tile: "bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-300",
    accent: "#f97316",
  },
};

const fallbackGoalAreaTheme: GoalAreaTheme = {
  icon: Sparkles,
  tile: "bg-muted text-muted-foreground ring-border",
  accent: "#64748b",
};

export function goalAreaTheme(area: string): GoalAreaTheme {
  return goalAreaThemes[area] ?? fallbackGoalAreaTheme;
}
