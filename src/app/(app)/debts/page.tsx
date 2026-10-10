import { Landmark } from "lucide-react";
import { DebtsWorkspace } from "@/components/debts/debts-workspace";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { PageHeading } from "@/components/shared/page-heading";
import {
  DEBT_COLUMNS,
  resolveDebtStrategy,
  toDebtRecord,
  type DebtRecord,
} from "@/lib/debts/debt";
import { manilaTodayIsoDate } from "@/lib/dates/dates";
import {
  loadDebtPagePayments,
  loadPaymentAccounts,
} from "@/lib/debts/payments";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Debts" };

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string; highlight?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const today = manilaTodayIsoDate();
  const [debtsResult, preferencesResult, accountsResult] = supabase
    ? await Promise.all([
        supabase.from("debts").select(DEBT_COLUMNS).order("priority"),
        supabase.from("user_preferences").select("debt_strategy").maybeSingle(),
        loadPaymentAccounts(supabase),
      ])
    : [{ data: [] }, { data: null }, []];
  const savedStrategy = resolveDebtStrategy(
    undefined,
    preferencesResult.data?.debt_strategy,
  );
  const debts = ((debtsResult.data ?? []) as DebtRecord[]).map(toDebtRecord);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const payments = supabase
    ? await loadDebtPagePayments(
        supabase,
        debts.map((debt) => debt.id),
        monthStart,
        nextMonth.toISOString().slice(0, 10),
      )
    : [];
  const highlight = query.highlight;

  return (
    <PageShell>
      <PageHeading
        icon={Landmark}
        eyebrow="Money / Debts"
        title="Debt payoff"
        description="What you owe, what it costs each month, and the order that clears it soonest."
        compactOnMobile
      />
      <MoneyNavigation currentHref="/debts" />
      <DebtsWorkspace
        debts={debts}
        payments={payments.map((payment) => ({
          debtId: payment.debt_id,
          amountCentavos: Number(payment.amount_centavos),
          paymentDate: payment.payment_date,
        }))}
        accounts={accountsResult}
        today={today}
        initialStrategy={resolveDebtStrategy(query.strategy, savedStrategy)}
        savedStrategy={savedStrategy}
        highlightId={
          highlight && debts.some((debt) => debt.id === highlight)
            ? highlight
            : null
        }
      />
    </PageShell>
  );
}
