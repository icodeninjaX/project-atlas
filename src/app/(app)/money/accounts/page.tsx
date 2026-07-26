import { Archive, ArchiveRestore, WalletCards } from "lucide-react";
import Link from "next/link";
import { AccountForm } from "@/components/money/account-form";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { archiveAccountAction } from "@/lib/money/actions";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("financial_account_balances")
        .select(
          "id,name,account_type,institution,current_balance_centavos,is_archived",
        )
        .order("is_archived")
        .order("name")
    : { data: [] };
  const accounts = data ?? [];
  const total = accounts
    .filter((account) => !account.is_archived)
    .reduce(
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
          </>
        }
      />
      <div className="border-primary/20 bg-primary/8 mt-8 rounded-2xl border p-5">
        <p className="text-muted-foreground text-xs">
          Total available across active accounts
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold">
          {formatCentavos(total)}
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
            <Card
              key={account.id}
              className={account.is_archived ? "opacity-60" : ""}
            >
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{account.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs capitalize">
                      {String(account.account_type).replaceAll("_", " ")}
                      {account.institution ? ` · ${account.institution}` : ""}
                    </p>
                  </div>
                  <form action={archiveAccountAction}>
                    <input type="hidden" name="accountId" value={account.id} />
                    <input
                      type="hidden"
                      name="archived"
                      value={account.is_archived ? "false" : "true"}
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label={`${account.is_archived ? "Restore" : "Archive"} ${account.name}`}
                    >
                      {account.is_archived ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </Button>
                  </form>
                </div>
                <details className="border-border mt-4 border-t pt-3">
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium">
                    Edit account details
                  </summary>
                  <div className="mt-3">
                    <AccountForm account={account} />
                  </div>
                </details>
                <p className="mt-6 font-mono text-2xl font-semibold">
                  {formatCentavos(Number(account.current_balance_centavos))}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {account.is_archived ? "Archived" : "Current derived balance"}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
