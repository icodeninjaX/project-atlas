import { ArrowLeftRight, ArrowRight } from "lucide-react";
import {
  AccountLogo,
  type AccountIdentity,
} from "@/components/money/account-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { EmptyState } from "@/components/shared/empty-state";
import {
  formatShortDate,
  groupByDate,
  relativeDayLabel,
} from "@/lib/money/history";
import { cn } from "@/lib/utils";

export type TransferHistoryItem = {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount_centavos: number;
  transfer_date: string;
  description: string | null;
};

const unknownAccount: AccountIdentity = {
  name: "Account",
  account_type: "other",
};

/** Transfers by day, each drawn as the pair of accounts it moved between. */
export function TransferHistory({
  transfers,
  accounts,
  today,
  highlightId,
}: {
  transfers: TransferHistoryItem[];
  accounts: ReadonlyMap<string, AccountIdentity>;
  today: string;
  highlightId?: string;
}) {
  if (transfers.length === 0) {
    return (
      <div className="mt-3">
        <EmptyState
          icon={ArrowLeftRight}
          title="No transfers yet"
          description="Transfers between your own accounts will show here."
        />
      </div>
    );
  }

  return (
    <div className="border-border bg-card divide-border mt-3 divide-y overflow-hidden rounded-2xl border">
      {groupByDate(transfers, (transfer) => transfer.transfer_date).map(
        (group) => {
          const label = relativeDayLabel(group.date, today);
          return (
            <section key={group.date} aria-label={label}>
              <h3 className="bg-muted/30 px-4 py-2 text-[0.8125rem] font-semibold sm:px-5">
                {label}
                {label === "Today" || label === "Yesterday" ? (
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    {formatShortDate(group.date)}
                  </span>
                ) : null}
              </h3>
              <ul className="divide-border border-border divide-y border-t">
                {group.items.map((transfer) => {
                  const source =
                    accounts.get(transfer.source_account_id) ?? unknownAccount;
                  const destination =
                    accounts.get(transfer.destination_account_id) ??
                    unknownAccount;
                  return (
                    <li
                      key={transfer.id}
                      id={`transfer-${transfer.id}`}
                      className={cn(
                        "flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5",
                        highlightId === transfer.id && "bg-primary/[0.08]",
                      )}
                    >
                      <span aria-hidden="true" className="flex shrink-0">
                        <AccountLogo
                          account={source}
                          className="ring-card ring-2"
                        />
                        <AccountLogo
                          account={destination}
                          className="ring-card -ml-2.5 ring-2"
                        />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="min-w-[min(100%,9rem)] flex-1">
                          <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                            <span className="truncate">{source.name}</span>
                            <ArrowRight
                              className="text-muted-foreground size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="sr-only">to</span>
                            <span className="truncate">{destination.name}</span>
                          </p>
                          {transfer.description ? (
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                              {transfer.description}
                            </p>
                          ) : null}
                        </div>
                        <p className="ml-auto font-mono text-sm font-semibold whitespace-nowrap">
                          <MoneyAmount
                            centavos={Number(transfer.amount_centavos)}
                          />
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        },
      )}
    </div>
  );
}
