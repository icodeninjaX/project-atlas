import { ArrowUpRight, Compass, Flame } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { CompassLink } from "@/components/reviews/compass-link";
import {
  HeroShell,
  StatusPill,
  eyebrowClass,
  tileClass,
} from "@/components/reviews/review-visuals";
import { moduleTones } from "@/components/timeline/module-tone";
import { compactReviewWeekLabel, reviewWeekLabel } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import {
  isoWeekNumber,
  weekDays,
  type Compass as WeekCompass,
  type ThisWeekStatus,
} from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

/** What the records say about this week so far. */
export type WeekFacts = {
  tasks: number;
  spendingCentavos: number;
  debtPaymentsCentavos: number;
  applications: number;
  goals: number;
};

function WeekStrip({
  weekStart,
  dayIndex,
}: {
  weekStart: string;
  dayIndex: number;
}) {
  const days = weekDays(weekStart, dayIndex);
  const today = days[dayIndex]!;
  return (
    <div className="mt-6">
      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-semibold">
          Today is {today.name}
        </span>{" "}
        · day {dayIndex + 1} of 7
      </p>
      {/* Decorative: the sentence above and the status carry the same. */}
      <ol
        aria-hidden="true"
        className="mt-3 grid max-w-md grid-cols-7 gap-1 min-[360px]:gap-1.5 sm:gap-2"
      >
        {days.map((day) => (
          <li
            key={day.iso}
            className={cn(
              "flex min-w-0 flex-col items-center gap-0.5 rounded-xl py-2 sm:rounded-2xl sm:py-2.5",
              day.state === "past" && "bg-primary/10 text-foreground",
              day.state === "today" &&
                "bg-primary-solid text-primary-solid-foreground shadow-[0_10px_24px_-10px_var(--primary-solid)]",
              day.state === "future" && "bg-muted/60 text-muted-foreground",
            )}
          >
            <span className="text-[0.625rem] leading-none font-semibold tracking-[0.06em] uppercase">
              <span className="@max-[24rem]:hidden">{day.short}</span>
              <span className="@min-[24rem]:hidden">{day.short.charAt(0)}</span>
            </span>
            <span className="font-mono text-[0.9375rem] leading-tight font-semibold sm:text-lg">
              {day.day}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CompassCard({ compass }: { compass: WeekCompass | null }) {
  return (
    <div
      className={cn(
        "relative isolate h-full overflow-hidden rounded-2xl p-4 ring-1 sm:p-5",
        compass
          ? "bg-primary/[0.07] ring-primary/25"
          : "bg-background/55 ring-border/80",
      )}
    >
      {compass ? (
        <div
          aria-hidden="true"
          className="bg-primary/25 pointer-events-none absolute -top-14 -right-10 -z-10 size-40 rounded-full blur-3xl"
        />
      ) : null}
      <h3 className={cn(eyebrowClass, "flex items-center gap-1.5")}>
        <Compass aria-hidden="true" className="text-primary size-3.5" />
        Your compass this week
      </h3>
      {compass ? (
        <>
          <blockquote className="mt-3 text-xl leading-snug font-semibold tracking-[-0.02em] text-balance break-words sm:text-[1.375rem]">
            <p>“{compass.text}”</p>
          </blockquote>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            Chosen at the end of last week’s review.
          </p>
          <div className="mt-2">
            <CompassLink reviewId={compass.reviewId}>
              Read that review
              <span className="sr-only">
                {" "}
                for {reviewWeekLabel(compass.weekStart)}
              </span>
            </CompassLink>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-[0.9375rem] leading-6 font-semibold">
            No compass for this week yet
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            The last prompt of each review chooses one direction for the week
            after. Next week, it will be waiting here.
          </p>
        </>
      )}
    </div>
  );
}

function FactsRow({ facts }: { facts: WeekFacts }) {
  const items = [
    {
      key: "tasks",
      label: "Tasks completed",
      value: String(facts.tasks),
      tone: moduleTones.tasks,
      sensitive: false,
      empty: facts.tasks === 0,
    },
    {
      key: "spending",
      label: "Spending",
      value: formatCentavos(facts.spendingCentavos),
      tone: moduleTones.money,
      sensitive: true,
      empty: facts.spendingCentavos === 0,
    },
    {
      key: "debt",
      label: "Debt payments",
      value: formatCentavos(facts.debtPaymentsCentavos),
      tone: moduleTones.debt,
      sensitive: true,
      empty: facts.debtPaymentsCentavos === 0,
    },
    {
      key: "applications",
      label: "Applications sent",
      value: String(facts.applications),
      tone: moduleTones.career,
      sensitive: false,
      empty: facts.applications === 0,
    },
    {
      key: "goals",
      label: "Goals progressed",
      value: String(facts.goals),
      tone: moduleTones.goals,
      sensitive: false,
      empty: facts.goals === 0,
    },
  ];

  return (
    <div className="border-border/70 mt-7 border-t pt-6 sm:mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="week-facts-heading" className={eyebrowClass}>
          The week in facts
        </h3>
        <p className="text-muted-foreground text-[0.6875rem]">
          From your records, Monday to now
        </p>
      </div>
      <ul
        aria-labelledby="week-facts-heading"
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5"
      >
        {items.map(({ key, label, value, tone, sensitive, empty }) => {
          const Icon = tone.icon;
          return (
            <li key={key} className="min-w-0 max-sm:last:col-span-2">
              <Link
                href={tone.href as Route}
                className={cn(
                  tileClass,
                  "group hover:bg-card focus-visible:ring-ring flex h-full flex-col gap-3 p-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-4",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg ring-1",
                      tone.soft,
                      tone.text,
                      tone.ring,
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block font-mono text-xl leading-tight font-semibold tracking-[-0.02em] break-words",
                      empty && "text-muted-foreground",
                    )}
                  >
                    {sensitive ? (
                      <SensitiveValue>{value}</SensitiveValue>
                    ) : (
                      value
                    )}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-4">
                    {label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** This week at a glance: where it stands, its compass, and its facts. */
export function WeekHero({
  weekStart,
  dayIndex,
  status,
  streak,
  compass,
  facts,
}: {
  weekStart: string;
  dayIndex: number;
  status: ThisWeekStatus;
  streak: string | null;
  compass: WeekCompass | null;
  facts: WeekFacts;
}) {
  return (
    <HeroShell labelledBy="this-week-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="this-week-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          This week · Week {isoWeekNumber(weekStart)}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {streak ? (
            <StatusPill tone="neutral" icon={Flame}>
              {streak}
            </StatusPill>
          ) : null}
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
      </div>

      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-x-12">
        <div className="min-w-0">
          <p className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] text-[clamp(2.5rem,12vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.055em] text-transparent">
            <time dateTime={weekStart}>
              {compactReviewWeekLabel(weekStart)}
            </time>
          </p>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            {status.sentence}
          </p>
          <WeekStrip weekStart={weekStart} dayIndex={dayIndex} />
        </div>
        <div className="min-w-0">
          <CompassCard compass={compass} />
        </div>
      </div>

      <FactsRow facts={facts} />
    </HeroShell>
  );
}
