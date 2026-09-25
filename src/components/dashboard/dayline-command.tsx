import { ArrowRight, Clock3, SlidersHorizontal, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardDaylineItem = {
  id: string;
  kind: string;
  title: string;
  href: string;
  durationMinutes: number | null;
  position: "NOW" | "NEXT" | "LATER";
  reason: string;
};

function prioritySummary(reason: string) {
  return reason.split(" · ").slice(0, 2).filter(Boolean).join(" · ");
}

function Duration({ minutes }: { minutes: number | null }) {
  if (!minutes) return null;

  return (
    <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
      <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
      {minutes} min
    </span>
  );
}

export function DaylineCommand({
  items,
  plannedMinutes,
  capacityMinutes,
  energyLevel,
}: {
  items: DashboardDaylineItem[];
  plannedMinutes?: number;
  capacityMinutes?: number;
  energyLevel?: string;
}) {
  const [now, ...later] = items;
  const planLabel =
    plannedMinutes != null && capacityMinutes != null
      ? `${plannedMinutes} of ${capacityMinutes} minutes planned`
      : `${items.length} of 3 priorities`;

  return (
    <section
      aria-labelledby="dayline-title"
      className="border-primary/25 bg-card relative overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.14)]"
    >
      <div
        aria-hidden="true"
        className="from-primary/12 pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
      />
      <header className="relative flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:pt-7">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
            Dayline
          </p>
          <h2
            id="dayline-title"
            className="mt-1 text-lg font-semibold tracking-[-0.025em] sm:text-xl"
          >
            Your route through today
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-muted-foreground text-xs">
            {planLabel}
            {energyLevel ? ` · ${energyLevel} energy` : ""}
          </span>
          <Link
            href="/settings"
            aria-label="Tune Dayline planning"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
            Tune
          </Link>
        </div>
      </header>

      {now ? (
        <div className="relative px-5 pt-7 pb-6 sm:px-7 sm:pt-9 sm:pb-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="bg-primary-solid text-primary-solid-foreground inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold tracking-[0.12em]">
                NOW
              </span>
              <Duration minutes={now.durationMinutes} />
            </div>
            <h3 className="mt-4 max-w-2xl min-w-0 text-2xl leading-[1.15] font-semibold tracking-[-0.04em] text-balance break-words sm:text-3xl lg:text-[2.15rem]">
              {now.title}
            </h3>
            <p className="text-muted-foreground mt-3 max-w-2xl min-w-0 text-sm leading-6 break-words sm:text-[0.9375rem]">
              {prioritySummary(now.reason)}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={now.href as Route}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full min-w-0 min-[360px]:w-auto",
                )}
              >
                Open this next
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <details className="max-w-full min-w-0">
                <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none">
                  Why this comes first
                </summary>
                <p className="text-muted-foreground mt-2 max-w-xl text-xs leading-5 break-words">
                  {now.reason}
                </p>
              </details>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative grid min-h-64 place-items-center px-5 py-10 text-center sm:px-7">
          <div className="max-w-md">
            <span className="bg-primary/10 text-primary mx-auto grid size-12 place-items-center rounded-2xl">
              <Target aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">
              Nothing urgent is competing for attention.
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Add what matters and ATLAS will surface the next useful move.
            </p>
          </div>
        </div>
      )}

      {later.length > 0 && (
        <ol className="border-border bg-background/35 grid border-t sm:grid-cols-2">
          {later.map((item, index) => (
            <li
              key={`${item.kind}-${item.id}`}
              className={cn(
                "min-w-0",
                index > 0 && "border-border border-t sm:border-t-0 sm:border-l",
              )}
            >
              <Link
                href={item.href as Route}
                className="hover:bg-muted/45 focus-visible:ring-ring group grid min-h-32 grid-cols-[minmax(0,1fr)_auto] gap-3 p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:gap-4 sm:p-6"
              >
                <span className="min-w-0">
                  <span className="text-primary text-[11px] font-bold tracking-[0.12em]">
                    {item.position}
                  </span>
                  <span className="mt-2 block text-base font-semibold tracking-tight break-words">
                    {item.title}
                  </span>
                  <span className="text-muted-foreground mt-1.5 block text-xs leading-5 break-words">
                    {prioritySummary(item.reason)}
                  </span>
                  <span className="mt-2 block">
                    <Duration minutes={item.durationMinutes} />
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-muted-foreground group-hover:text-primary mt-1 size-4 transition-colors"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
