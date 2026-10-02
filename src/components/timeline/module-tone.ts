import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleCheck,
  ClipboardCheck,
  Eye,
  Flag,
  Goal,
  Landmark,
  NotebookPen,
  Route,
  Scale,
  Trophy,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { TimelineModule } from "@/lib/timeline/timeline";
import type { TimelineKind } from "@/lib/timeline/view";

/**
 * Each module's color, icon (matching the navigation), and home. `dot`
 * fills markers and bar segments; `soft`, `text`, and `ring` tint chips and
 * nodes. Outlines use `ring-*` because the unlayered `* { border-color }`
 * rule in globals.css overrides `border-*` colors. Text shades keep 4.5:1
 * on the card in both themes.
 */
export const moduleTones: Record<
  TimelineModule,
  {
    dot: string;
    soft: string;
    text: string;
    ring: string;
    icon: LucideIcon;
    /** Where its records live, in the navigation's words. */
    place: string;
    href: string;
  }
> = {
  money: {
    place: "Money",
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/25",
    icon: WalletCards,
    href: "/money/transactions",
  },
  debt: {
    place: "Debts",
    dot: "bg-rose-500",
    soft: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/25",
    icon: Landmark,
    href: "/debts",
  },
  tasks: {
    place: "Tasks",
    dot: "bg-sky-500",
    soft: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/25",
    icon: ClipboardCheck,
    href: "/tasks",
  },
  goals: {
    place: "Goals",
    dot: "bg-violet-500",
    soft: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/25",
    icon: Goal,
    href: "/goals",
  },
  career: {
    place: "Career",
    dot: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/25",
    icon: BriefcaseBusiness,
    href: "/career",
  },
  reviews: {
    place: "Reviews",
    dot: "bg-indigo-500",
    soft: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-500/25",
    icon: NotebookPen,
    href: "/reviews",
  },
  decisions: {
    place: "Decisions",
    dot: "bg-teal-500",
    soft: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    ring: "ring-teal-500/25",
    icon: Scale,
    href: "/decisions",
  },
};

/** An icon for each kind of event. */
export const kindIcons: Record<TimelineKind, LucideIcon> = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
  debt_payment: Landmark,
  task: CircleCheck,
  milestone: Flag,
  goal: Trophy,
  application: BriefcaseBusiness,
  stage: Route,
  review: NotebookPen,
  decision: Scale,
  observation: Eye,
};
