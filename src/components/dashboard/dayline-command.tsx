import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  Clock3,
  Flag,
  Goal,
  Landmark,
  Route as RouteIcon,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { buttonVariants } from "@/components/ui/button";
import {
  formatManilaTime,
  scheduleRoute,
  type RouteSchedule,
} from "@/lib/dashboard/today";
import { formatTaskMinutes } from "@/lib/tasks/task-view";
import { cn } from "@/lib/utils";
import styles from "./today.module.css";

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

/** One shade of the accent per stop, strongest for NOW. */
const stopTone = [
  "bg-gradient-to-r from-primary-solid to-primary",
  "bg-primary/60",
  "bg-primary/35",
];

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
  until,
  className,
}: {
  minutes: number | null;
  until?: Date;
  className?: string;
}) {
  if (!minutes) return null;

  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs",
        className,
      )}
    >
      <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
      {minutes} min
      {until ? (
        <span className="text-muted-foreground/90">
          · until {formatManilaTime(until)}
        </span>
      ) : null}
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
  const arcOffset = RING_CIRCUMFERENCE * (1 - Math.min(ratio, 1));

  return (
    <div className="bg-background/50 ring-border/80 flex min-w-0 flex-wrap items-center gap-4 rounded-2xl p-4 ring-1 sm:p-5 lg:flex-col lg:flex-nowrap lg:items-start lg:gap-5">
      <div
        role="meter"
        aria-label="Day load"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
        aria-valuetext={label}
        className="relative grid size-16 shrink-0 place-items-center sm:size-[4.5rem] lg:size-28"
      >
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 size-full -rotate-90 overflow-visible"
        >
          <defs>
            <linearGradient id="dayline-load-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" style={{ stopColor: "var(--primary)" }} />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="8"
            className="stroke-primary/12"
          />
          {ratio > 0 ? (
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={arcOffset}
              stroke={over ? undefined : "url(#dayline-load-arc)"}
              className={cn(
                styles.draw,
                over
                  ? "stroke-destructive"
                  : "drop-shadow-[0_0_6px_color-mix(in_srgb,var(--primary)_45%,transparent)]",
              )}
              style={{ "--ring-from": RING_CIRCUMFERENCE } as CSSProperties}
            />
          ) : null}
        </svg>
        <p
          aria-hidden="true"
          className="font-mono text-sm leading-none font-semibold tracking-[-0.03em] sm:text-base lg:text-2xl"
        >
          {hasMinutes ? (
            <>
              {Math.round(ratio * 100)}
              <span className="text-muted-foreground text-[0.65em] font-medium">
                %
              </span>
            </>
          ) : (
            <>
              {priorityCount}
              <span className="text-muted-foreground text-[0.65em] font-medium">
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

/**
 * The route laid end to end from now against the day's capacity, so the
 * open time is visible too. The legend repeats it in words.
 */
function RouteBar({
  schedule,
  over,
}: {
  schedule: RouteSchedule<DashboardDaylineItem>;
  over: boolean;
}) {
  const openMinutes = schedule.spanMinutes - schedule.totalMinutes;

  return (
    <>
      <div aria-hidden="true" className="mt-3.5 flex h-2.5 gap-[3px]">
        {schedule.stops.map(({ item }, index) => (
          <span
            key={`${item.kind}-${item.id}`}
            className={cn(
              styles.fill,
              "h-full min-w-1.5 rounded-full",
              stopTone[index] ?? stopTone[2],
              index === 0 &&
                "shadow-[0_0_14px_-2px_color-mix(in_srgb,var(--primary)_70%,transparent)]",
            )}
            style={{
              flexGrow: item.durationMinutes ?? 0,
              flexBasis: 0,
              animationDelay: `${index * 90}ms`,
            }}
          />
        ))}
        {openMinutes > 0 ? (
          <span
            className={cn(styles.open, "h-full rounded-full")}
            style={{ flexGrow: openMinutes, flexBasis: 0 }}
          />
        ) : null}
      </div>
      <ul
        aria-label="Route timing"
        className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] leading-4"
      >
        {schedule.stops.map(({ item }, index) => (
          <li
            key={`${item.kind}-${item.id}`}
            className="inline-flex items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                stopTone[index] ?? stopTone[2],
              )}
            />
            <span className="text-foreground font-semibold">
              {item.position === "NOW"
                ? "Now"
                : item.position === "NEXT"
                  ? "Next"
                  : "Later"}
            </span>
            {formatTaskMinutes(item.durationMinutes ?? 0)}
          </li>
        ))}
        {openMinutes > 0 ? (
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(styles.open, "size-2 shrink-0 rounded-full")}
            />
            <span className="text-foreground font-semibold">Open</span>
            {formatTaskMinutes(openMinutes)}
          </li>
        ) : over ? (
          <li className="text-destructive font-semibold">Past capacity</li>
        ) : null}
      </ul>
    </>
  );
}

function RouteStops({
  items,
  startTimes,
}: {
  items: DashboardDaylineItem[];
  startTimes?: Date[];
}) {
  return (
    <ol className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
      {items.map((item, index) => {
        const startsAt = startTimes?.[index];

        return (
          <li key={`${item.kind}-${item.id}`} className="min-w-0">
            <Link
              href={item.href as Route}
              data-spotlight
              className={cn(
                surfaceClass,
                "bg-card/85 focus-visible:ring-ring group relative grid min-h-28 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl p-4 shadow-[0_1px_2px_rgb(7_10_15/0.05)] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgb(7_10_15/0.55)] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 @max-[18rem]:p-3",
              )}
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      stopTone[index + 1] ?? stopTone[2],
                    )}
                  />
                  <span className="text-primary text-[11px] font-bold tracking-[0.12em]">
                    {item.position}
                  </span>
                  {startsAt ? (
                    <span className="text-muted-foreground text-[11px] font-medium">
                      · {formatManilaTime(startsAt)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-base leading-6 font-semibold tracking-tight break-words">
                  {item.title}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-5 break-words">
                  {prioritySummary(item.reason)}
                </span>
                <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <KindLabel kind={item.kind} />
                  <Duration minutes={item.durationMinutes} />
                </span>
              </span>
              <span className="bg-background/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary grid size-8 place-items-center rounded-full transition-colors @max-[18rem]:hidden">
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function DaylineCommand({
  items,
  plannedMinutes,
  capacityMinutes,
  energyLevel,
  now,
}: {
  items: DashboardDaylineItem[];
  plannedMinutes?: number;
  capacityMinutes?: number;
  energyLevel?: string;
  /** When given, the route is timed from this moment. */
  now?: Date;
}) {
  const [current, ...later] = items;
  const schedule = now ? scheduleRoute(items, now, capacityMinutes) : null;
  const over =
    plannedMinutes != null &&
    capacityMinutes != null &&
    plannedMinutes > capacityMinutes;

  return (
    <section
      aria-labelledby="dayline-title"
      className={cn(
        styles.edge,
        styles.grain,
        "bg-card/80 @container relative isolate overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] backdrop-blur-xl sm:rounded-[2rem]",
      )}
    >
      <div
        aria-hidden="true"
        className="from-primary/16 pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/20 pointer-events-none absolute -top-36 -right-24 -z-10 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-80 rounded-full bg-sky-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-45"
      />
      <div
        aria-hidden="true"
        className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />

      <header className="relative flex items-start justify-between gap-3 px-4 pt-4 min-[360px]:px-5 min-[360px]:pt-5 sm:px-7 sm:pt-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-primary/12 text-primary ring-primary/20 grid size-10 shrink-0 place-items-center rounded-xl ring-1 @max-[23rem]:hidden">
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
          className="text-muted-foreground hover:text-foreground hover:bg-background/60 focus-visible:ring-ring ring-border bg-background/30 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-medium ring-1 backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 sm:px-3.5"
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          <span className="max-sm:sr-only">Tune</span>
        </Link>
      </header>

      {current ? (
        <div className="relative grid gap-6 px-4 pt-6 pb-5 min-[360px]:px-5 sm:px-7 sm:pt-9 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="bg-primary-solid text-primary-solid-foreground inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-bold tracking-[0.12em] shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent),0_8px_22px_-6px_color-mix(in_srgb,var(--primary-solid)_75%,transparent)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-current"
                />
                NOW
              </span>
              <KindLabel kind={current.kind} />
              <Duration
                minutes={current.durationMinutes}
                until={schedule?.stops[0]?.endsAt}
              />
            </div>
            <h3 className="mt-5 max-w-2xl min-w-0 text-[1.5rem] leading-[1.12] font-semibold tracking-[-0.04em] text-balance break-words min-[360px]:text-[1.625rem] sm:text-[2.125rem] lg:text-[2.5rem]">
              {current.title}
            </h3>
            <div className="mt-4 max-w-2xl min-w-0">
              <ReasonChips reason={current.reason} />
            </div>
            <div className="mt-6 flex flex-col gap-1 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Link
                href={current.href as Route}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "group w-full min-w-0 rounded-2xl sm:w-auto",
                )}
              >
                Open this next
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
              <details className="group/why max-w-full min-w-0">
                <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none max-sm:justify-center [&::-webkit-details-marker]:hidden">
                  Why this comes first
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3 transition-transform group-open/why:rotate-90 motion-reduce:transition-none"
                  />
                </summary>
                <p className="text-muted-foreground mt-1 max-w-xl px-2 pb-1 text-xs leading-5 break-words">
                  {current.reason}
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
            <span className="relative mx-auto grid size-24 place-items-center">
              <span
                aria-hidden="true"
                className="ring-primary/10 absolute inset-0 rounded-full ring-1"
              />
              <span
                aria-hidden="true"
                className="ring-primary/15 absolute inset-3 rounded-full ring-1"
              />
              <span
                aria-hidden="true"
                className="ring-primary/25 absolute inset-6 rounded-full ring-1"
              />
              <span className="bg-primary/12 text-primary relative grid size-10 place-items-center rounded-full shadow-[0_0_30px_-4px_color-mix(in_srgb,var(--primary)_60%,transparent)]">
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

      {current && (later.length > 0 || schedule) ? (
        <div className="border-border/70 bg-background/35 relative border-t px-4 pt-5 pb-5 min-[360px]:px-5 sm:px-7 sm:pb-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
              {schedule && now
                ? `Your route from ${formatManilaTime(now)}`
                : "Then on your route"}
            </p>
            {schedule ? (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <Flag aria-hidden="true" className="text-primary size-3.5" />
                Clear by {formatManilaTime(schedule.endsAt)}
              </p>
            ) : null}
          </div>
          {schedule ? <RouteBar schedule={schedule} over={over} /> : null}
          {later.length > 0 ? (
            <RouteStops
              items={later}
              startTimes={schedule?.stops.slice(1).map((stop) => stop.startsAt)}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
