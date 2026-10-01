import { Archive, WalletCards } from "lucide-react";
import Link from "next/link";
import { AccountCreatePanel } from "@/components/money/account-create-panel";
import { type AccountSummary } from "@/components/money/account-card";
import { AccountLedger } from "@/components/money/account-ledger";
import type { AccountActivityItem } from "@/components/money/account-sheet";
import { AccountsOverview } from "@/components/money/accounts-overview";
import { PageHeading } from "@/components/shared/page-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Accounts" };

const ACTIVITY_PER_ACCOUNT = 5;

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function AccountsPage() {
  const supabase = await createClient();
  const [accountsResult, activityResult] = supabase
    ? await Promise.all([
        supabase
          .from("financial_account_balances")
          .select(
            "id,name,account_type,institution,provider_id,current_balance_centavos,is_archived",
          )
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("transactions")
          .select(
            "id,account_id,transaction_type,amount_centavos,transaction_date,merchant_or_source,transaction_categories(name,icon)",
          )
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(200),
      ])
    : [{ data: [] }, { data: [] }];
  const accounts = (accountsResult.data ?? []) as AccountSummary[];

  const activityByAccount: Record<string, AccountActivityItem[]> = {};
  for (const row of activityResult.data ?? []) {
    const items = (activityByAccount[row.account_id] ??= []);
    if (items.length >= ACTIVITY_PER_ACCOUNT) continue;
    const category = row.transaction_categories as unknown as {
      name: string;
      icon: string | null;
    } | null;
    items.push({
      id: row.id,
      transaction_type: row.transaction_type as "expense" | "income",
      amount_centavos: Number(row.amount_centavos),
      transaction_date: row.transaction_date,
      merchant_or_source: row.merchant_or_source,
      category_name: category?.name ?? null,
      category_icon: category?.icon ?? null,
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Accounts"
        title="Where your money lives"
        description="Every total is opening balance plus recorded movement, so it can always be explained."
        actions={
          <>
            <AccountCreatePanel />
            <Button asChild variant="secondary">
              <Link href="/money/accounts/archived">
                <Archive className="size-4" aria-hidden="true" />
                Archived
              </Link>
            </Button>
          </>
        }
      />
      <MoneyNavigation currentHref="/money/accounts" />
      {accounts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={WalletCards}
            title="Add your first account"
            description="Cash, GCash, Maya, bank, or savings — each starts with one truthful balance. Use Add account above to begin."
          />
        </div>
      ) : (
        <>
          <AccountsOverview accounts={accounts} />
          <AccountLedger
            accounts={accounts}
            today={todayInManila()}
            activityByAccount={activityByAccount}
          />
        </>
      )}
    </div>
  );
}
