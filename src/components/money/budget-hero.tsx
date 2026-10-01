import {
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  History,
  PencilLine,
  Plus,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MoneyAmount } from "@/components/money/money-amount";
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
  const arrow =
    "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2">
      <Link
        href={budgetHref(previous, currentMonth)}
        aria-label={`Previous month, ${formatMonthLong(previous)}`}
        className={arrow}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Link>
      <h2
        id="budget-month"
        className="min-w-0 px-1.5 text-base font-semibold tracking-[-0.01em]"
      >
        {formatMonthLong(month)}
      </h2>
      <Link
        href={budgetHref(next, currentMonth)}
        aria-label={`Next month, ${formatMonthLong(next)}`}
        className={arrow}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
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

type Tone = "neutral" | "positive" | "destructive";

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[0.6875rem] leading-none font-semibold",
        tone === "positive" &&
          "border-positive/25 bg-positive/10 text-positive",
        tone === "destructive" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
        tone === "neutral" &&
          "border-border bg-background/60 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "destructive";
}) {
  return (
    // Phones show plain figures; tiles from `sm`, where there is room.
    <div className="sm:border-border sm:bg-background/60 min-w-0 sm:rounded-2xl sm:border sm:p-4">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-mono text-lg leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {note ? (
        <dd className="text-muted-foreground mt-1 text-xs leading-4">{note}</dd>
      ) : null}
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

  const status: { tone: Tone; label: string } = !hasPlan
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
      <Link href="/timeline?module=money">
        <History className="size-4" aria-hidden="true" />
        Timeline
      </Link>
    </Button>
  );

  return (
    <section
      aria-labelledby="budget-month"
      className="border-primary/20 bg-card relative mt-8 overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.12)]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b to-transparent",
          over ? "from-destructive/10" : "from-primary/12",
        )}
      />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSwitcher month={month} currentMonth={currentMonth} />
          {/* Phones show it beside "Left to spend" so the month stays on
              one line. */}
          <span className={cn(hasPlan && "max-sm:hidden")}>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
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
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </span>
              </div>
              <p
                className={cn(
                  "mt-1.5 min-w-0 font-mono text-[clamp(2.375rem,11vw,3.5rem)] leading-none font-semibold tracking-[-0.045em] [overflow-wrap:anywhere]",
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
              <dl className="max-sm:border-border grid grid-cols-2 gap-x-6 gap-y-5 max-sm:border-t max-sm:pt-5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-2 @max-[17rem]:grid-cols-1">
                <Stat
                  label="Planned"
                  value={<MoneyAmount centavos={plan.plannedCentavos} />}
                  note={
                    plan.envelopes.length === 1
                      ? "1 category"
                      : `${plan.envelopes.length} categories`
                  }
                />
                <Stat
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
                <Stat
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
                  <Stat
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
                  <Stat
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
            <p className="text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">
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
                  <CopyPlus className="size-4" aria-hidden="true" />
                  Start from {previousName}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
