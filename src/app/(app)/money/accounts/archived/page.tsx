import { Archive, WalletCards } from "lucide-react";
import Link from "next/link";
import {
  AccountCard,
  type AccountSummary,
} from "@/components/money/account-card";
import { PageHeading } from "@/components/shared/page-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Archived accounts" };

export default async function ArchivedAccountsPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("financial_account_balances")
        .select(
          "id,name,account_type,institution,provider_id,current_balance_centavos,is_archived",
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

      {accounts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Archive}
            title="No archived accounts"
            description="Accounts you archive are kept here without affecting your active total."
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <li key={account.id} className="min-w-0">
              <AccountCard account={account} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
