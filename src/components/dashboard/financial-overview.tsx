import {
  ArrowRight,
  ChartPie,
  Landmark,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  DashboardCardHeading,
  dashboardCardClass,
  dashboardTileClass,
} from "@/components/dashboard/dashboard-card";
import { MoneyAmount } from "@/components/money/money-amount";
import type { MonthPace } from "@/lib/budgets/plan";
import { budgetUsage, cashFlow, paydayLabel } from "@/lib/dashboard/today";
import { formatCalendarDate } from "@/lib/dates/dates";
import { cn } from "@/lib/utils";
import styles from "./today.module.css";

export type FinancialSnapshot = {
  total_balance_centavos: number;
  income_month_centavos: number;
  expense_month_centavos: number;
  remaining_budget_centavos: number | null;
  debt_remaining_centavos: number;
  next_financial_deadline: string | null;
  days_until_payday: number | null;
};

function Bar({
  share,
  className,
  marker,
}: {
  share: number;
  className: string;
  /** Where an even pace would be, 0–1. */
  marker?: number;
}) {
  return (
    <span aria-hidden="true" className="relative block">
      <span className="bg-muted block h-2 overflow-hidden rounded-full">
        <span
          className={cn(styles.fill, "block h-full rounded-full", className)}
          style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }}
        />
      </span>
      {marker != null ? (
        <span
          className="bg-foreground ring-card absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full ring-2"
          style={{ left: `${Math.min(Math.max(marker, 0), 1) * 100}%` }}
        />
      ) : null}
    </span>
  );
}

function FlowRow({
  label,
  centavos,
  share,
  barClassName,
}: {
  label: string;
  centavos: number;
  share: number;
  barClassName: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-mono text-sm font-semibold [overflow-wrap:anywhere]">
        <MoneyAmount centavos={centavos} quietCentavos />
      </dd>
      <dd className="mt-1.5 basis-full">
        <Bar share={share} className={barClassName} />
      </dd>
    </div>
  );
}

function CashFlow({
  incomeCentavos,
  expenseCentavos,
  monthName,
}: {
  incomeCentavos: number;
  expenseCentavos: number;
  monthName: string;
}) {
  const flow = cashFlow(incomeCentavos, expenseCentavos);

  return (
    <div className={dashboardTileClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-xs font-semibold">{monthName} so far</p>
        <p className="text-muted-foreground text-[11px]">Transfers excluded</p>
      </div>
      {flow.empty ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          No income or expenses recorded yet this month.
        </p>
      ) : (
        <>
          <dl className="mt-3 space-y-3">
            <FlowRow
              label="Money in"
              centavos={incomeCentavos}
              share={flow.incomeShare}
              barClassName="bg-positive"
            />
            <FlowRow
              label="Money out"
              centavos={expenseCentavos}
              share={flow.expenseShare}
              barClassName="bg-primary"
            />
          </dl>
          <p className="border-border text-muted-foreground mt-3.5 border-t pt-3 text-xs leading-5">
            <MoneyAmount
              centavos={flow.netCentavos}
              sign="always"
              className={cn(
                "font-mono font-semibold",
                flow.netCentavos >= 0 ? "text-positive" : "text-destructive",
              )}
            />{" "}
            {flow.netCentavos >= 0 ? "kept so far" : "more out than in"}
            {flow.netCentavos > 0 && incomeCentavos > 0 ? (
              <span className="bg-positive/10 text-positive ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold whitespace-nowrap">
                {Math.round((flow.netCentavos / incomeCentavos) * 100)}% of
                income
              </span>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}

function MoneyTile({
  href,
  icon: Icon,
  label,
  value,
  children,
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        dashboardTileClass,
        "group hover:ring-primary/35 focus-visible:ring-ring hover:bg-background/80 flex flex-col transition-[box-shadow,background-color] focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      <span className="text-muted-foreground flex items-center justify-between gap-2 text-xs font-medium">
        <span className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden="true" className="text-primary size-3.5 shrink-0" />
          {label}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="group-hover:text-primary size-3 shrink-0 transition-colors max-sm:hidden"
        />
      </span>
      <span className="mt-2 block font-mono text-lg leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">
        {value}
      </span>
      {children}
    </Link>
  );
}

export function FinancialOverview({
  financial,
  monthName,
  pace,
}: {
  financial: FinancialSnapshot;
  monthName: string;
  /** This month's progress, for an even-pace marker on the budget. */
  pace?: MonthPace;
}) {
  const budget = budgetUsage(
    financial.remaining_budget_centavos,
    financial.expense_month_centavos,
  );
  const payday = paydayLabel(financial.days_until_payday);

  return (
    <section
      aria-labelledby="financial-snapshot"
      data-spotlight
      className={cn(dashboardCardClass, "flex flex-col")}
    >
      <DashboardCardHeading
        id="financial-snapshot"
        icon={WalletCards}
        title="Financial position"
        description="Where your money stands now"
        action={{ href: "/money/accounts", label: "Money" }}
      />

      <div className="mt-6 grid gap-5 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @lg:items-center @lg:gap-6">
        <dl className="min-w-0">
          <dt className="text-muted-foreground text-xs font-medium">
            Available balance
          </dt>
          <dd className="mt-2 min-w-0 font-mono text-[clamp(2.125rem,10vw,2.875rem)] leading-none font-semibold tracking-[-0.05em] [overflow-wrap:anywhere] break-words">
            <MoneyAmount
              centavos={financial.total_balance_centavos}
              quietCentavos
            />
          </dd>
          <dd className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-muted-foreground text-xs">
              Across active accounts
            </span>
            {payday ? (
              <span className="bg-positive/10 text-positive ring-positive/20 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold ring-1">
                {payday}
              </span>
            ) : null}
          </dd>
        </dl>
        <CashFlow
          incomeCentavos={financial.income_month_centavos}
          expenseCentavos={financial.expense_month_centavos}
          monthName={monthName}
        />
      </div>

      <div className="mt-3 grid gap-3 @[18rem]:grid-cols-2">
        <MoneyTile
          href="/money/budget"
          icon={ChartPie}
          label={budget?.over ? "Over budget by" : "Budget left"}
          value={
            budget ? (
              <MoneyAmount
                centavos={Math.abs(budget.leftCentavos)}
                quietCentavos
                className={cn(budget.over && "text-destructive")}
              />
            ) : (
              <span className="text-muted-foreground font-sans text-base font-medium tracking-normal">
                No budget set
              </span>
            )
          }
        >
          {budget ? (
            <>
              <span className="mt-3 block">
                <Bar
                  share={budget.ratio}
                  className={
                    budget.over
                      ? "bg-destructive"
                      : "from-primary-solid to-primary bg-gradient-to-r"
                  }
                  marker={
                    pace?.phase === "current" ? pace.elapsedRatio : undefined
                  }
                />
              </span>
              <span className="text-muted-foreground mt-2 block text-xs leading-5">
                {budget.plannedCentavos > 0 ? (
                  <>
                    {Math.round(budget.ratio * 100)}% of{" "}
                    <MoneyAmount
                      centavos={budget.plannedCentavos}
                      className="font-mono"
                    />{" "}
                    used
                  </>
                ) : (
                  "Spending with nothing planned"
                )}
                {pace?.phase === "current" ? (
                  <span className="block">
                    Day {pace.daysElapsed} of {pace.daysInMonth}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <span className="text-primary mt-2 block text-xs leading-5 font-semibold">
              Plan {monthName}
            </span>
          )}
        </MoneyTile>
        <MoneyTile
          href="/debts"
          icon={Landmark}
          label="Debt remaining"
          value={
            <MoneyAmount
              centavos={financial.debt_remaining_centavos}
              quietCentavos
            />
          }
        >
          <span className="text-muted-foreground mt-2 block text-xs leading-5 break-words">
            {financial.next_financial_deadline
              ? `Next due ${formatCalendarDate(financial.next_financial_deadline)}`
              : "No active deadline"}
          </span>
        </MoneyTile>
      </div>

      <div className="mt-auto flex justify-end pt-2">
        <Link
          href="/money/runway"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          View runway <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      </div>
    </section>
  );
}
