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

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "positive" | "destructive";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-mono text-base font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-lg",
          tone === "positive" && "text-positive",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The debts page lead, kept to three answers: how much is owed, how much
 * of it is paid, and when it ends.
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

  return (
    <MoneyHeroShell labelledBy="debts-heading" tone={status?.tone ?? "neutral"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="debts-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          You owe
        </h2>
        {status ? <TonePill tone={status.tone}>{status.label}</TonePill> : null}
      </div>
      <p className="mt-3">
        <MoneyAmount
          centavos={remainingCentavos}
          quietCentavos
          className="font-mono text-[clamp(2.5rem,12vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.055em] [overflow-wrap:anywhere]"
        />
      </p>
      <div className="mt-5 max-w-xl">
        <RepaidBar share={share} />
        <p className="text-muted-foreground mt-2 text-xs">
          <span className="text-foreground font-semibold">
            {formatPercent(share)} paid off
          </span>{" "}
          · <MoneyAmount centavos={repaid} className="font-mono" /> of{" "}
          <MoneyAmount centavos={owedInAllCentavos} className="font-mono" />
        </p>
      </div>
      <dl className="border-border mt-6 grid grid-cols-3 gap-4 border-t pt-5">
        <Fact
          label="Debt-free"
          value={
            plan.status === "paid_off"
              ? payoffMonthLabel(today, plan.months ?? 0)
              : "Not yet"
          }
          tone={plan.status === "stalled" ? "destructive" : undefined}
        />
        <Fact
          label="Minimums a month"
          value={<MoneyAmount centavos={minimumsCentavos} />}
        />
        <Fact
          label={`Paid in ${month}`}
          value={<MoneyAmount centavos={paidThisMonthCentavos} />}
          tone={paidThisMonthCentavos > 0 ? "positive" : undefined}
        />
      </dl>
      <Actions onAdd={onAdd} />
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
