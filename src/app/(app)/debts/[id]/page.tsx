import { notFound } from "next/navigation";
import { DebtDetail } from "@/components/debts/debt-detail";
import { DEBT_COLUMNS, toDebtRecord, type DebtRecord } from "@/lib/debts/debt";
import { manilaTodayIsoDate } from "@/lib/dates/dates";
import { loadPaymentAccounts } from "@/lib/debts/payments";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Debt details" };

export default async function DebtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlightPayment?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  if (!supabase) notFound();
  const [{ data: debt }, { data: payments }, accounts] = await Promise.all([
    supabase.from("debts").select(DEBT_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("debt_payments")
      .select("id,amount_centavos,payment_date,notes,transaction_id")
      .eq("debt_id", id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    loadPaymentAccounts(supabase),
  ]);
  if (!debt) notFound();
  // Name the account each logged payment came from, archived ones too.
  const transactionIds = (payments ?? [])
    .map((payment) => payment.transaction_id as string | null)
    .filter((value): value is string => Boolean(value));
  const { data: transactions } = transactionIds.length
    ? await supabase
        .from("transactions")
        .select("id,account_id")
        .in("id", transactionIds)
    : { data: [] };
  const accountIds = [
    ...new Set((transactions ?? []).map((row) => row.account_id as string)),
  ];
  const { data: accountNames } = accountIds.length
    ? await supabase
        .from("financial_accounts")
        .select("id,name")
        .in("id", accountIds)
    : { data: [] };
  const nameById = new Map(
    (accountNames ?? []).map((row) => [row.id as string, row.name as string]),
  );
  const accountByTransaction = new Map(
    (transactions ?? []).map((row) => [
      row.id as string,
      nameById.get(row.account_id as string) ?? null,
    ]),
  );

  return (
    <PageShell>
      <DebtDetail
        debt={toDebtRecord(debt as DebtRecord)}
        payments={(payments ?? []).map((payment) => ({
          id: payment.id,
          payment_date: payment.payment_date,
          notes: payment.notes,
          amount_centavos: Number(payment.amount_centavos),
          account_name: payment.transaction_id
            ? (accountByTransaction.get(payment.transaction_id) ?? null)
            : null,
          logged: Boolean(payment.transaction_id),
        }))}
        accounts={accounts}
        today={manilaTodayIsoDate()}
        highlightPaymentId={query.highlightPayment ?? null}
      />
    </PageShell>
  );
}
