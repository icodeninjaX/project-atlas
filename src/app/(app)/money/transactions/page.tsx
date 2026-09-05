import Link from "next/link";
import {
  TransactionWorkspace,
  type TransactionHistoryItem,
  type TransactionWorkspaceView,
} from "@/components/money/transaction-workspace";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
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

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/money/transactions">) {
  const query = await searchParams;
  const highlightId =
    typeof query.highlight === "string" ? query.highlight : undefined;
  const supabase = await createClient();
  const [
    accountsResult,
    categoriesResult,
    transactionsResult,
    preferencesResult,
    highlightedTransactionResult,
  ] = supabase
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
        supabase
          .from("user_preferences")
          .select("default_account_id")
          .maybeSingle(),
        highlightId && /^[0-9a-f-]{36}$/i.test(highlightId)
          ? supabase
              .from("transactions")
              .select(
                "id,account_id,category_id,transaction_type,amount_centavos,transaction_date,merchant_or_source,description,financial_accounts(name),transaction_categories(name)",
              )
              .eq("id", highlightId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: null },
        { data: null },
      ];
  const recentTransactions = transactionsResult.data ?? [];
  const transactions = highlightedTransactionResult.data
    ? [
        highlightedTransactionResult.data,
        ...recentTransactions.filter(
          (transaction) =>
            transaction.id !== highlightedTransactionResult.data?.id,
        ),
      ]
    : recentTransactions;
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
  const initialView: TransactionWorkspaceView | null =
    query.create === "true" || query.view === "record"
      ? "record"
      : query.view === "history" || highlightId
        ? "history"
        : null;
  const transactionHistory: TransactionHistoryItem[] = transactions.map(
    (transaction) => {
      const account = transaction.financial_accounts as unknown as {
        name: string;
      } | null;
      const category = transaction.transaction_categories as unknown as {
        name: string;
      } | null;

      return {
        id: transaction.id,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        transaction_type: transaction.transaction_type as "expense" | "income",
        amount_centavos: Number(transaction.amount_centavos),
        transaction_date: transaction.transaction_date,
        merchant_or_source: transaction.merchant_or_source,
        description: transaction.description,
        account_name: account?.name ?? null,
        category_name: category?.name ?? null,
      };
    },
  );

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
              <SensitiveValue>{formatCentavos(income)}</SensitiveValue>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-xs">Expenses this month</p>
            <p className="mt-3 font-mono text-2xl font-semibold">
              <SensitiveValue>{formatCentavos(expenses)}</SensitiveValue>
            </p>
          </CardContent>
        </Card>
      </div>
      <TransactionWorkspace
        accounts={accountsResult.data ?? []}
        categories={categoriesResult.data ?? []}
        transactions={transactionHistory}
        today={todayInManila()}
        defaultAccountId={preferencesResult.data?.default_account_id}
        initialView={initialView}
        highlightId={highlightId ?? null}
      />
    </div>
  );
}
