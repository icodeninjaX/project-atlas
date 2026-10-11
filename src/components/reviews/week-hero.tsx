import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { CompassLink } from "@/components/reviews/compass-link";
import { HeroShell, StatusPill } from "@/components/reviews/review-visuals";
import { Button } from "@/components/ui/button";
import { compactReviewWeekLabel, reviewWeekLabel } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import {
  isoWeekNumber,
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

/** The direction last week's review chose, as a quiet quote. */
function CompassQuote({ compass }: { compass: WeekCompass }) {
  return (
    <div className="bg-background/55 rounded-xl p-4 sm:p-5">
      <p className="text-muted-foreground text-xs font-medium">
        Your focus this week
      </p>
      <blockquote className="mt-2 text-lg leading-snug font-semibold tracking-[-0.02em] text-balance break-words sm:text-xl">
        <p>“{compass.text}”</p>
      </blockquote>
      <div className="mt-1">
        <CompassLink reviewId={compass.reviewId}>
          From last week’s review
          <span className="sr-only">
            {" "}
            for {reviewWeekLabel(compass.weekStart)}
          </span>
        </CompassLink>
      </div>
    </div>
  );
}

function Facts({ facts }: { facts: WeekFacts }) {
  const items = [
    { label: "Tasks done", value: String(facts.tasks), sensitive: false },
    {
      label: "Spent",
      value: formatCentavos(facts.spendingCentavos),
      sensitive: true,
    },
    {
      label: "Paid to debt",
      value: formatCentavos(facts.debtPaymentsCentavos),
      sensitive: true,
    },
    {
      label: "Applications",
      value: String(facts.applications),
      sensitive: false,
    },
    { label: "Goals moved", value: String(facts.goals), sensitive: false },
  ];

  return (
    <div className="border-border/70 mt-7 border-t pt-5">
      <h3
        id="week-facts-heading"
        className="text-muted-foreground text-xs font-medium"
      >
        From your records so far
      </h3>
      <dl
        aria-labelledby="week-facts-heading"
        className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-5"
      >
        {items.map(({ label, value, sensitive }) => (
          <div key={label} className="min-w-0">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 font-mono text-lg leading-tight font-semibold tracking-[-0.03em] [overflow-wrap:anywhere] tabular-nums">
              {sensitive ? <SensitiveValue>{value}</SensitiveValue> : value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * This week at a glance: where the review stands, the one button that
 * opens it, the focus last week chose, and the week's numbers.
 */
export function WeekHero({
  weekStart,
  status,
  streak,
  compass,
  facts,
}: {
  weekStart: string;
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
          className="text-muted-foreground text-[0.8125rem] font-medium"
        >
          This week · Week {isoWeekNumber(weekStart)}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {streak ? (
            <span className="text-muted-foreground text-xs">{streak}</span>
          ) : null}
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid gap-6",
          compass &&
            "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-x-12",
        )}
      >
        <div className="min-w-0">
          <p className="text-foreground text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-[1.75rem]">
            <time dateTime={weekStart}>
              {compactReviewWeekLabel(weekStart)}
            </time>
          </p>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            {status.sentence}
          </p>
          <Button asChild className="mt-5 w-full sm:w-auto">
            <a href="#weekly-review">{status.action}</a>
          </Button>
        </div>
        {compass ? <CompassQuote compass={compass} /> : null}
      </div>

      <Facts facts={facts} />
    </HeroShell>
  );
}
