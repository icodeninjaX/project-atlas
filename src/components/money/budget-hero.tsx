import { ChevronLeft, ChevronRight, PencilLine, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { MoneyAmount } from "@/components/money/money-amount";
import {
  HeroStat,
  MoneyHeroShell,
  TonePill,
  type HeroTone,
} from "@/components/money/money-hero";
import { Button } from "@/components/ui/button";
import {
  dailyAllowance,
  shiftMonth,
  type BudgetPlan,
  type MonthPace,
} from "@/lib/budgets/plan";
import { cn } from "@/lib/utils";

const monthLong = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const monthOnly = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
});
const monthDay = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});
const list = new Intl.ListFormat("en", { type: "conjunction" });

const asDate = (month: string) => new Date(`${month}-01T00:00:00Z`);
export const formatMonthLong = (month: string) =>
  monthLong.format(asDate(month));
export const formatMonthName = (month: string) =>
  monthOnly.format(asDate(month));

export function budgetHref(month: string, currentMonth: string): Route {
  return (
    month === currentMonth ? "/money/budget" : `/money/budget?month=${month}`
  ) as Route;
}

function MonthSwitcher({
  month,
  currentMonth,
}: {
  month: string;
  currentMonth: string;
}) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2">
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="shrink-0 sm:size-9"
      >
        <Link
          href={budgetHref(previous, currentMonth)}
          aria-label={`Previous month, ${formatMonthLong(previous)}`}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
      </Button>
      <h2
        id="budget-month"
        className="min-w-0 px-1.5 text-base font-semibold tracking-[-0.01em]"
      >
        {formatMonthLong(month)}
      </h2>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="shrink-0 sm:size-9"
      >
        <Link
          href={budgetHref(next, currentMonth)}
          aria-label={`Next month, ${formatMonthLong(next)}`}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
      {month === currentMonth ? null : (
        <Link
          href="/money/budget"
          className="text-primary focus-visible:ring-ring ml-1 inline-flex min-h-11 items-center rounded-lg px-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
        >
          This month
        </Link>
      )}
    </div>
  );
}

function PlanMeter({ plan, pace }: { plan: BudgetPlan; pace: MonthPace }) {
  // A plan saved with only ₱0 amounts has no share to show: any spending is
  // simply over, and none is simply nothing.
  const zeroPlan = plan.plannedCentavos === 0;
  const ratio = zeroPlan
    ? plan.spentCentavos > 0
      ? 1
      : 0
    : plan.spentCentavos / plan.plannedCentavos;
  const percent = Math.round(ratio * 100);
  const over = plan.leftCentavos < 0;
  const spentText = zeroPlan
    ? plan.spentCentavos > 0
      ? "Spending with nothing planned"
      : "Nothing planned or spent"
    : `${percent}% of the plan spent`;
  const monthNote =
    pace.phase === "current"
      ? `Day ${pace.daysElapsed} of ${pace.daysInMonth}`
      : pace.phase === "past"
        ? "Month closed"
        : "Not started";

  return (
    <div className="mt-6">
      <div className="relative">
        <div
          role="meter"
          aria-label="Plan spent"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(percent, 100)}
          aria-valuetext={
            pace.phase === "current"
              ? `${spentText}, ${Math.round(pace.elapsedRatio * 100)}% of the month gone`
              : spentText
          }
          className={cn(
            "h-2.5 overflow-hidden rounded-full",
            over ? "bg-destructive/15" : "bg-primary/15",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full",
              over ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
        {pace.phase === "current" ? (
          // Where an even pace would be today; the text below carries it too.
          <span
            aria-hidden="true"
            className="bg-foreground ring-card absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full ring-2"
            style={{ left: `${pace.elapsedRatio * 100}%` }}
          />
        ) : null}
      </div>
      <div className="text-muted-foreground mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
        {zeroPlan ? (
          <span>{spentText}</span>
        ) : (
          <span>
            <span className="text-foreground font-mono font-semibold">
              {percent}%
            </span>{" "}
            of plan spent
          </span>
        )}
        <span>{monthNote}</span>
      </div>
    </div>
  );
}

function daysLeftText(pace: MonthPace, month: string) {
  if (pace.phase === "past") return "month closed";
  if (pace.phase === "future")
    return `starts ${monthDay.format(asDate(month))}`;
  return pace.daysLeft === 1 ? "last day" : `${pace.daysLeft} days left`;
}

function overNames(plan: BudgetPlan) {
  const names = plan.envelopes
    .filter((envelope) => envelope.status === "over")
    .map((envelope) => envelope.category.name);
  if (names.length <= 3) return list.format(names);
  return list.format([...names.slice(0, 3), `${names.length - 3} more`]);
}

/** The budget page lead: the month, what is left, and how it is going. */
export function BudgetHero({
  month,
  currentMonth,
  pace,
  plan,
  hasPlan,
  expectedIncomeCentavos,
  previousPlanAvailable,
  onEdit,
  onCopyPrevious,
}: {
  month: string;
  currentMonth: string;
  pace: MonthPace;
  plan: BudgetPlan;
  hasPlan: boolean;
  expectedIncomeCentavos: number;
  previousPlanAvailable: boolean;
  onEdit: () => void;
  onCopyPrevious: () => void;
}) {
  // Without a plan every peso is unplanned rather than over.
  const over = hasPlan && plan.leftCentavos < 0;
  const allowance = dailyAllowance(plan.leftCentavos, pace);
  const unplannedSpent = plan.unplanned.reduce(
    (sum, item) => sum + item.spentCentavos,
    0,
  );
  const unassigned = expectedIncomeCentavos - plan.plannedCentavos;
  const name = formatMonthName(month);
  const previousName = formatMonthName(shiftMonth(month, -1));

  const status: { tone: HeroTone; label: string } = !hasPlan
    ? { tone: "neutral", label: "No plan yet" }
    : over
      ? { tone: "destructive", label: "Over plan" }
      : plan.overCount > 0
        ? {
            tone: "destructive",
            label:
              plan.overCount === 1
                ? "1 category over"
                : `${plan.overCount} categories over`,
          }
        : pace.phase === "future"
          ? { tone: "neutral", label: "Upcoming" }
          : pace.phase === "past"
            ? { tone: "positive", label: "Stayed in plan" }
            : { tone: "positive", label: "On track" };

  const timeline = (
    <Button asChild variant="secondary">
      <Link href="/timeline?module=money">Timeline</Link>
    </Button>
  );

  return (
    <MoneyHeroShell
      labelledBy="budget-month"
      tone={over ? "destructive" : "neutral"}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSwitcher month={month} currentMonth={currentMonth} />
          {/* Phones show it beside "Left to spend" so the month stays on
              one line. */}
          <span className={cn(hasPlan && "max-sm:hidden")}>
            <TonePill tone={status.tone}>{status.label}</TonePill>
          </span>
        </div>

        {hasPlan ? (
          <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm font-medium">
                  {over
                    ? "Over plan by"
                    : pace.phase === "past"
                      ? "Left unspent"
                      : "Left to spend"}
                </p>
                <span className="sm:hidden">
                  <TonePill tone={status.tone}>{status.label}</TonePill>
                </span>
              </div>
              <p
                className={cn(
                  "mt-1.5 min-w-0 font-mono text-[clamp(2.25rem,9vw,3rem)] leading-none font-semibold tracking-[-0.03em] [overflow-wrap:anywhere]",
                  over && "text-destructive",
                )}
              >
                <MoneyAmount
                  centavos={Math.abs(plan.leftCentavos)}
                  quietCentavos
                />
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                <MoneyAmount
                  centavos={plan.spentCentavos}
                  className="text-foreground font-mono font-semibold"
                />{" "}
                spent of{" "}
                <MoneyAmount
                  centavos={plan.plannedCentavos}
                  className="text-foreground font-mono font-semibold"
                />{" "}
                · {daysLeftText(pace, month)}
              </p>
              <PlanMeter plan={plan} pace={pace} />
              <div className="mt-4 space-y-1.5 text-sm leading-6">
                {allowance !== null ? (
                  <p className="text-muted-foreground">
                    That leaves about{" "}
                    <MoneyAmount
                      centavos={allowance}
                      className="text-foreground font-mono font-semibold"
                    />{" "}
                    a day for the rest of {name}.
                  </p>
                ) : null}
                {over && pace.phase === "current" ? (
                  <p className="text-muted-foreground">
                    Spending passed the plan with{" "}
                    {pace.daysLeft === 1
                      ? "today still to go"
                      : `${pace.daysLeft} days to go`}
                    .
                  </p>
                ) : null}
                {plan.overCount > 0 ? (
                  <p className="text-destructive font-medium">
                    Over in {overNames(plan)}.
                  </p>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
                <Button type="button" onClick={onEdit}>
                  <PencilLine className="size-4" aria-hidden="true" />
                  Edit plan
                </Button>
                {timeline}
              </div>
            </div>
            <div className="@container min-w-0">
              <dl className="max-sm:border-border grid grid-cols-2 gap-x-6 gap-y-5 max-sm:border-t max-sm:pt-5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-2 @max-[17rem]:grid-cols-1">
                <HeroStat
                  label="Planned"
                  value={<MoneyAmount centavos={plan.plannedCentavos} />}
                  note={
                    plan.envelopes.length === 1
                      ? "1 category"
                      : `${plan.envelopes.length} categories`
                  }
                />
                <HeroStat
                  label="Spent"
                  value={<MoneyAmount centavos={plan.spentCentavos} />}
                  note={
                    unplannedSpent > 0 ? (
                      <>
                        <MoneyAmount
                          centavos={unplannedSpent}
                          className="font-mono"
                        />{" "}
                        outside the plan
                      </>
                    ) : (
                      "All within the plan"
                    )
                  }
                />
                <HeroStat
                  label="Expected income"
                  value={
                    expectedIncomeCentavos > 0 ? (
                      <MoneyAmount centavos={expectedIncomeCentavos} />
                    ) : (
                      <span className="text-muted-foreground font-sans text-base font-medium tracking-normal">
                        Not set
                      </span>
                    )
                  }
                  note={
                    expectedIncomeCentavos > 0
                      ? `For ${name}`
                      : "Add it when you edit the plan"
                  }
                />
                {expectedIncomeCentavos > 0 ? (
                  <HeroStat
                    label={
                      unassigned >= 0 ? "Not yet planned" : "Beyond income"
                    }
                    value={<MoneyAmount centavos={Math.abs(unassigned)} />}
                    note={
                      unassigned >= 0
                        ? "Income with no category yet"
                        : "The plan is more than expected income"
                    }
                    tone={unassigned < 0 ? "destructive" : undefined}
                  />
                ) : (
                  <HeroStat
                    label="Not yet planned"
                    value={
                      <span className="text-muted-foreground font-sans text-base font-medium tracking-normal">
                        —
                      </span>
                    }
                    note="Needs expected income"
                  />
                )}
              </dl>
            </div>
          </div>
        ) : (
          <div className="mt-6 max-w-xl">
            <p className="text-lg leading-tight font-semibold">
              {pace.phase === "future"
                ? `Plan ${name} ahead`
                : `No plan for ${name} yet`}
            </p>
            {plan.spentCentavos > 0 ? (
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                <MoneyAmount
                  centavos={plan.spentCentavos}
                  className="text-foreground font-mono font-semibold"
                />{" "}
                {pace.phase === "past" ? "went out" : "has gone out so far"}{" "}
                across{" "}
                {plan.unplanned.length === 1
                  ? "1 category"
                  : `${plan.unplanned.length} categories`}
                .
              </p>
            ) : null}
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Set what you mean to spend in each category, and every expense you
              record shows up against it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
              <Button type="button" onClick={onEdit}>
                <Plus className="size-4" aria-hidden="true" />
                Plan {name}
              </Button>
              {previousPlanAvailable ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCopyPrevious}
                >
                  Start from {previousName}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </MoneyHeroShell>
  );
}
