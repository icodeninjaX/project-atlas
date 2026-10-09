import { ArrowLeftRight, Scale, WalletCards } from "lucide-react";
import type { AccountIdentity } from "@/components/money/account-visuals";
import { TransferForm } from "@/components/money/transfer-form";
import { TransferHistory } from "@/components/money/transfer-history";
import { PageHeading } from "@/components/shared/page-heading";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Record transfer" };

const TRANSFER_COLUMNS =
  "id,source_account_id,destination_account_id,amount_centavos,transfer_date,description";

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
        // Archived accounts are still named in history, but only active
        // ones can send or receive a new transfer.
        supabase
          .from("financial_account_balances")
          .select(
            "id,name,account_type,provider_id,current_balance_centavos,is_archived",
          )
          .order("name"),
        supabase
          .from("account_transfers")
          .select(TRANSFER_COLUMNS)
          .order("transfer_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100),
        query.highlight && /^[0-9a-f-]{36}$/i.test(query.highlight)
          ? supabase
              .from("account_transfers")
              .select(TRANSFER_COLUMNS)
              .eq("id", query.highlight)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
    : [{ data: [] }, { data: [] }, { data: null }];
  const allAccounts = (accountsResult.data ?? []).flatMap((account) =>
    account.id && account.name
      ? [
          {
            id: account.id,
            name: account.name,
            account_type: account.account_type ?? "other",
            provider_id: account.provider_id,
            current_balance_centavos: Number(
              account.current_balance_centavos ?? 0,
            ),
            is_archived: Boolean(account.is_archived),
          },
        ]
      : [],
  );
  const activeAccounts = allAccounts.filter((account) => !account.is_archived);
  const accountsById = new Map<string, AccountIdentity>(
    allAccounts.map((account) => [account.id, account]),
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
  const today = todayInManila();

  return (
    <PageShell>
      <PageHeading
        icon={WalletCards}
        eyebrow="Money / Transfers"
        title="Move money between accounts"
        description="Record an internal transfer without counting it as income or an expense."
        compactOnMobile
      />
      <MoneyNavigation currentHref="/money/transfers" />

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <TransferForm accounts={activeAccounts} today={today} />

        <aside className="border-border bg-card/60 rounded-[1.5rem] border p-5">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
            <Scale className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold">
            Transfers stay balance-neutral
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            The amount leaves the source account and enters the destination
            account. Your combined balance does not change, and neither income
            nor expenses move.
          </p>
          <p className="text-muted-foreground border-border mt-4 flex gap-2 border-t pt-4 text-xs leading-5">
            <ArrowLeftRight
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            Both accounts must be active, and the source and destination must be
            different.
          </p>
        </aside>
      </div>

      <section className="mt-10" aria-labelledby="transfer-history-title">
        <h2
          id="transfer-history-title"
          className="text-lg font-semibold tracking-tight"
        >
          Transfer history
        </h2>
        <TransferHistory
          transfers={transfers}
          accounts={accountsById}
          today={today}
          highlightId={query.highlight}
        />
      </section>
    </PageShell>
  );
}
