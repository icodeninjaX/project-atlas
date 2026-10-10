import {
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  HeartHandshake,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { TonePill } from "@/components/money/money-hero";
import type { DueTone } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";
import styles from "./debts.module.css";

export const DEBT_TYPE_OPTIONS = [
  { value: "credit_card", label: "Credit card", icon: CreditCard },
  { value: "online_lending", label: "Online lending", icon: Smartphone },
  { value: "personal_loan", label: "Personal loan", icon: HandCoins },
  { value: "installment", label: "Installment", icon: CalendarClock },
  { value: "family", label: "Family", icon: HeartHandshake },
  { value: "other", label: "Other", icon: CircleDollarSign },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  icon: LucideIcon;
}>;

function debtTypeOption(type: string) {
  return (
    DEBT_TYPE_OPTIONS.find((option) => option.value === type) ??
    DEBT_TYPE_OPTIONS[DEBT_TYPE_OPTIONS.length - 1]!
  );
}

export function debtTypeLabel(type: string) {
  return debtTypeOption(type).label;
}

/** The kind of debt as an icon tile; decorative beside its name. */
export function DebtTypeBadge({
  type,
  size = "md",
  className,
}: {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = debtTypeOption(type).icon;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary/10 text-primary ring-primary/15 grid shrink-0 place-items-center ring-1",
        size === "sm" && "size-8 rounded-xl",
        size === "md" && "size-10 rounded-xl",
        size === "lg" && "size-12 rounded-2xl",
        className,
      )}
    >
      <Icon
        className={cn(
          size === "sm" && "size-4",
          size === "md" && "size-[1.125rem]",
          size === "lg" && "size-5",
        )}
      />
    </span>
  );
}

/** Paused, defaulted, and paid debts say so; active ones need no pill. */
export function DebtStatusPill({ status }: { status: string }) {
  if (status === "paused") return <TonePill tone="neutral">Paused</TonePill>;
  if (status === "defaulted") {
    return <TonePill tone="destructive">Defaulted</TonePill>;
  }
  if (status === "paid") return <TonePill tone="positive">Paid off</TonePill>;
  return null;
}

export function DueChip({
  tone,
  label,
  className,
}: {
  tone: DueTone;
  label: string;
  className?: string;
}) {
  return (
    <TonePill tone={tone} className={className}>
      {label}
    </TonePill>
  );
}

/**
 * How much of a balance is repaid, as a bar. Decorative: the caller says
 * the share in words.
 */
export function RepaidBar({
  share,
  className,
  size = "md",
}: {
  share: number;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-foreground/[0.07] overflow-hidden rounded-full",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      {share > 0 ? (
        <div
          className={cn("h-full rounded-full", styles.fill)}
          style={{
            width: `${Math.max(Math.min(share, 1), 0.015) * 100}%`,
            backgroundImage: "linear-gradient(90deg, #38bdf8, var(--primary))",
          }}
        />
      ) : null}
    </div>
  );
}

export function formatPercent(share: number) {
  if (share > 0 && share < 0.01) return "<1%";
  if (share < 1 && share > 0.99) return ">99%";
  return `${Math.round(share * 100)}%`;
}
