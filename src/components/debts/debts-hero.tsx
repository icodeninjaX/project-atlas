import {
  ArrowDown,
  CalendarClock,
  Landmark,
  PartyPopper,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  DueChip,
  RepaidBar,
  formatPercent,
} from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import {
  HeroStat,
  MoneyHeroShell,
  TonePill,
  type HeroTone,
} from "@/components/money/money-hero";
import { Button } from "@/components/ui/button";
import type { DebtStrategy } from "@/lib/debts/debt";
import {
  STRATEGY_DETAILS,
  formatPayoffDuration,
  payoffMonthLabel,
  type DueTone,
  type PayoffPlan,
} from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

export type NextDue = {
  creditorName: string;
  tone: DueTone;
  label: string;
};

const monthName = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
});

function Figure({ centavos, warm }: { centavos: number; warm: boolean }) {
  return (
    <p className="mt-4">
      <MoneyAmount
        centavos={centavos}
        quietCentavos
        className={cn(
          // A dimmed child would leave the clipped gradient, so the
          // centavos keep full opacity and stay quiet by size alone.
          "bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(2.5rem,12.5vw,4.75rem)] leading-[0.95] font-semibold tracking-[-0.055em] [overflow-wrap:anywhere] text-transparent [&_span]:opacity-100",
          warm
            ? "from-destructive to-destructive/75"
            : "from-foreground via-foreground to-foreground/55",
        )}
      />
    </p>
  );
}

function Actions({
  onAdd,
  planHref,
}: {
  onAdd: () => void;
  planHref?: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
      <Button type="button" onClick={onAdd}>
        <Plus className="size-4" aria-hidden="true" />
        Add debt
      </Button>
      {planHref ? (
        <Button asChild variant="secondary">
          <a href={planHref}>
            <ArrowDown className="size-4" aria-hidden="true" />
            See the payoff plan
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function heroStatus(
  plan: PayoffPlan,
  overdue: number,
  today: string,
): { tone: HeroTone; label: string } {
  if (plan.status === "stalled") {
    return { tone: "destructive", label: "Not shrinking at this pace" };
  }
  if (overdue > 0) {
    return {
      tone: "destructive",
      label:
        overdue === 1 ? "1 payment overdue" : `${overdue} payments overdue`,
    };
  }
  return {
    tone: "positive",
    label: `Debt-free by ${payoffMonthLabel(today, plan.months ?? 0)}`,
  };
}

/** The debts page lead: what is owed, how much is repaid, and when it ends. */
export function DebtsHero({
  plan,
  strategy,
  today,
  openCount,
  activeCount,
  remainingCentavos,
  borrowedCentavos,
  repaidCentavos,
  minimumsCentavos,
  interestThisMonthCentavos,
  paidThisMonthCentavos,
  paymentsThisMonth,
  nextDue,
  overdueCount,
  onAdd,
}: {
  plan: PayoffPlan;
  strategy: DebtStrategy;
  /** YYYY-MM-DD in Manila. */
  today: string;
  openCount: number;
  activeCount: number;
  remainingCentavos: number;
  /** Everything ever borrowed across the debts listed, paid ones too. */
  borrowedCentavos: number;
  repaidCentavos: number;
  minimumsCentavos: number;
  interestThisMonthCentavos: number;
  paidThisMonthCentavos: number;
  paymentsThisMonth: number;
  nextDue: NextDue | null;
  overdueCount: number;
  onAdd: () => void;
}) {
  const status = heroStatus(plan, overdueCount, today);
  const share = borrowedCentavos > 0 ? repaidCentavos / borrowedCentavos : 0;
  const month = monthName.format(new Date(`${today.slice(0, 7)}-01T00:00:00Z`));

  return (
    <MoneyHeroShell labelledBy="debts-heading" tone={status.tone}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="debts-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Total remaining
        </h2>
        <TonePill tone={status.tone}>{status.label}</TonePill>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <Figure
            centavos={remainingCentavos}
            warm={plan.status === "stalled"}
          />
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            Across {openCount} open {openCount === 1 ? "debt" : "debts"}. You
            have repaid{" "}
            <MoneyAmount
              centavos={repaidCentavos}
              className="text-foreground font-mono font-semibold"
            />{" "}
            of the{" "}
            <MoneyAmount centavos={borrowedCentavos} className="font-mono" />{" "}
            borrowed.
          </p>

          <div className="mt-5">
            <RepaidBar share={share} />
            <p className="text-muted-foreground mt-2 text-xs">
              <span className="text-foreground font-mono font-semibold">
                {formatPercent(share)}
              </span>{" "}
              of everything borrowed is repaid
            </p>
          </div>

          {nextDue ? (
            <div
              className={cn(
                "mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl p-3.5 ring-1",
                nextDue.tone === "destructive"
                  ? "bg-destructive/[0.06] ring-destructive/25"
                  : "bg-background/55 ring-border/80",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  nextDue.tone === "destructive"
                    ? "bg-destructive/12 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                <CalendarClock className="size-4" />
              </span>
              <p className="min-w-0 flex-[1_1_9rem]">
                <span className="text-muted-foreground block text-xs">
                  Next payment
                </span>
                <span className="block text-sm font-semibold break-words">
                  {nextDue.creditorName}
                </span>
              </p>
              <DueChip tone={nextDue.tone} label={nextDue.label} />
            </div>
          ) : null}

          <Actions onAdd={onAdd} planHref="#plan" />
        </div>

        <dl className="max-sm:border-border grid grid-cols-2 gap-x-6 gap-y-5 max-sm:border-t max-sm:pt-5 sm:gap-3 @max-[17rem]:grid-cols-1">
          <HeroStat
            label="Debt-free"
            value={
              plan.status === "paid_off"
                ? payoffMonthLabel(today, plan.months ?? 0)
                : "Not yet"
            }
            tone={plan.status === "stalled" ? "destructive" : undefined}
            note={
              plan.status === "paid_off" ? (
                `In ${formatPayoffDuration(plan.months ?? 0)}, ${STRATEGY_DETAILS[strategy].label.toLowerCase()} order`
              ) : (
                <span className="text-destructive font-medium">
                  Payments do not outpace interest
                </span>
              )
            }
          />
          <HeroStat
            label="Monthly minimums"
            value={<MoneyAmount centavos={minimumsCentavos} />}
            note={
              activeCount === 1
                ? "Across 1 active debt"
                : `Across ${activeCount} active debts`
            }
          />
          <HeroStat
            label="Interest this month"
            value={<MoneyAmount centavos={interestThisMonthCentavos} />}
            note={
              interestThisMonthCentavos > 0
                ? "At today's balances and rates"
                : "Interest-free at today's rates"
            }
          />
          <HeroStat
            label={`Paid in ${month}`}
            value={<MoneyAmount centavos={paidThisMonthCentavos} />}
            tone={paidThisMonthCentavos > 0 ? "positive" : undefined}
            note={
              paymentsThisMonth === 0
                ? "No payments recorded yet"
                : paymentsThisMonth === 1
                  ? "1 payment recorded"
                  : `${paymentsThisMonth} payments recorded`
            }
          />
        </dl>
      </div>
    </MoneyHeroShell>
  );
}

function QuietHero({
  icon,
  pill,
  title,
  children,
  onAdd,
}: {
  icon: ReactNode;
  pill: { tone: HeroTone; label: string };
  title: string;
  children: ReactNode;
  onAdd: () => void;
}) {
  return (
    <MoneyHeroShell labelledBy="debts-heading" tone={pill.tone}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="debts-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Debts
        </h2>
        <TonePill tone={pill.tone}>{pill.label}</TonePill>
      </div>
      <div className="mt-6 flex max-w-xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-[359px]:hidden">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
            {title}
          </p>
          <div className="text-muted-foreground mt-3 text-sm leading-6">
            {children}
          </div>
          <Actions onAdd={onAdd} />
        </div>
      </div>
    </MoneyHeroShell>
  );
}

/** The lead when nothing is owed: nothing tracked yet, or all paid off. */
export function DebtsClearHero({
  repaidCentavos,
  paidCount,
  onAdd,
}: {
  repaidCentavos: number;
  paidCount: number;
  onAdd: () => void;
}) {
  if (paidCount === 0) {
    return (
      <QuietHero
        icon={<Landmark aria-hidden="true" className="size-5" />}
        pill={{ tone: "neutral", label: "Nothing tracked" }}
        title="Map what you owe"
        onAdd={onAdd}
      >
        Add each balance once, with its minimum and rate. You get a debt-free
        date, what interest costs you each month, and the order that pays it off
        fastest.
      </QuietHero>
    );
  }
  return (
    <QuietHero
      icon={<PartyPopper aria-hidden="true" className="size-5" />}
      pill={{ tone: "positive", label: "Debt-free" }}
      title="Every debt is paid off"
      onAdd={onAdd}
    >
      You repaid{" "}
      <MoneyAmount
        centavos={repaidCentavos}
        className="text-foreground font-mono font-semibold"
      />{" "}
      across {paidCount} {paidCount === 1 ? "debt" : "debts"}. Keep it that way,
      or add a new one to plan it from day one.
    </QuietHero>
  );
}
