import { notFound } from "next/navigation";
import { DebtDetail } from "@/components/debts/debt-detail";
import { DEBT_COLUMNS, toDebtRecord, type DebtRecord } from "@/lib/debts/debt";
import { manilaTodayIsoDate } from "@/lib/dates/dates";
import { createClient } from "@/lib/supabase/server";

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
  const [{ data: debt }, { data: payments }] = await Promise.all([
    supabase.from("debts").select(DEBT_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("debt_payments")
      .select("id,amount_centavos,payment_date,notes")
      .eq("debt_id", id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!debt) notFound();

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <DebtDetail
        debt={toDebtRecord(debt as DebtRecord)}
        payments={(payments ?? []).map((payment) => ({
          ...payment,
          amount_centavos: Number(payment.amount_centavos),
        }))}
        today={manilaTodayIsoDate()}
        highlightPaymentId={query.highlightPayment ?? null}
      />
    </div>
  );
}
