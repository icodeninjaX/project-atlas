import { ArrowDownLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import { MoneyAmount } from "@/components/money/money-amount";
import { cn } from "@/lib/utils";

function FlowTile({
  label,
  centavos,
  icon: Icon,
  positive = false,
}: {
  label: string;
  centavos: number;
  icon: LucideIcon;
  positive?: boolean;
}) {
  return (
    <div className="border-border bg-background/60 min-w-0 rounded-2xl border p-4">
      <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full",
            positive
              ? "bg-positive/12 text-positive"
              : "bg-muted text-foreground/80",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        {label}
      </p>
      <p className="mt-2.5 font-mono text-lg leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-xl">
        <MoneyAmount centavos={centavos} />
      </p>
    </div>
  );
}

function SpendingMeter({
  income,
  expenses,
}: {
  income: number;
  expenses: number;
}) {
  if (income <= 0) {
    return (
      <p className="text-muted-foreground text-xs leading-5">
        {expenses > 0
          ? "No income recorded this month yet, so there is nothing to measure spending against."
          : "Nothing recorded this month yet."}
      </p>
    );
  }

  const ratio = expenses / income;
  const over = ratio > 1;
  const percent = Math.round(ratio * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <p className="text-muted-foreground font-medium">
          {over ? (
            <>
              Spending is above income by{" "}
              <MoneyAmount
                centavos={expenses - income}
                className="text-foreground font-mono font-semibold"
              />
            </>
          ) : (
            "Spent of what came in"
          )}
        </p>
        <p className="font-mono font-semibold">
          {percent}
          <span className="text-muted-foreground">%</span>
        </p>
      </div>
      <div
        role="meter"
        aria-label="Spending as a share of income"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-valuetext={`${percent}% of income spent`}
        className={cn(
          "mt-2 h-2 overflow-hidden rounded-full",
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
    </div>
  );
}

/** This month's money movement: the net first, then what made it. */
export function TransactionSummary({
  monthLabel,
  income,
  expenses,
  entryCount,
}: {
  monthLabel: string;
  income: number;
  expenses: number;
  entryCount: number;
}) {
  const net = income - expenses;

  return (
    <section
      aria-labelledby="month-summary-title"
      className="border-border bg-card relative overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.1)]"
    >
      <div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
      />
      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <h2
            id="month-summary-title"
            className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
          >
            {monthLabel} so far
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">Net cash flow</p>
          <p
            className={cn(
              "mt-1 min-w-0 font-mono text-[clamp(2.25rem,10vw,3.25rem)] leading-none font-semibold tracking-[-0.045em] [overflow-wrap:anywhere]",
              net > 0 && "text-positive",
            )}
          >
            <MoneyAmount
              centavos={net}
              sign={net === 0 ? "negative" : "always"}
              quietCentavos
            />
          </p>
          <p className="text-muted-foreground mt-3 text-xs">
            {entryCount === 1 ? "1 entry" : `${entryCount} entries`} · transfers
            excluded
          </p>
        </div>
        <div className="grid min-w-0 gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-3">
            <FlowTile
              label="Money in"
              centavos={income}
              icon={ArrowDownLeft}
              positive
            />
            <FlowTile
              label="Money out"
              centavos={expenses}
              icon={ArrowUpRight}
            />
          </div>
          <SpendingMeter income={income} expenses={expenses} />
        </div>
      </div>
    </section>
  );
}
