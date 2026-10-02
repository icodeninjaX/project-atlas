import { isCareerStage, type CareerStage } from "@/lib/career/view";

/**
 * Each stage's color. `dot` fills markers and track segments; `soft`,
 * `text`, and `ring` tint chips. Outlines use `ring-*` because the
 * unlayered `* { border-color }` rule in globals.css overrides `border-*`
 * colors. Text shades keep 4.5:1 on the card in both themes.
 */
export const stageTones: Record<
  CareerStage,
  { dot: string; soft: string; text: string; ring: string }
> = {
  interested: {
    dot: "bg-slate-400",
    soft: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
    ring: "ring-slate-500/25",
  },
  preparing: {
    dot: "bg-violet-500",
    soft: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/25",
  },
  applied: {
    dot: "bg-blue-500",
    soft: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/25",
  },
  assessment: {
    dot: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/25",
  },
  interview: {
    dot: "bg-cyan-500",
    soft: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    ring: "ring-cyan-500/25",
  },
  final_interview: {
    dot: "bg-indigo-500",
    soft: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-500/25",
  },
  offer: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/25",
  },
  accepted: {
    dot: "bg-green-500",
    soft: "bg-green-500/10",
    text: "text-green-700 dark:text-green-300",
    ring: "ring-green-500/25",
  },
  rejected: {
    dot: "bg-rose-500",
    soft: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/25",
  },
  withdrawn: {
    dot: "bg-zinc-400",
    soft: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-300",
    ring: "ring-zinc-500/25",
  },
};

export function stageTone(stage: string) {
  return isCareerStage(stage) ? stageTones[stage] : stageTones.interested;
}
