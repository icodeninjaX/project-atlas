import {
  TransactionWorkspace,
  type TransactionHistoryItem,
  type TransactionWorkspaceView,
} from "@/components/money/transaction-workspace";
import { TransactionSummary } from "@/components/money/transaction-summary";
import { PageHeading } from "@/components/shared/page-heading";
import { MoneyNavigation } from "@/components/money/money-navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Transactions" };

const HISTORY_LIMIT = 100;
const TRANSACTION_COLUMNS =
  "id,account_id,category_id,transaction_type,amount_centavos,transaction_date,merchant_or_source,description,financial_accounts(name),transaction_categories(name,icon)";

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthName(today: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "long",
  }).format(new Date(`${today}T00:00:00Z`));
}

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/money/transactions">) {
  const query = await searchParams;
  const highlightId =
    typeof query.highlight === "string" ? query.highlight : undefined;
  const accountFilter =
    typeof query.account === "string" && UUID_PATTERN.test(query.account)
      ? query.account
      : null;
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
          .from("financial_account_balances")
          .select("id,name,account_type,provider_id,current_balance_centavos")
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("transaction_categories")
          .select("id,name,category_type,icon")
          .order("name"),
        supabase
          .from("transactions")
          .select(TRANSACTION_COLUMNS)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(HISTORY_LIMIT),
        supabase
          .from("user_preferences")
          .select("default_account_id")
          .maybeSingle(),
        highlightId && UUID_PATTERN.test(highlightId)
          ? supabase
              .from("transactions")
              .select(TRANSACTION_COLUMNS)
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
  const today = todayInManila();
  const monthPrefix = today.slice(0, 7);
  const monthRows = transactions.filter((transaction) =>
    String(transaction.transaction_date).startsWith(monthPrefix),
  );
  const income = monthRows
    .filter((transaction) => transaction.transaction_type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount_centavos), 0);
  const expenses = monthRows
    .filter((transaction) => transaction.transaction_type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount_centavos), 0);
  const initialView: TransactionWorkspaceView =
    query.create === "true" || query.view === "record" ? "record" : "history";
  const transactionHistory: TransactionHistoryItem[] = transactions.map(
    (transaction) => {
      const account = transaction.financial_accounts as unknown as {
        name: string;
      } | null;
      const category = transaction.transaction_categories as unknown as {
        name: string;
        icon: string | null;
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
        category_icon: category?.icon ?? null,
      };
    },
  );
  const accounts = (accountsResult.data ?? []).flatMap((account) =>
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
          },
        ]
      : [],
  );

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Money / Transactions"
        title="Money movement"
        description="Income and expenses change balances. Transfers stay separate and never inflate either total."
      />
      <MoneyNavigation currentHref="/money/transactions" />
      <TransactionWorkspace
        accounts={accounts}
        categories={categoriesResult.data ?? []}
        transactions={transactionHistory}
        today={today}
        defaultAccountId={preferencesResult.data?.default_account_id}
        initialView={initialView}
        highlightId={highlightId ?? null}
        initialAccountFilter={accountFilter}
        historyLimit={HISTORY_LIMIT}
        summary={
          <TransactionSummary
            monthLabel={monthName(today)}
            income={income}
            expenses={expenses}
            entryCount={monthRows.length}
          />
        }
      />
    </div>
  );
}
