import type { Route } from "next";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { cn } from "@/lib/utils";

export type SituationItem = {
  label: string;
  value: string;
  detail: string;
  href: Route;
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
      <div className="border-border bg-card grid grid-cols-1 overflow-hidden rounded-2xl border min-[360px]:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
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
                "hover:bg-muted/45 focus-visible:ring-ring flex min-w-0 items-center px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset min-[360px]:min-h-24 xl:border-t-0 xl:px-4 xl:py-4",
                index > 0 && "border-border border-t",
                index % 2 === 1 && "min-[360px]:border-l",
                index === 1 && "min-[360px]:border-t-0",
                index > 0 && "xl:border-l",
                item.urgent && "bg-destructive/[0.035]",
              )}
            >
              <span className="min-w-0">
                <span className="text-muted-foreground block text-xs leading-4 break-words">
                  {item.label}
                </span>
                <span className="block text-sm leading-5 font-semibold [overflow-wrap:anywhere] break-words">
                  {value}
                </span>
                <span className="text-muted-foreground block text-xs leading-4 break-words">
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
