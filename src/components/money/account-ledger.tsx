"use client";

import { Ellipsis } from "lucide-react";
import { useState } from "react";
import {
  AccountSheet,
  type AccountActivityItem,
  type SheetAccount,
} from "@/components/money/account-sheet";
import { MoneyAmount } from "@/components/money/money-amount";
import { WalletCard, WalletCardBadge } from "@/components/money/wallet-card";
import { formatShare } from "@/lib/money/account-types";

export function AccountLedger({
  accounts,
  today,
  activityByAccount = {},
}: {
  accounts: SheetAccount[];
  today: string;
  activityByAccount?: Record<string, AccountActivityItem[]>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    accounts.find((account) => account.id === selectedId) ?? null;
  const positiveTotal = accounts.reduce(
    (sum, account) =>
      sum + Math.max(0, Number(account.current_balance_centavos)),
    0,
  );
  const shareOf = (account: SheetAccount) => {
    const balance = Number(account.current_balance_centavos);
    return positiveTotal > 0 && balance > 0
      ? formatShare(balance / positiveTotal)
      : null;
  };

  return (
    <section className="mt-10" aria-labelledby="active-accounts-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2
            id="active-accounts-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Your accounts
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            <span className="sm:hidden">Tap a card to manage it.</span>
            <span className="max-sm:hidden">
              Open a card to see its activity, reconcile it, or edit it.
            </span>
          </p>
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          {accounts.length} active
        </p>
      </div>

      {/* Phones stack the cards like a wallet: each shows a strip with its
          name and balance, and the last one shows in full (globals.css). */}
      <ul className="atlas-wallet-stack mt-4 grid grid-cols-1 gap-3 max-sm:gap-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {accounts.map((account) => {
          const share = shareOf(account);
          return (
            <li key={account.id} className="min-w-0">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setSelectedId(account.id)}
                className="group focus-visible:ring-ring focus-visible:ring-offset-background relative block w-full rounded-[1.25rem] text-left transition-transform duration-200 ease-out [-webkit-tap-highlight-color:transparent] hover:-translate-y-0.5 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 active:scale-[0.985] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
              >
                {/* Spaces sit between elements: names are joined without
                    them, whatever the visual layout. */}
                <span className="sr-only">Manage</span>{" "}
                <WalletCard
                  account={account}
                  // globals.css decides which of these a card shows: a
                  // stacked strip needs its balance, a whole card the
                  // manage affordance.
                  corner={
                    <>
                      {/* Repeats the card's own balance, which assistive
                          tech already reads. */}
                      <span
                        aria-hidden="true"
                        className="atlas-wallet-strip-balance shrink-0 pt-0.5 font-mono text-[0.9375rem] leading-5 font-semibold tracking-[-0.02em]"
                      >
                        <MoneyAmount
                          centavos={Number(account.current_balance_centavos)}
                        />
                      </span>
                      <span
                        aria-hidden="true"
                        className="atlas-wallet-more grid size-8 shrink-0 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 transition-colors group-hover:bg-white/22"
                      >
                        <Ellipsis className="size-4" />
                      </span>
                    </>
                  }
                  footer={
                    share ? (
                      <WalletCardBadge>
                        {share} <span className="sr-only">of total</span>
                      </WalletCardBadge>
                    ) : null
                  }
                />
              </button>
            </li>
          );
        })}
      </ul>

      <AccountSheet
        account={selected}
        activity={selected ? (activityByAccount[selected.id] ?? []) : []}
        share={selected ? shareOf(selected) : null}
        today={today}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}
