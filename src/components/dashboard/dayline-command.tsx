import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  Clock3,
  Goal,
  Landmark,
  Route as RouteIcon,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";
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

const kindPresentation: Record<string, { label: string; icon: LucideIcon }> = {
  task: { label: "Task", icon: ClipboardCheck },
  debt: { label: "Payment", icon: Landmark },
  career: { label: "Career", icon: BriefcaseBusiness },
  goal: { label: "Goal", icon: Goal },
};

function presentKind(kind: string) {
  return kindPresentation[kind] ?? { label: "Item", icon: Target };
}

function reasonParts(reason: string) {
  return reason.split(" · ").slice(0, 2).filter(Boolean);
}

function prioritySummary(reason: string) {
  return reasonParts(reason).join(" · ");
}

function Duration({
  minutes,
  className,
}: {
  minutes: number | null;
  className?: string;
}) {
  if (!minutes) return null;

  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs",
        className,
      )}
    >
      <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
      {minutes} min
    </span>
  );
}

function KindLabel({ kind }: { kind: string }) {
  const { label, icon: Icon } = presentKind(kind);

  return (
    <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs font-medium">
      <span className="bg-primary/10 text-primary grid size-6 shrink-0 place-items-center rounded-full">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      {label}
    </span>
  );
}

function ReasonChips({ reason }: { reason: string }) {
  const parts = reasonParts(reason);
  if (!parts.length) return null;

  return (
    <ul aria-label="Why it is on your route" className="flex flex-wrap gap-2">
      {parts.map((part) => {
        const pressing = /overdue|critical|due today/i.test(part);
        return (
          <li
            key={part}
            className={cn(
              "inline-flex min-h-7 max-w-full min-w-0 items-center rounded-full px-3 py-1 text-xs leading-4 font-medium break-words ring-1",
              pressing
                ? // red-700/red-300 keep 12px text above 4.5:1 on the tint.
                  "bg-destructive/10 ring-destructive/20 text-red-700 dark:text-red-300"
                : "bg-background/60 text-muted-foreground ring-border",
            )}
          >
            {part}
          </li>
        );
      })}
    </ul>
  );
}

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** How full the day is: planned minutes against Dayline capacity. */
function DayLoad({
  plannedMinutes,
  capacityMinutes,
  energyLevel,
  priorityCount,
}: {
  plannedMinutes?: number;
  capacityMinutes?: number;
  energyLevel?: string;
  priorityCount: number;
}) {
  const hasMinutes =
    plannedMinutes != null && capacityMinutes != null && capacityMinutes > 0;
  const ratio = hasMinutes
    ? plannedMinutes / capacityMinutes
    : priorityCount / 3;
  const over = hasMinutes && plannedMinutes > capacityMinutes;
  const label = hasMinutes
    ? `${plannedMinutes} of ${capacityMinutes} minutes planned`
    : `${priorityCount} of 3 priorities`;
  const slack = hasMinutes
    ? over
      ? `${plannedMinutes - capacityMinutes} min over capacity`
      : `${capacityMinutes - plannedMinutes} min still open`
    : null;
  const energyBars = energyLevel === "high" ? 3 : energyLevel === "low" ? 1 : 2;

  return (
    <div className="bg-background/55 ring-border flex min-w-0 flex-wrap items-center gap-4 rounded-2xl p-4 ring-1 sm:p-5 lg:flex-col lg:flex-nowrap lg:items-start lg:gap-5">
      <div
        role="meter"
        aria-label="Day load"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
        aria-valuetext={label}
        className="relative grid size-16 shrink-0 place-items-center sm:size-[4.5rem] lg:size-24"
      >
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="9"
            className="stroke-primary/12"
          />
          {ratio > 0 ? (
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.min(ratio, 1))}
              className={cn(
                "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
                over ? "stroke-destructive" : "stroke-primary",
              )}
            />
          ) : null}
        </svg>
        <p
          aria-hidden="true"
          className="font-mono text-sm leading-none font-semibold tracking-[-0.03em] sm:text-base lg:text-xl"
        >
          {hasMinutes ? (
            <>
              {Math.round(ratio * 100)}
              <span className="text-muted-foreground text-[0.7em] font-medium">
                %
              </span>
            </>
          ) : (
            <>
              {priorityCount}
              <span className="text-muted-foreground text-[0.7em] font-medium">
                /3
              </span>
            </>
          )}
        </p>
      </div>
      <div className="min-w-0 flex-[1_1_9rem] lg:flex-none">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
          Day load
        </p>
        <p className="mt-1 text-sm leading-5 font-semibold break-words">
          {label}
        </p>
        {slack ? (
          <p
            className={cn(
              "mt-0.5 text-xs leading-5",
              over ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            {slack}
          </p>
        ) : null}
        {energyLevel ? (
          <p className="text-muted-foreground mt-2 inline-flex items-center gap-2 text-xs">
            <span aria-hidden="true" className="flex h-3 items-end gap-[3px]">
              {[1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={cn(
                    "w-[3px] rounded-full",
                    bar === 1 ? "h-1.5" : bar === 2 ? "h-2.5" : "h-3",
                    bar <= energyBars ? "bg-primary" : "bg-primary/20",
                  )}
                />
              ))}
            </span>
            {energyLevel.charAt(0).toUpperCase()}
            {energyLevel.slice(1)} energy
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** NEXT and LATER, drawn as stops along a route. */
function RouteStops({ items }: { items: DashboardDaylineItem[] }) {
  return (
    <div className="border-border bg-background/40 relative border-t px-5 pt-5 pb-6 sm:px-7 sm:pb-7">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
        Then on your route
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-5">
        {items.map((item, index) => {
          const last = index === items.length - 1;

          return (
            <li
              key={`${item.kind}-${item.id}`}
              className="relative min-w-0 pl-7 sm:pt-7 sm:pl-0 @max-[18rem]:pl-0"
            >
              {/* The route line: down the left on phones, across on wider
                  screens; it fades out after the last stop. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 left-[7px] w-px bg-gradient-to-b sm:top-[7px] sm:left-0 sm:h-px sm:w-auto sm:bg-gradient-to-r @max-[18rem]:hidden",
                  index === 0 ? "from-primary/55" : "from-border",
                  last
                    ? "bottom-0 to-transparent sm:right-0 sm:bottom-auto"
                    : "to-border -bottom-3 sm:-right-5 sm:bottom-auto",
                )}
              />
              <span
                aria-hidden="true"
                className="bg-card ring-primary/45 absolute top-5 left-0 grid size-[15px] place-items-center rounded-full ring-2 sm:top-0 @max-[18rem]:hidden"
              >
                <span className="bg-primary/70 size-[5px] rounded-full" />
              </span>
              <Link
                href={item.href as Route}
                className="bg-card ring-border hover:ring-primary/40 focus-visible:ring-ring group grid min-h-28 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl p-4 shadow-[0_1px_2px_rgb(7_10_15/0.05)] ring-1 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgb(7_10_15/0.45)] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span className="text-primary text-[11px] font-bold tracking-[0.12em]">
                      {item.position}
                    </span>
                    <KindLabel kind={item.kind} />
                  </span>
                  <span className="mt-2.5 block text-base leading-6 font-semibold tracking-tight break-words">
                    {item.title}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5 break-words">
                    {prioritySummary(item.reason)}
                  </span>
                  <Duration minutes={item.durationMinutes} className="mt-2" />
                </span>
                <span className="bg-background/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary grid size-8 place-items-center rounded-full transition-colors @max-[18rem]:hidden">
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
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

  return (
    <section
      aria-labelledby="dayline-title"
      className="bg-card ring-primary/20 @container relative overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_28px_80px_-24px_rgb(7_10_15/0.32)] ring-1"
    >
      <div
        aria-hidden="true"
        className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/18 pointer-events-none absolute -top-32 -right-20 size-80 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="atlas-grid pointer-events-none absolute inset-x-0 top-0 h-64 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-50"
      />
      <div
        aria-hidden="true"
        className="via-primary/60 pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />

      <header className="relative flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-primary/12 text-primary ring-primary/20 grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[18rem]:hidden">
            <RouteIcon aria-hidden="true" className="size-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <p className="text-primary text-[11px] font-semibold tracking-[0.14em] uppercase">
              Dayline
            </p>
            <h2
              id="dayline-title"
              className="mt-0.5 text-base font-semibold tracking-[-0.02em] break-words sm:text-lg"
            >
              Your route through today
            </h2>
          </div>
        </div>
        <Link
          href="/settings"
          aria-label="Tune Dayline planning"
          className="text-muted-foreground hover:text-foreground hover:bg-background/60 focus-visible:ring-ring ring-border inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 sm:px-3.5"
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          <span className="max-sm:sr-only">Tune</span>
        </Link>
      </header>

      {now ? (
        <div className="relative grid gap-6 px-5 pt-7 pb-6 sm:px-7 sm:pt-9 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="bg-primary-solid text-primary-solid-foreground inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-bold tracking-[0.12em] shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent),0_6px_18px_-6px_color-mix(in_srgb,var(--primary-solid)_70%,transparent)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-current"
                />
                NOW
              </span>
              <KindLabel kind={now.kind} />
              <Duration minutes={now.durationMinutes} />
            </div>
            <h3 className="mt-5 max-w-2xl min-w-0 text-[1.625rem] leading-[1.12] font-semibold tracking-[-0.04em] text-balance break-words sm:text-[2rem] lg:text-[2.375rem]">
              {now.title}
            </h3>
            <div className="mt-4 max-w-2xl min-w-0">
              <ReasonChips reason={now.reason} />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={now.href as Route}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "group w-full min-w-0 rounded-2xl min-[360px]:w-auto",
                )}
              >
                Open this next
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
              <details className="group/why max-w-full min-w-0">
                <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  Why this comes first
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3 transition-transform group-open/why:rotate-90 motion-reduce:transition-none"
                  />
                </summary>
                <p className="text-muted-foreground mt-2 max-w-xl text-xs leading-5 break-words">
                  {now.reason}
                </p>
              </details>
            </div>
          </div>
          <DayLoad
            plannedMinutes={plannedMinutes}
            capacityMinutes={capacityMinutes}
            energyLevel={energyLevel}
            priorityCount={items.length}
          />
        </div>
      ) : (
        <div className="relative grid min-h-64 place-items-center px-5 py-12 text-center sm:px-7">
          <div className="max-w-md">
            <span className="relative mx-auto grid size-20 place-items-center">
              <span
                aria-hidden="true"
                className="ring-primary/10 absolute inset-0 rounded-full ring-1"
              />
              <span
                aria-hidden="true"
                className="ring-primary/20 absolute inset-3 rounded-full ring-1"
              />
              <span className="bg-primary/12 text-primary relative grid size-10 place-items-center rounded-full">
                <Target aria-hidden="true" className="size-5" />
              </span>
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

      {later.length > 0 && <RouteStops items={later} />}
    </section>
  );
}
