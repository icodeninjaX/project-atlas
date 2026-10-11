import type { AccountIdentity } from "@/components/money/account-visuals";
import { TransferForm } from "@/components/money/transfer-form";
import { TransferHistory } from "@/components/money/transfer-history";
import { PageHeading } from "@/components/shared/page-heading";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Transfers" };

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
        eyebrow="Money / Transfers"
        title="Transfers"
        description="Money moved between your own accounts, kept out of income and expenses."
        compactOnMobile
      />
      <MoneyNavigation currentHref="/money/transfers" />

      <div className="mt-8 max-w-3xl">
        <TransferForm accounts={activeAccounts} today={today} />
        <p className="text-muted-foreground mt-3 px-1 text-xs leading-5">
          Your combined balance stays the same: the amount leaves one active
          account and enters another.
        </p>
      </div>

      <section className="mt-10" aria-labelledby="transfer-history-title">
        <h2
          id="transfer-history-title"
          className="text-[0.9375rem] font-semibold"
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
