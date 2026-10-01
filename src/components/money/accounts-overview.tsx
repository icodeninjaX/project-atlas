import { ArrowLeftRight, Plus } from "lucide-react";
import Link from "next/link";
import { MoneyAmount } from "@/components/money/money-amount";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import {
  allocateBalances,
  formatShare,
  type AllocationBucketId,
} from "@/lib/money/account-types";

/** Fixed per bucket so a color always means the same kind of money. */
const BUCKET_COLORS: Record<AllocationBucketId, string> = {
  everyday: "var(--money-series-1)",
  invested: "var(--money-series-2)",
  savings: "var(--money-series-3)",
  other: "var(--money-series-other)",
};

function AllocationBar({
  accounts,
}: {
  accounts: ReadonlyArray<{
    account_type: string;
    current_balance_centavos: number;
  }>;
}) {
  const allocation = allocateBalances(accounts);
  if (allocation.slices.length === 0) return null;

  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs font-medium">
        How it is split
      </p>
      {/* The legend below carries every value as text; the bar is the
          at-a-glance view, so assistive tech reads the list instead. */}
      <div aria-hidden="true" className="mt-3 flex h-2.5 w-full gap-0.5">
        {allocation.slices.map((slice) => (
          <TooltipHint
            key={slice.id}
            label={
              <>
                {slice.label} · {formatShare(slice.share)} ·{" "}
                <MoneyAmount centavos={slice.centavos} />
              </>
            }
          >
            <span
              className="block h-full min-w-1.5 first:rounded-l-full last:rounded-r-full"
              // Grow from a zero basis so the 2px gaps come out of the
              // free space and the slices stay proportional.
              style={{
                flex: `${slice.share} 1 0%`,
                background: BUCKET_COLORS[slice.id],
              }}
            />
          </TooltipHint>
        ))}
      </div>
      {/* Phones read the legend as rows; wider screens as columns. */}
      <ul className="mt-4 grid gap-x-4 gap-y-2.5 sm:grid-cols-3 sm:gap-y-3 lg:grid-cols-2 xl:grid-cols-3">
        {allocation.slices.map((slice) => (
          <li key={slice.id} className="flex min-w-0 items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2.5 shrink-0 rounded-full"
              style={{ background: BUCKET_COLORS[slice.id] }}
            />
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 sm:block">
              <span className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-semibold">
                {slice.label}
                <span className="text-muted-foreground font-mono text-xs font-medium">
                  {formatShare(slice.share)}
                </span>
              </span>
              <span className="block font-mono text-sm [overflow-wrap:anywhere]">
                <MoneyAmount centavos={slice.centavos} />
              </span>
              <span className="text-muted-foreground hidden text-xs sm:block">
                {slice.accountCount === 1
                  ? "1 account"
                  : `${slice.accountCount} accounts`}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {allocation.negativeCentavos < 0 ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Shares leave out{" "}
          <MoneyAmount
            centavos={allocation.negativeCentavos}
            className="font-mono"
          />{" "}
          in overdrawn accounts, which still count in the total.
        </p>
      ) : null}
    </div>
  );
}

/** The accounts page lead: one total, how it is split, and the next moves. */
export function AccountsOverview({
  accounts,
}: {
  accounts: ReadonlyArray<{
    account_type: string;
    current_balance_centavos: number;
  }>;
}) {
  const total = accounts.reduce(
    (sum, account) => sum + Number(account.current_balance_centavos),
    0,
  );

  return (
    <section
      aria-labelledby="accounts-total"
      className="border-primary/20 bg-card relative mt-8 overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.12)]"
    >
      <div
        aria-hidden="true"
        className="from-primary/12 pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b to-transparent"
      />
      <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <h2
            id="accounts-total"
            className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
          >
            Total balance
          </h2>
          <p className="mt-3 min-w-0 font-mono text-[clamp(2.375rem,11vw,3.5rem)] leading-none font-semibold tracking-[-0.045em] [overflow-wrap:anywhere]">
            <MoneyAmount centavos={total} quietCentavos />
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Across{" "}
            {accounts.length === 1
              ? "1 active account"
              : `${accounts.length} active accounts`}
            . Opening balances plus every recorded movement.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 [&>*]:grow [&>*]:whitespace-nowrap sm:[&>*]:grow-0">
            <Button asChild>
              <Link href="/money/transactions?create=true">
                <Plus className="size-4" aria-hidden="true" />
                Record transaction
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/money/transfers">
                <ArrowLeftRight className="size-4" aria-hidden="true" />
                Transfer
              </Link>
            </Button>
          </div>
        </div>
        <AllocationBar accounts={accounts} />
      </div>
    </section>
  );
}
