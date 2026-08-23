import { Archive, WalletCards } from "lucide-react";
import Link from "next/link";
import {
  AccountCard,
  type AccountSummary,
} from "@/components/money/account-card";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Archived accounts" };

export default async function ArchivedAccountsPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("financial_account_balances")
        .select(
          "id,name,account_type,institution,current_balance_centavos,is_archived",
        )
        .eq("is_archived", true)
        .order("name")
    : { data: [] };
  const accounts = (data ?? []) as AccountSummary[];

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Accounts / Archived"
        title="Archived accounts"
        description="Accounts stored outside your active totals. Restore one whenever you need to use it again."
        actions={
          <Button asChild>
            <Link href="/money/accounts">
              <WalletCards className="size-4" aria-hidden="true" />
              Active accounts
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="border-border grid min-h-60 place-items-center rounded-2xl border border-dashed sm:col-span-2 xl:col-span-3">
            <div className="text-center">
              <Archive className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No archived accounts.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Accounts you archive will be kept here without affecting your
                active total.
              </p>
            </div>
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))
        )}
      </div>
    </div>
  );
}
