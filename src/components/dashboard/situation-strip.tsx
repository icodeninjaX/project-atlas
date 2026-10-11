import type { Route } from "next";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { cn } from "@/lib/utils";
import styles from "./today.module.css";

export type SituationItem = {
  label: string;
  value: string;
  detail: string;
  href: Route;
  sensitive?: boolean;
  urgent?: boolean;
};

/**
 * One area per cell of a single strip, split by hairlines: the gap between
 * the cells shows the border color behind them.
 */
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
          Money, tasks, career and goals
        </p>
      </div>
      {/* Columns follow the strip's width in rem, so large text gets fewer,
          wider cells while a 320 px phone still gets two. */}
      <div
        className={cn(
          styles.edge,
          "bg-border relative grid grid-cols-1 gap-px overflow-hidden rounded-2xl @[17rem]:grid-cols-2 @[56rem]:grid-cols-4",
        )}
      >
        {items.map((item) => {
          const value = item.sensitive ? (
            <SensitiveValue>{item.value}</SensitiveValue>
          ) : (
            item.value
          );

          return (
            <Link
              key={item.label}
              href={item.href}
              className="bg-card hover:bg-muted/40 focus-visible:ring-ring flex min-w-0 flex-col p-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none min-[360px]:p-4 sm:p-5 @[17rem]:min-h-24"
            >
              <span className="text-muted-foreground min-w-0 text-xs leading-4 font-medium break-words">
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
