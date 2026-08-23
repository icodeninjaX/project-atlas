import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentForm } from "@/components/debts/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { projectDebtPayoff } from "@/lib/debts/debt";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const [{ data: debt }, { data: payments }] = await Promise.all([
    supabase.from("debts").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("debt_payments")
      .select("id,amount_centavos,payment_date,notes,created_at")
      .eq("debt_id", id)
      .order("payment_date", { ascending: false }),
  ]);
  if (!debt) notFound();

  const projection = projectDebtPayoff({
    balanceCentavos: Number(debt.current_balance_centavos),
    annualInterestRatePercent: Number(debt.interest_rate_percent),
    monthlyPaymentCentavos: Number(debt.minimum_payment_centavos),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/debts"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        All debts
      </Link>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary font-mono text-[11px] tracking-wider uppercase">
            {String(debt.debt_type).replaceAll("_", " ")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {debt.creditor_name}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {debt.status} · {Number(debt.interest_rate_percent)}% annual
            interest
          </p>
        </div>
        <p className="font-mono text-4xl font-semibold">
          {formatCentavos(Number(debt.current_balance_centavos))}
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Original balance</p>
            <p className="mt-3 font-mono text-xl font-semibold">
              {formatCentavos(Number(debt.original_balance_centavos))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Minimum payment</p>
            <p className="mt-3 font-mono text-xl font-semibold">
              {formatCentavos(Number(debt.minimum_payment_centavos))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Estimated payoff</p>
            <p className="mt-3 font-mono text-xl font-semibold">
              {projection.paidOff
                ? `${projection.months} months`
                : "Payment too low"}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="border-border bg-muted/35 text-muted-foreground mt-4 rounded-2xl border p-4 text-xs leading-5">
        Projection assumes no additional borrowing, an unchanged interest rate,
        monthly compounding, and the entered minimum payment every month.
        Estimated interest: {formatCentavos(projection.totalInterestCentavos)}.
      </div>
      {debt.status !== "paid" && (
        <div className="mt-6">
          <PaymentForm debtId={debt.id} today={todayInManila()} />
        </div>
      )}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Payment history</h2>
        <div className="border-border bg-card mt-3 overflow-hidden rounded-2xl border">
          {(payments ?? []).length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">
              No payments recorded yet.
            </p>
          ) : (
            (payments ?? []).map((payment) => (
              <div
                key={payment.id}
                className="border-border flex items-center gap-4 border-b p-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">
                    {formatCentavos(Number(payment.amount_centavos))}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {payment.payment_date}
                    {payment.notes ? ` · ${payment.notes}` : ""}
                  </p>
                </div>
                <OfflineMutationForm mutation="debtPayment.delete">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <input type="hidden" name="debtId" value={debt.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="submit"
                    aria-label="Delete payment"
                  >
                    <Trash2 className="text-muted-foreground size-4" />
                  </Button>
                </OfflineMutationForm>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
