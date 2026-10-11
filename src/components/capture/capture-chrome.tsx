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

/** The page's card surface: a flat card with a hairline edge. */
export const cardClass = cn(
  surfaceClass,
  "bg-card/90 @container relative min-w-0 rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)]",
);

/** A text or date input on a proposal card. */
export const inputClass =
  "border-border bg-background/70 text-foreground focus-visible:border-ring focus-visible:ring-ring/40 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base font-normal transition-colors outline-none focus-visible:ring-2 sm:text-sm";

/** A native select dressed like the inputs, with its own chevron. */
export const selectClass =
  "border-border bg-background/70 text-foreground focus-visible:border-ring focus-visible:ring-ring/40 mt-1.5 min-h-11 w-full appearance-none rounded-xl border bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 pl-3 text-base font-normal transition-colors outline-none focus-visible:ring-2 sm:text-sm";

/** A field's label text above it. */
export const fieldLabelClass = "block min-w-0 text-sm font-medium";

/** The glyph color for a kind of action; the tile around it stays neutral. */
type Tone = { glyph: string };

/** Each kind of action's glyph color, in shades that read in both themes. */
const tones = {
  rose: { glyph: "text-rose-700 dark:text-rose-300" },
  emerald: { glyph: "text-emerald-700 dark:text-emerald-300" },
  sky: { glyph: "text-sky-700 dark:text-sky-300" },
  violet: { glyph: "text-violet-700 dark:text-violet-300" },
  amber: { glyph: "text-amber-700 dark:text-amber-300" },
  muted: { glyph: "text-muted-foreground" },
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
    example: "Call Mika tomorrow · move it to Friday",
    icon: ClipboardCheck,
    tone: tones.sky,
  },
  {
    label: "Career applications",
    example: "Applied to Product Designer at Canva",
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

/** A neutral square holding an icon; `tone` colors the glyph. */
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
        "bg-muted/60 relative grid shrink-0 place-items-center rounded-lg",
        size === "md" ? "size-9" : "size-8",
        tone.glyph,
      )}
    >
      <Icon className="size-4" />
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

/** Status chips: green went well, amber needs a look, red failed. */
export const chipTones = {
  positive: "bg-positive/10 text-positive ring-positive/25",
  caution:
    "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  neutral: "bg-background/60 text-muted-foreground ring-border",
} as const;

export const confidenceTone = {
  high: chipTones.positive,
  medium: chipTones.neutral,
  low: chipTones.caution,
} as const;
