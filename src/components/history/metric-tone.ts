import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  Landmark,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import type { MetricKey } from "@/lib/history/metrics";

/**
 * Each series' color, icon, and home. `dot` fills markers and cells; `bar`
 * sets `currentColor` for striped partial buckets and chart lines; `soft`,
 * `text`, and `ring` tint chips and tiles. Outlines use `ring-*` because the
 * unlayered `* { border-color }` rule in globals.css overrides `border-*`
 * colors. Text shades keep 4.5:1 on the card in both themes.
 */
export const metricTones: Record<
  MetricKey,
  {
    /** The series in a word, for tight rows. */
    short: string;
    icon: LucideIcon;
    dot: string;
    bar: string;
    soft: string;
    text: string;
    ring: string;
    /** Where its records live, in the navigation's words. */
    place: string;
    /** What adds a record, for an empty account. */
    hint: string;
  }
> = {
  income_centavos: {
    short: "Income",
    icon: ArrowDownLeft,
    dot: "bg-emerald-500",
    bar: "text-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/25",
    place: "Money",
    hint: "Record income",
  },
  expense_centavos: {
    short: "Expenses",
    icon: ArrowUpRight,
    dot: "bg-rose-500",
    bar: "text-rose-500",
    soft: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/25",
    place: "Money",
    hint: "Record an expense",
  },
  debt_payments_centavos: {
    short: "Debt paid",
    icon: Landmark,
    dot: "bg-orange-500",
    bar: "text-orange-500",
    soft: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/25",
    place: "Debts",
    hint: "Log a debt payment",
  },
  task_completions: {
    short: "Tasks",
    icon: CircleCheck,
    dot: "bg-sky-500",
    bar: "text-sky-500",
    soft: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/25",
    place: "Tasks",
    hint: "Complete a task",
  },
  knowledge_reviews: {
    short: "Knowledge",
    icon: BookOpen,
    dot: "bg-violet-500",
    bar: "text-violet-500",
    soft: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/25",
    place: "Knowledge",
    hint: "Review a concept",
  },
  review_overall_score: {
    short: "Review score",
    icon: NotebookPen,
    dot: "bg-amber-500",
    bar: "text-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/25",
    place: "Reviews",
    hint: "Finish a weekly review",
  },
};
