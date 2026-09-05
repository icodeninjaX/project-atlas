import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { TransferForm } from "@/components/money/transfer-form";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { PageHeading } from "@/components/shared/page-heading";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos } from "@/lib/money/money";

export const metadata = { title: "Record transfer" };

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const [accountsResult, transfersResult, highlightedResult] = supabase
    ? await Promise.all([
        supabase
          .from("financial_accounts")
          .select("id,name")
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("account_transfers")
          .select(
            "id,source_account_id,destination_account_id,amount_centavos,transfer_date,description",
          )
          .order("transfer_date", { ascending: false })
          .limit(100),
        query.highlight && /^[0-9a-f-]{36}$/i.test(query.highlight)
          ? supabase
              .from("account_transfers")
              .select(
                "id,source_account_id,destination_account_id,amount_centavos,transfer_date,description",
              )
              .eq("id", query.highlight)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
    : [{ data: [] }, { data: [] }, { data: null }];
  const accountName = new Map(
    (accountsResult.data ?? []).map((account) => [account.id, account.name]),
  );
  const recentTransfers = transfersResult.data ?? [];
  const transfers = highlightedResult.data
    ? [
        highlightedResult.data,
        ...recentTransfers.filter(
          (transfer) => transfer.id !== highlightedResult.data?.id,
        ),
      ]
    : recentTransfers;

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Money movement / Transfer"
        title="Move money between accounts"
        description="Record an internal transfer without counting it as income or an expense."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/money/transactions">Money movement</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/accounts">Accounts</Link>
            </Button>
          </>
        }
      />
      <MoneyNavigation currentHref="/money/transfers" />

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TransferForm
          accounts={accountsResult.data ?? []}
          today={todayInManila()}
        />

        <Card>
          <CardContent>
            <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <ArrowLeftRight className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              Transfers stay balance-neutral
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              The amount leaves the source account and enters the destination
              account. Your combined balance does not change.
            </p>
            <p className="text-muted-foreground border-border mt-4 border-t pt-4 text-xs leading-5">
              Both accounts must be active, and the source and destination must
              be different.
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Transfer history</h2>
        <div className="border-border bg-card mt-3 overflow-hidden rounded-2xl border">
          {transfers.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">
              No transfers recorded yet.
            </p>
          ) : (
            transfers.map((transfer) => (
              <article
                key={transfer.id}
                id={`transfer-${transfer.id}`}
                className={`border-border flex min-w-0 flex-col gap-2 border-b p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between ${
                  query.highlight === transfer.id ? "bg-primary/[0.08]" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold break-words">
                    {accountName.get(transfer.source_account_id) ?? "Account"} →{" "}
                    {accountName.get(transfer.destination_account_id) ??
                      "Account"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {transfer.transfer_date}
                    {transfer.description ? ` · ${transfer.description}` : ""}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold">
                  <SensitiveValue>
                    {formatCentavos(Number(transfer.amount_centavos))}
                  </SensitiveValue>
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
