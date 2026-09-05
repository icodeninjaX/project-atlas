import { Archive, WalletCards } from "lucide-react";
import Link from "next/link";
import { AccountForm } from "@/components/money/account-form";
import {
  AccountCard,
  type AccountSummary,
} from "@/components/money/account-card";
import { PageHeading } from "@/components/shared/page-heading";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

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
          "id,name,account_type,institution,current_balance_centavos,is_archived",
        )
        .eq("is_archived", false)
        .order("name")
    : { data: [] };
  const accounts = (data ?? []) as AccountSummary[];
  const total = accounts.reduce(
    (sum, account) => sum + Number(account.current_balance_centavos),
    0,
  );

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Accounts"
        title="Where your money lives"
        description="Every total is opening balance plus recorded movement, so it can always be explained."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/money/transactions">Transactions</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/budget">Budget</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/runway">Runway</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/timeline?module=money">Timeline</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/accounts/archived">
                <Archive className="size-4" aria-hidden="true" />
                Archived
              </Link>
            </Button>
          </>
        }
      />
      <div className="border-primary/20 bg-primary/8 mt-8 rounded-2xl border p-5">
        <p className="text-muted-foreground text-xs">
          Total available across active accounts
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold">
          <SensitiveValue>{formatCentavos(total)}</SensitiveValue>
        </p>
      </div>
      <div className="mt-4">
        <AccountForm />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="border-border grid min-h-60 place-items-center rounded-2xl border border-dashed sm:col-span-2 xl:col-span-3">
            <div className="text-center">
              <WalletCards className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                Add your first account.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Cash, GCash, Maya, bank, or savings all start with one truthful
                balance.
              </p>
            </div>
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              today={todayInManila()}
            />
          ))
        )}
      </div>
    </div>
  );
}
