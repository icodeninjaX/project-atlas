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
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Debts" };

/** Enough recent payments for each debt's latest and this month's total. */
const RECENT_PAYMENTS = 400;

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string; highlight?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const [debtsResult, paymentsResult, preferencesResult] = supabase
    ? await Promise.all([
        supabase.from("debts").select(DEBT_COLUMNS).order("priority"),
        supabase
          .from("debt_payments")
          .select("debt_id,amount_centavos,payment_date")
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(RECENT_PAYMENTS),
        supabase.from("user_preferences").select("debt_strategy").maybeSingle(),
      ])
    : [{ data: [] }, { data: [] }, { data: null }];
  const savedStrategy = resolveDebtStrategy(
    undefined,
    preferencesResult.data?.debt_strategy,
  );
  const debts = ((debtsResult.data ?? []) as DebtRecord[]).map(toDebtRecord);
  const highlight = query.highlight;

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Debts"
        title="Debt payoff"
        description="What you owe, what it costs each month, and the order that clears it soonest."
        compactOnMobile
      />
      <MoneyNavigation currentHref="/debts" />
      <DebtsWorkspace
        debts={debts}
        payments={(paymentsResult.data ?? []).map((payment) => ({
          debtId: payment.debt_id,
          amountCentavos: Number(payment.amount_centavos),
          paymentDate: payment.payment_date,
        }))}
        today={manilaTodayIsoDate()}
        initialStrategy={resolveDebtStrategy(query.strategy, savedStrategy)}
        savedStrategy={savedStrategy}
        highlightId={
          highlight && debts.some((debt) => debt.id === highlight)
            ? highlight
            : null
        }
      />
    </div>
  );
}
