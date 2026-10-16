import { Archive, WalletCards } from "lucide-react";
import Link from "next/link";
import { AccountCreatePanel } from "@/components/money/account-create-panel";
import { type AccountSummary } from "@/components/money/account-card";
import { AccountLedger } from "@/components/money/account-ledger";
import {
  ACCOUNT_ACTIVITY_LIMIT,
  type AccountActivityItem,
} from "@/components/money/account-sheet";
import { AccountsOverview } from "@/components/money/accounts-overview";
import { AccountsQuickActions } from "@/components/money/accounts-quick-actions";
import { PageHeading } from "@/components/shared/page-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Accounts" };

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
  const { data } = supabase
    ? await supabase
        .from("financial_account_balances")
        .select(
          "id,name,account_type,institution,provider_id,current_balance_centavos,is_archived",
        )
        .eq("is_archived", false)
        .order("name")
    : { data: [] };
  const accounts = (data ?? []) as AccountSummary[];

  // One query per account: a shared row cap would let busy accounts crowd
  // quieter ones out of their own history. The extra row tells the sheet
  // whether older transactions exist beyond what it shows.
  const [activityResults, categoriesResult, preferencesResult] = supabase
    ? await Promise.all([
        Promise.all(
          accounts.map((account) =>
            supabase
              .from("transactions")
              .select(
                "id,account_id,category_id,transaction_type,amount_centavos,transaction_date,transaction_time,merchant_or_source,description,transaction_categories(name,icon)",
              )
              .eq("account_id", account.id)
              .order("transaction_date", { ascending: false })
              .order("transaction_time", {
                ascending: false,
                nullsFirst: false,
              })
              .order("created_at", { ascending: false })
              .limit(ACCOUNT_ACTIVITY_LIMIT + 1),
          ),
        ),
        // The sheet's rows open the transaction editor, which needs these.
        supabase
          .from("transaction_categories")
          .select("id,name,category_type,icon")
          .order("name"),
        supabase
          .from("user_preferences")
          .select("default_account_id")
          .maybeSingle(),
      ])
    : [[], { data: [] }, { data: null }];
  const activityByAccount: Record<string, AccountActivityItem[]> =
    Object.fromEntries(
      accounts.map((account, index) => [
        account.id,
        (activityResults[index]?.data ?? []).map((row) => {
          const category = row.transaction_categories as unknown as {
            name: string;
            icon: string | null;
          } | null;
          return {
            id: row.id,
            account_id: row.account_id,
            category_id: row.category_id,
            transaction_type: row.transaction_type as "expense" | "income",
            amount_centavos: Number(row.amount_centavos),
            transaction_date: row.transaction_date,
            transaction_time: row.transaction_time,
            merchant_or_source: row.merchant_or_source,
            description: row.description,
            account_name: account.name,
            category_name: category?.name ?? null,
            category_icon: category?.icon ?? null,
          };
        }),
      ]),
    );

  return (
    <PageShell>
      <PageHeading
        eyebrow="Money / Accounts"
        title="Where your money lives"
        description="Every total is opening balance plus recorded movement, so it can always be explained."
        // Phones get these actions in the total-balance hero instead; with
        // no accounts there is no hero, so the heading keeps them.
        compactOnMobile={accounts.length > 0}
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
            description="Cash, GCash, Maya, bank, or savings. Each starts with one truthful balance. Use Add account above to begin."
          />
        </div>
      ) : (
        <>
          <AccountsOverview
            accounts={accounts}
            mobileActions={<AccountsQuickActions />}
          />
          <AccountLedger
            accounts={accounts}
            today={todayInManila()}
            activityByAccount={activityByAccount}
            categories={categoriesResult.data ?? []}
            defaultAccountId={preferencesResult.data?.default_account_id}
          />
        </>
      )}
    </PageShell>
  );
}
