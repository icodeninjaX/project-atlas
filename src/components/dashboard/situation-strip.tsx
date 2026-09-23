import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { cn } from "@/lib/utils";

export type SituationItem = {
  label: string;
  value: string;
  detail: string;
  href: Route;
  icon: LucideIcon;
  sensitive?: boolean;
  urgent?: boolean;
};

export function SituationStrip({ items }: { items: SituationItem[] }) {
  return (
    <section aria-labelledby="situation-title" className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="situation-title" className="text-sm font-semibold">
          Situation
        </h2>
        <p className="text-muted-foreground hidden text-xs sm:block">
          The rest of your system, at a glance
        </p>
      </div>
      <div className="border-border bg-card grid grid-cols-2 overflow-hidden rounded-2xl border xl:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
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
                "hover:bg-muted/45 focus-visible:ring-ring grid min-h-[84px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset xl:min-h-24 xl:border-t-0 xl:px-4 xl:py-4",
                index % 2 === 1 && "border-border border-l",
                index >= 2 && "border-border border-t",
                index > 0 && "xl:border-l",
                item.urgent && "bg-destructive/[0.035]",
              )}
            >
              <span
                className={cn(
                  "bg-muted text-muted-foreground grid size-7 place-items-center rounded-lg xl:size-8",
                  item.urgent && "bg-destructive/10 text-destructive",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="text-muted-foreground block truncate text-[10px] leading-4 min-[360px]:text-[11px]">
                  {item.label}
                </span>
                <span className="block truncate text-[13px] leading-5 font-semibold min-[360px]:text-sm">
                  {value}
                </span>
                <span className="text-muted-foreground block truncate text-[10px] leading-4 min-[360px]:text-[11px]">
                  {item.detail}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
