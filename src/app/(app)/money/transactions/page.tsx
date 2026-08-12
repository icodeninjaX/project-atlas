import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import Link from "next/link";
import { TransactionForm } from "@/components/money/transaction-form";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteTransactionAction } from "@/lib/money/actions";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Transactions" };

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [accountsResult, categoriesResult, transactionsResult] = supabase
    ? await Promise.all([
        supabase
          .from("financial_accounts")
          .select("id,name")
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("transaction_categories")
          .select("id,name,category_type")
          .order("name"),
        supabase
          .from("transactions")
          .select(
            "id,account_id,category_id,transaction_type,amount_centavos,transaction_date,merchant_or_source,description,financial_accounts(name),transaction_categories(name)",
          )
          .order("transaction_date", { ascending: false })
          .limit(100),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const transactions = transactionsResult.data ?? [];
  const monthPrefix = todayInManila().slice(0, 7);
  const monthRows = transactions.filter((transaction) =>
    String(transaction.transaction_date).startsWith(monthPrefix),
  );
  const income = monthRows
    .filter((transaction) => transaction.transaction_type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount_centavos), 0);
  const expenses = monthRows
    .filter((transaction) => transaction.transaction_type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount_centavos), 0);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Transactions"
        title="Money movement"
        description="Income and expenses change balances. Transfers stay separate and never inflate either total."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/money/accounts">Accounts</Link>
            </Button>
            <Button asChild>
              <Link href="/money/transfers">Record transfer</Link>
            </Button>
          </>
        }
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Income this month</p>
            <p className="text-primary mt-3 font-mono text-2xl font-semibold">
              {formatCentavos(income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Expenses this month</p>
            <p className="mt-3 font-mono text-2xl font-semibold">
              {formatCentavos(expenses)}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <TransactionForm
          accounts={accountsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          today={todayInManila()}
        />
      </div>
      <div className="border-border bg-card mt-6 overflow-hidden rounded-2xl border">
        {transactions.length === 0 ? (
          <div className="grid min-h-60 place-items-center text-center">
            <div>
              <ReceiptText className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No money movement recorded.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Add an account, then record the first income or expense.
              </p>
            </div>
          </div>
        ) : (
          transactions.map((transaction) => {
            const account = transaction.financial_accounts as unknown as {
              name: string;
            } | null;
            const category = transaction.transaction_categories as unknown as {
              name: string;
            } | null;
            return (
              <div
                key={transaction.id}
                className="border-border flex items-center gap-4 border-b p-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {transaction.merchant_or_source ||
                      category?.name ||
                      "Transaction"}
                  </p>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {transaction.transaction_date} ·{" "}
                    {account?.name ?? "Account"} ·{" "}
                    {category?.name ?? "Category"}
                  </p>
                </div>
                <p
                  className={`font-mono text-sm font-semibold ${transaction.transaction_type === "income" ? "text-primary" : ""}`}
                >
                  {transaction.transaction_type === "income" ? "+" : "−"}
                  {formatCentavos(Number(transaction.amount_centavos))}
                </p>
                <details className="relative">
                  <summary className="text-muted-foreground hover:bg-muted grid size-10 cursor-pointer list-none place-items-center rounded-xl [&::-webkit-details-marker]:hidden">
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit transaction</span>
                  </summary>
                  <div className="border-border bg-card absolute right-0 z-10 mt-2 w-[min(90vw,720px)] rounded-2xl border p-3 shadow-xl">
                    <TransactionForm
                      accounts={accountsResult.data ?? []}
                      categories={categoriesResult.data ?? []}
                      today={todayInManila()}
                      transaction={transaction}
                    />
                  </div>
                </details>
                <form action={deleteTransactionAction}>
                  <input
                    type="hidden"
                    name="transactionId"
                    value={transaction.id}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="text-muted-foreground size-4" />
                  </Button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
