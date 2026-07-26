import { ArrowRight, Landmark } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { DebtForm } from "@/components/debts/debt-form";
import { PageHeading } from "@/components/shared/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { orderDebts, type DebtStrategy } from "@/lib/debts/debt";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Debts" };

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string }>;
}) {
  const requested = (await searchParams).strategy;
  const strategy: DebtStrategy = ["snowball", "avalanche", "priority"].includes(
    requested ?? "",
  )
    ? (requested as DebtStrategy)
    : "avalanche";
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("debts")
        .select(
          "id,creditor_name,debt_type,current_balance_centavos,interest_rate_percent,minimum_payment_centavos,next_due_date,status,priority",
        )
        .order("priority")
    : { data: [] };
  const debts = data ?? [];
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
      <PageHeading
        eyebrow="Recovery plan"
        title="Debts"
        description="Compare strategies with the same facts. Projections are estimates, not guarantees."
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Total remaining</p>
            <p className="mt-3 font-mono text-3xl font-semibold">
              {formatCentavos(total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Minimum payments</p>
            <p className="mt-3 font-mono text-3xl font-semibold">
              {formatCentavos(minimums)}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <DebtForm />
      </div>
      <div className="border-border mt-6 flex gap-1 overflow-x-auto border-b">
        {(["snowball", "avalanche", "priority"] as const).map((item) => (
          <Link
            key={item}
            href={`/debts?strategy=${item}`}
            className={`border-b-2 px-4 py-3 text-sm capitalize ${strategy === item ? "border-primary font-semibold" : "text-muted-foreground border-transparent"}`}
          >
            {item === "priority" ? "My priority" : item}
          </Link>
        ))}
      </div>
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
            <Link
              key={debt.id}
              href={`/debts/${debt.id}` as Route}
              className="border-border bg-card hover:bg-muted focus-visible:ring-ring flex items-center gap-4 rounded-2xl border p-4 focus-visible:ring-2 focus-visible:outline-none"
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
              <p className="font-mono text-sm font-semibold">
                {formatCentavos(Number(debt.current_balance_centavos))}
              </p>
              <ArrowRight className="text-muted-foreground size-4" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
