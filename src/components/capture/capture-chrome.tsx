import {
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  ReceiptText,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import type { BatchCaptureItem } from "@/lib/capture/batch";
import { cn } from "@/lib/utils";

/** Shared pieces of the Capture page. */

export const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

/** A glass surface for the page's cards. */
export const glassCardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
);

/** A text or date input on a proposal card. */
export const inputClass =
  "border-border bg-background/70 text-foreground focus-visible:ring-ring hover:border-primary/40 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base transition-colors outline-none focus-visible:ring-2 sm:text-sm";

/** A native select dressed like the inputs, with its own chevron. */
export const selectClass =
  "border-border bg-background/70 text-foreground focus-visible:ring-ring hover:border-primary/40 mt-1.5 min-h-11 w-full appearance-none rounded-xl border bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 pl-3 text-sm transition-colors outline-none focus-visible:ring-2";

/** A field's label text above it. */
export const fieldLabelClass =
  "text-foreground/85 block min-w-0 text-xs font-semibold";

type Tone = {
  /** Gradient icon tile. */
  tile: string;
  /** Accent rail and dots. */
  dot: string;
  /** Tinted chip: background, text, and outline. */
  chip: string;
};

/**
 * Each kind of action's color. Text shades keep 4.5:1 on the card in both
 * themes. Outlines use `ring-*` because the unlayered `* { border-color }`
 * rule in globals.css overrides `border-*` colors.
 */
const tones = {
  rose: {
    tile: "from-rose-500/22 to-rose-500/5 text-rose-700 ring-rose-500/25 dark:text-rose-300",
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
  },
  emerald: {
    tile: "from-emerald-500/22 to-emerald-500/5 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  },
  sky: {
    tile: "from-sky-500/22 to-sky-500/5 text-sky-700 ring-sky-500/25 dark:text-sky-300",
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  },
  violet: {
    tile: "from-violet-500/22 to-violet-500/5 text-violet-700 ring-violet-500/25 dark:text-violet-300",
    dot: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  },
  amber: {
    tile: "from-amber-500/22 to-amber-500/5 text-amber-700 ring-amber-500/25 dark:text-amber-300",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  },
  muted: {
    tile: "bg-muted/80 text-muted-foreground ring-border/80",
    dot: "bg-muted-foreground/50",
    chip: "bg-background/60 text-muted-foreground ring-border",
  },
} satisfies Record<string, Tone>;

export type CaptureKind = {
  label: string;
  icon: LucideIcon;
  tone: Tone;
};

/** What a proposal is, in words, with its icon and color. */
export function captureKind(item: BatchCaptureItem): CaptureKind {
  if (item.operation === "reschedule_task")
    return { label: "Move task", icon: CalendarClock, tone: tones.sky };
  switch (item.proposal.kind) {
    case "expense":
      return { label: "Expense", icon: ReceiptText, tone: tones.rose };
    case "income":
      return { label: "Income", icon: TrendingUp, tone: tones.emerald };
    case "task":
      return { label: "Task", icon: ClipboardCheck, tone: tones.sky };
    case "career_application":
      return {
        label: "Career application",
        icon: BriefcaseBusiness,
        tone: tones.violet,
      };
    case "knowledge_item":
      return { label: "Knowledge item", icon: BookOpen, tone: tones.amber };
    default:
      return { label: "Unsupported", icon: CircleHelp, tone: tones.muted };
  }
}

/** The kinds Capture understands, for the guide beside the composer. */
export const understoodKinds = [
  {
    label: "Expenses and income",
    example: "Paid ₱380 for groceries with GCash",
    icon: ReceiptText,
    tone: tones.rose,
  },
  {
    label: "Tasks and reschedules",
    example: "Call Acme tomorrow · move it to Friday",
    icon: ClipboardCheck,
    tone: tones.sky,
  },
  {
    label: "Career applications",
    example: "Applied to Product Designer at Acme",
    icon: BriefcaseBusiness,
    tone: tones.violet,
  },
  {
    label: "Knowledge items",
    example: "Learned how compound interest works",
    icon: BookOpen,
    tone: tones.amber,
  },
] as const;

/** A soft gradient tile holding an icon. */
export function KindTile({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center bg-gradient-to-br ring-1 ring-inset",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]",
        size === "md" ? "size-11 rounded-2xl" : "size-9 rounded-xl",
        tone.tile,
      )}
    >
      <Icon className={size === "md" ? "size-[1.15rem]" : "size-4"} />
    </span>
  );
}

/** A status chip: a dot and a word or two. */
export function Chip({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold whitespace-nowrap ring-1",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

export const chipTones = {
  positive: "bg-positive/10 text-positive ring-positive/25",
  caution:
    "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  neutral: "bg-background/60 text-muted-foreground ring-border",
  primary: "bg-primary/10 ring-primary/20 dark:text-primary text-blue-700",
} as const;

export const confidenceTone = {
  high: chipTones.positive,
  medium: chipTones.primary,
  low: chipTones.caution,
} as const;
