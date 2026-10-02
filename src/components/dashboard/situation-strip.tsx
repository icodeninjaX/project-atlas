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
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { cn } from "@/lib/utils";

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
   * A small progress bar (0–1) under the detail. It is decoration: the
   * value or detail must say the same thing in words.
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
          wider tiles. */}
      <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2 @[56rem]:grid-cols-4">
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
              className={cn(
                "group bg-card ring-border hover:ring-primary/35 focus-visible:ring-ring relative flex min-w-0 flex-col rounded-2xl p-4 shadow-[0_1px_2px_rgb(7_10_15/0.05)] ring-1 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-20px_rgb(7_10_15/0.45)] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 @[20rem]:min-h-24",
                item.urgent && "ring-destructive/25 hover:ring-destructive/45",
              )}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs leading-4 font-medium break-words">
                  {Icon ? (
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg",
                        item.urgent
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-3.5" />
                    </span>
                  ) : null}
                  {item.label}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none max-sm:hidden"
                />
              </span>
              <span
                className={cn(
                  "mt-3 flex min-w-0 items-start gap-1.5 font-mono text-base leading-6 font-semibold tracking-[-0.015em] [overflow-wrap:anywhere] break-words sm:text-lg",
                  item.urgent && "text-destructive",
                )}
              >
                {item.urgent ? (
                  <span
                    aria-hidden="true"
                    className="bg-destructive mt-[0.5625rem] size-1.5 shrink-0 rounded-full"
                  />
                ) : null}
                <span className="min-w-0">{value}</span>
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-5 break-words">
                {item.detail}
              </span>
              {item.meter != null ? (
                <span aria-hidden="true" className="mt-auto block pt-3">
                  <span className="bg-primary/12 block h-1.5 overflow-hidden rounded-full">
                    <span
                      className="bg-primary block h-full rounded-full"
                      style={{ width: `${clampShare(item.meter) * 100}%` }}
                    />
                  </span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
