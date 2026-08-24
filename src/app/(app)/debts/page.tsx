import { ArrowRight, Landmark } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { DebtCreatePanel } from "@/components/debts/debt-create-panel";
import { DebtForm } from "@/components/debts/debt-form";
import { TooltipHint } from "@/components/ui/tooltip";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Card, CardContent } from "@/components/ui/card";
import { orderDebts, resolveDebtStrategy } from "@/lib/debts/debt";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Debts" };

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string }>;
}) {
  const requested = (await searchParams).strategy;
  const supabase = await createClient();
  const [debtsResult, preferencesResult] = supabase
    ? await Promise.all([
        supabase
          .from("debts")
          .select(
            "id,creditor_name,debt_type,original_balance_centavos,current_balance_centavos,interest_rate_percent,minimum_payment_centavos,due_day,next_due_date,status,priority,notes",
          )
          .order("priority"),
        supabase.from("user_preferences").select("debt_strategy").maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];
  const savedStrategy = preferencesResult.data?.debt_strategy;
  const strategy = resolveDebtStrategy(requested, savedStrategy);
  const debts = debtsResult.data ?? [];
  const active = debts.filter((debt) => debt.status !== "paid");
  const ordered = orderDebts(
    active.map((debt) => ({
      id: debt.id,
      balanceCentavos: Number(debt.current_balance_centavos),
      interestRatePercent: Number(debt.interest_rate_percent),
      priority: debt.priority,
    })),
    strategy,
  );
  const rank = new Map(ordered.map((debt, index) => [debt.id, index]));
  active.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  const total = active.reduce(
    (sum, debt) => sum + Number(debt.current_balance_centavos),
    0,
  );
  const minimums = active
    .filter((debt) => debt.status === "active")
    .reduce((sum, debt) => sum + Number(debt.minimum_payment_centavos), 0);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <p className="text-primary mb-2 font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
        Recovery plan
      </p>
      <DebtCreatePanel
        heading={
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Debts
          </h1>
        }
        description={
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
            Compare strategies with the same facts. Projections are estimates,
            not guarantees.
          </p>
        }
        summary={
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent>
                <p className="text-muted-foreground text-xs">Total remaining</p>
                <p className="mt-3 font-mono text-3xl font-semibold">
                  <SensitiveValue>{formatCentavos(total)}</SensitiveValue>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-muted-foreground text-xs">
                  Minimum payments
                </p>
                <p className="mt-3 font-mono text-3xl font-semibold">
                  <SensitiveValue>{formatCentavos(minimums)}</SensitiveValue>
                </p>
              </CardContent>
            </Card>
          </div>
        }
      />
      <nav
        aria-label="Debt payoff strategy"
        className="border-border mt-6 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b [&::-webkit-scrollbar]:hidden"
      >
        {(["snowball", "avalanche", "priority"] as const).map((item) => (
          <Link
            key={item}
            href={`/debts?strategy=${item}`}
            className={`min-h-11 shrink-0 border-b-2 px-4 py-3 text-sm capitalize ${strategy === item ? "border-primary font-semibold" : "text-muted-foreground border-transparent"}`}
          >
            {item === "priority" ? "My priority" : item}
          </Link>
        ))}
      </nav>
      <p className="text-muted-foreground mt-3 text-xs">
        {strategy === "snowball" && "Smallest remaining balance first."}
        {strategy === "avalanche" && "Highest annual interest rate first."}
        {strategy === "priority" && "Your explicit priority order."}
      </p>
      <div className="mt-5 space-y-3">
        {active.length === 0 ? (
          <div className="border-border grid min-h-60 place-items-center rounded-2xl border border-dashed text-center">
            <div>
              <Landmark className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No active debts mapped.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Add each balance once to compare repayment routes.
              </p>
            </div>
          </div>
        ) : (
          active.map((debt, index) => (
            <div
              key={debt.id}
              className="border-border bg-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 rounded-2xl border p-4"
            >
              <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {debt.creditor_name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs capitalize">
                  {String(debt.debt_type).replaceAll("_", " ")} ·{" "}
                  {Number(debt.interest_rate_percent)}% APR
                  {debt.next_due_date ? ` · due ${debt.next_due_date}` : ""}
                </p>
              </div>
              <TooltipHint
                label={`Open ${debt.creditor_name} details`}
                side="left"
              >
                <Link
                  href={`/debts/${debt.id}` as Route}
                  aria-label={`Open ${debt.creditor_name} debt details`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 place-items-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ArrowRight className="size-4" />
                </Link>
              </TooltipHint>
              <p className="col-start-2 col-end-4 mt-2 font-mono text-base font-semibold break-words">
                <SensitiveValue>
                  {formatCentavos(Number(debt.current_balance_centavos))}
                </SensitiveValue>
              </p>
              <details className="border-border col-span-full mt-3 border-t pt-3">
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  Edit debt
                </summary>
                <DebtForm debt={debt} />
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
