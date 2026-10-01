import type { ReactNode } from "react";
import {
  AccountLogo,
  AccountTypeIcon,
  walletStyle,
  type AccountIdentity,
} from "@/components/money/account-visuals";
import { MoneyAmount } from "@/components/money/money-amount";
import { accountTypeDetails } from "@/lib/money/account-types";
import { cn } from "@/lib/utils";

export type WalletCardAccount = AccountIdentity & {
  institution: string | null;
  current_balance_centavos: number;
};

/**
 * An account presented as a physical card in its provider's colors. Purely
 * presentational, and built from phrasing elements so it can sit inside a
 * button that makes it interactive.
 */
export function WalletCard({
  account,
  balanceLabel = "Balance",
  size = "default",
  muted = false,
  corner,
  footer,
  className,
}: {
  account: WalletCardAccount;
  balanceLabel?: string;
  size?: "default" | "large";
  muted?: boolean;
  /** Top-right slot, e.g. a manage affordance. */
  corner?: ReactNode;
  /** Bottom-right slot, e.g. share of total. */
  footer?: ReactNode;
  className?: string;
}) {
  const typeLabel = accountTypeDetails(account.account_type).label;
  const large = size === "large";

  return (
    <span
      data-muted={muted ? "true" : undefined}
      className={cn(
        "atlas-wallet-card relative isolate flex min-w-0 flex-col overflow-hidden text-white",
        large
          ? "min-h-48 rounded-[1.5rem] p-5 sm:min-h-52 sm:p-6"
          : "min-h-36 rounded-[1.25rem] p-4 sm:min-h-44",
        className,
      )}
      style={walletStyle(account)}
    >
      <AccountTypeIcon
        accountType={account.account_type}
        className={cn(
          "pointer-events-none absolute rotate-[-10deg] opacity-[0.08]",
          large ? "-right-5 -bottom-7 size-40" : "-right-4 -bottom-5 size-28",
        )}
        aria-hidden="true"
      />
      <span className="flex min-w-0 items-start gap-3">
        <AccountLogo account={account} size="md" onCard />
        <span className="min-w-0 flex-1 pt-0.5">
          <span
            className={cn(
              "atlas-wallet-line block font-semibold tracking-[-0.015em] break-words",
              large ? "text-base sm:text-lg" : "text-[0.9375rem] leading-5",
            )}
          >
            {account.name}
          </span>{" "}
          <span className="atlas-wallet-line mt-0.5 block text-xs leading-4 font-medium break-words text-white/85">
            {typeLabel}
            {account.institution ? ` · ${account.institution}` : ""}
          </span>
        </span>
        {corner}
      </span>{" "}
      <span className="mt-auto flex min-w-0 items-end justify-between gap-3 pt-5 sm:pt-6">
        <span className="min-w-0">
          <span className="block text-[0.6875rem] font-semibold tracking-[0.14em] text-white/85 uppercase">
            {balanceLabel}
          </span>{" "}
          <span
            className={cn(
              "mt-1 block min-w-0 font-mono leading-none font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]",
              large ? "text-[2rem] sm:text-[2.25rem]" : "text-[1.375rem]",
            )}
          >
            <MoneyAmount
              centavos={Number(account.current_balance_centavos)}
              quietCentavos
            />
          </span>
        </span>{" "}
        {footer}
      </span>
    </span>
  );
}

/** A frosted pill for small facts on a card, e.g. "26%". */
export function WalletCardBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-white/15 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}
