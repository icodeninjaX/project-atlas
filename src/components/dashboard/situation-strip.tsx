import {
  ArrowUpRight,
  BriefcaseBusiness,
  ClipboardCheck,
  Goal,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { cn } from "@/lib/utils";
import styles from "./today.module.css";

export type SituationArea = "money" | "tasks" | "career" | "goals";

export type SituationItem = {
  label: string;
  value: string;
  detail: string;
  href: Route;
  area?: SituationArea;
  sensitive?: boolean;
  urgent?: boolean;
  /**
   * A small progress ring (0–1) in the corner. It is decoration: the value
   * or detail must say the same thing in words.
   */
  meter?: number;
};

const areaIcons: Record<SituationArea, LucideIcon> = {
  money: WalletCards,
  tasks: ClipboardCheck,
  career: BriefcaseBusiness,
  goals: Goal,
};

function clampShare(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** A small progress ring; decoration, since the detail carries the figure. */
function MeterRing({ value }: { value: number }) {
  const share = clampShare(value);

  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      className="size-9 shrink-0 -rotate-90"
    >
      <circle
        cx="18"
        cy="18"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3.5"
        className="stroke-primary/15"
      />
      {share > 0 ? (
        <circle
          cx="18"
          cy="18"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - share)}
          className={cn(styles.draw, "stroke-primary")}
          style={{ "--ring-from": RING_CIRCUMFERENCE } as CSSProperties}
        />
      ) : null}
    </svg>
  );
}

export function SituationStrip({ items }: { items: SituationItem[] }) {
  return (
    <section
      aria-labelledby="situation-title"
      className="@container mt-8 sm:mt-10"
    >
      <div className="mb-3.5 flex items-baseline justify-between gap-4">
        <h2
          id="situation-title"
          className="text-base font-semibold tracking-[-0.01em]"
        >
          Situation
        </h2>
        <p className="text-muted-foreground hidden text-xs sm:block">
          The rest of your system, at a glance
        </p>
      </div>
      {/* Columns follow the strip's width in rem, so large text gets fewer,
          wider tiles while a 320 px phone still gets two. */}
      <div className="grid grid-cols-1 gap-2.5 min-[360px]:gap-3 @[17rem]:grid-cols-2 @[56rem]:grid-cols-4">
        {items.map((item) => {
          const Icon = item.area ? areaIcons[item.area] : null;
          const value = item.sensitive ? (
            <SensitiveValue>{item.value}</SensitiveValue>
          ) : (
            item.value
          );

          return (
            <Link
              key={item.label}
              href={item.href}
              data-spotlight
              className={cn(
                styles.spotlight,
                "group bg-card/90 focus-visible:ring-ring relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl p-3.5 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_14px_30px_-24px_rgb(7_10_15/0.45)] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgb(7_10_15/0.5)] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[360px]:p-4 sm:p-5 @[17rem]:min-h-24",
                item.urgent ? "ring-destructive/30 ring-1" : styles.edge,
              )}
            >
              {item.urgent ? (
                <span
                  aria-hidden="true"
                  className="from-destructive/10 pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 bg-gradient-to-b to-transparent"
                />
              ) : null}
              <span className="flex min-w-0 items-start justify-between gap-2">
                {Icon ? (
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl ring-1",
                      item.urgent
                        ? "bg-destructive/10 text-destructive ring-destructive/20"
                        : "bg-primary/10 text-primary ring-primary/15",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                ) : null}
                {item.meter != null ? (
                  <MeterRing value={item.meter} />
                ) : (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none max-sm:hidden"
                  />
                )}
              </span>
              <span className="text-muted-foreground mt-3 block text-xs leading-4 font-medium break-words">
                {item.label}
              </span>
              <span
                className={cn(
                  "mt-1.5 flex min-w-0 items-start gap-1.5 font-mono text-[1.0625rem] leading-6 font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] break-words min-[390px]:text-lg sm:text-xl sm:leading-7",
                  item.urgent && "text-destructive",
                )}
              >
                {item.urgent ? (
                  <span
                    aria-hidden="true"
                    className="bg-destructive mt-[0.5625rem] size-1.5 shrink-0 rounded-full sm:mt-[0.6875rem]"
                  />
                ) : null}
                <span className="min-w-0">{value}</span>
              </span>
              <span className="text-muted-foreground mt-1 block text-xs leading-5 break-words">
                {item.detail}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
