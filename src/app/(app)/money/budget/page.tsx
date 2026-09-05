import Link from "next/link";
import { BudgetForm } from "@/components/money/budget-form";
import { PageHeading } from "@/components/shared/page-heading";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveCalendarMonth } from "@/lib/dates/dates";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Budget" };

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const requested = (await searchParams).month;
  const month = resolveCalendarMonth(requested, currentMonth());
  const monthStart = `${month}-01`;
  const nextMonthDate = new Date(`${monthStart}T00:00:00Z`);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const nextMonth = nextMonthDate.toISOString().slice(0, 10);
  const supabase = await createClient();
  const [categoriesResult, budgetResult, transactionsResult] = supabase
    ? await Promise.all([
        supabase
          .from("transaction_categories")
          .select("id,name")
          .eq("category_type", "expense")
          .order("name"),
        supabase
          .from("monthly_budgets")
          .select("id,expected_income_centavos,notes")
          .eq("month_start", monthStart)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("category_id,amount_centavos")
          .eq("transaction_type", "expense")
          .gte("transaction_date", monthStart)
          .lt("transaction_date", nextMonth),
      ])
    : [{ data: [] }, { data: null }, { data: [] }];
  const budget = budgetResult.data;
  const { data: itemData } =
    budget && supabase
      ? await supabase
          .from("budget_items")
          .select("category_id,planned_centavos")
          .eq("monthly_budget_id", budget.id)
      : { data: [] };
  const planned: Record<string, number> = Object.fromEntries(
    (itemData ?? []).map((item) => [
      item.category_id,
      Number(item.planned_centavos),
    ]),
  );
  const actual = (transactionsResult.data ?? []).reduce<Record<string, number>>(
    (map, row) => {
      map[row.category_id] =
        (map[row.category_id] ?? 0) + Number(row.amount_centavos);
      return map;
    },
    {},
  );
  const plannedTotal = Object.values(planned).reduce(
    (sum, value) => sum + value,
    0,
  );
  const actualTotal = Object.values(actual).reduce(
    (sum, value) => sum + value,
    0,
  );
  const categories = categoriesResult.data ?? [];

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow={`Money / Budget / ${month}`}
        title="Monthly plan"
        description="Planned and actual pesos remain visible together. Overspending is always named in text."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/money/transactions">Transactions</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/runway">Runway</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/timeline?module=money">Timeline</Link>
            </Button>
          </>
        }
      />
      <MoneyNavigation currentHref="/money/budget" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Planned expenses</p>
            <p className="mt-3 font-mono text-2xl font-semibold">
              <SensitiveValue>{formatCentavos(plannedTotal)}</SensitiveValue>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Actual expenses</p>
            <p className="mt-3 font-mono text-2xl font-semibold">
              <SensitiveValue>{formatCentavos(actualTotal)}</SensitiveValue>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Remaining</p>
            <p
              className={`mt-3 font-mono text-2xl font-semibold ${plannedTotal - actualTotal < 0 ? "text-destructive" : "text-primary"}`}
            >
              <SensitiveValue>
                {formatCentavos(plannedTotal - actualTotal)}
              </SensitiveValue>
            </p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {plannedTotal - actualTotal < 0
                ? "Over budget"
                : "Available in plan"}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent>
          <BudgetForm
            monthStart={monthStart}
            expectedIncomeCentavos={Number(
              budget?.expected_income_centavos ?? 0,
            )}
            categories={categories}
            planned={planned}
          />
        </CardContent>
      </Card>
      {itemData && itemData.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Planned versus actual</h2>
          <div className="border-border bg-card mt-3 overflow-hidden rounded-2xl border">
            {categories
              .filter((category) => planned[category.id] != null)
              .map((category) => {
                const plan = planned[category.id] ?? 0;
                const spent = actual[category.id] ?? 0;
                const over = spent > plan;
                return (
                  <div
                    key={category.id}
                    className="border-border grid gap-2 border-b p-4 last:border-0 sm:grid-cols-[1fr_160px_160px]"
                  >
                    <p className="text-sm font-semibold">{category.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      Plan{" "}
                      <SensitiveValue>{formatCentavos(plan)}</SensitiveValue>
                    </p>
                    <p
                      className={`font-mono text-xs ${over ? "text-destructive font-semibold" : ""}`}
                    >
                      Actual{" "}
                      <SensitiveValue>{formatCentavos(spent)}</SensitiveValue>
                      {over ? " · over" : ""}
                    </p>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
