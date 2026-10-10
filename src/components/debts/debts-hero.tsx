import { Landmark, PartyPopper, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { RepaidBar, formatPercent } from "@/components/debts/debt-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import {
  MoneyHeroShell,
  TonePill,
  type HeroTone,
} from "@/components/money/money-hero";
import { Button } from "@/components/ui/button";
import { payoffMonthLabel, type PayoffPlan } from "@/lib/debts/plan";
import { cn } from "@/lib/utils";

const monthName = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  month: "long",
});

function Actions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
      <Button type="button" onClick={onAdd}>
        <Plus className="size-4" aria-hidden="true" />
        Add debt
      </Button>
    </div>
  );
}

function heroStatus(
  plan: PayoffPlan,
  overdue: number,
): { tone: HeroTone; label: string } | null {
  if (overdue > 0) {
    return {
      tone: "destructive",
      label:
        overdue === 1 ? "1 payment overdue" : `${overdue} payments overdue`,
    };
  }
  if (plan.status === "stalled") {
    return { tone: "destructive", label: "Not shrinking at this pace" };
  }
  return null;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "positive";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-mono text-lg leading-tight font-semibold tracking-[-0.03em] [overflow-wrap:anywhere] tabular-nums",
          tone === "positive" && "text-positive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The debts page lead: one figure, how far along it is, when it ends, and
 * two quiet numbers for the month. Adding a debt is a small action here;
 * paying is the page's main one.
 */
export function DebtsHero({
  plan,
  today,
  remainingCentavos,
  owedInAllCentavos,
  minimumsCentavos,
  paidThisMonthCentavos,
  overdueCount,
  onAdd,
}: {
  plan: PayoffPlan;
  /** YYYY-MM-DD in Manila. */
  today: string;
  remainingCentavos: number;
  /** Everything owed across the debts listed, paid ones too. */
  owedInAllCentavos: number;
  minimumsCentavos: number;
  paidThisMonthCentavos: number;
  overdueCount: number;
  onAdd: () => void;
}) {
  const status = heroStatus(plan, overdueCount);
  const repaid = owedInAllCentavos - remainingCentavos;
  const share = owedInAllCentavos > 0 ? repaid / owedInAllCentavos : 0;
  const month = monthName.format(new Date(`${today.slice(0, 7)}-01T00:00:00Z`));
  const paidOff = plan.status === "paid_off";

  return (
    <MoneyHeroShell labelledBy="debts-heading" tone={status?.tone ?? "neutral"}>
      <div className="flex items-center justify-between gap-3">
        <h2
          id="debts-heading"
          className="text-muted-foreground text-[0.8125rem] font-medium"
        >
          Total debt
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAdd}
          className="-my-1 rounded-full"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add debt
        </Button>
      </div>
      <p className="mt-2">
        <MoneyAmount
          centavos={remainingCentavos}
          quietCentavos
          className="font-mono text-[clamp(2.75rem,13vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.06em] [overflow-wrap:anywhere] tabular-nums"
        />
      </p>
      {status ? (
        <TonePill tone={status.tone} className="mt-3">
          {status.label}
        </TonePill>
      ) : null}

      <div className="mt-6">
        <RepaidBar share={share} />
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold">
              {formatPercent(share)}
            </span>{" "}
            paid off
          </p>
          <p className="text-muted-foreground">
            Debt-free{" "}
            <span
              className={cn(
                "font-semibold",
                paidOff ? "text-foreground" : "text-destructive",
              )}
            >
              {paidOff
                ? payoffMonthLabel(today, plan.months ?? 0, "long")
                : "not at this pace"}
            </span>
          </p>
        </div>
      </div>

      <dl className="border-border/70 [&>div+div]:border-border/70 mt-6 grid grid-cols-2 border-t pt-5 [&>div+div]:border-l [&>div+div]:pl-5">
        <Stat
          label="Minimums a month"
          value={<MoneyAmount centavos={minimumsCentavos} quietCentavos />}
        />
        <Stat
          label={`Paid in ${month}`}
          value={<MoneyAmount centavos={paidThisMonthCentavos} quietCentavos />}
          tone={paidThisMonthCentavos > 0 ? "positive" : undefined}
        />
      </dl>
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
