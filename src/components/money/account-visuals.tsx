import {
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Smartphone,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ACCOUNT_TYPE_DETAILS,
  ACCOUNT_TYPE_VALUES,
  accountTypeDetails,
  isAccountType,
  type AccountType,
} from "@/lib/money/account-types";
import {
  PHILIPPINE_ACCOUNT_PROVIDERS,
  type PhilippineAccountProvider,
} from "@/lib/money/ph-account-providers";
import { walletSurface } from "@/lib/money/wallet-colors";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  e_wallet: Smartphone,
  savings: PiggyBank,
  investment: ChartNoAxesCombined,
  other: CircleDollarSign,
};

export const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPE_VALUES.map((value) => ({
  value,
  label: ACCOUNT_TYPE_DETAILS[value].label,
  icon: ACCOUNT_TYPE_ICONS[value],
}));

export function AccountTypeIcon({
  accountType,
  ...props
}: LucideProps & { accountType: string }) {
  const Icon =
    ACCOUNT_TYPE_ICONS[isAccountType(accountType) ? accountType : "other"];
  return <Icon {...props} />;
}

export type AccountIdentity = {
  name: string;
  account_type: string;
  provider_id?: string | null;
};

/**
 * The provider behind an account. Accounts created before providers were
 * stored still recognise a plain "GCash" e-wallet by name.
 */
export function accountProvider(
  account: AccountIdentity,
): PhilippineAccountProvider | null {
  const providerId =
    account.provider_id ??
    (account.account_type === "e_wallet" &&
    account.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") === "gcash"
      ? "gcash"
      : null);
  if (!providerId) return null;
  return (
    PHILIPPINE_ACCOUNT_PROVIDERS.find(
      (provider) => provider.id === providerId,
    ) ?? null
  );
}

/** CSS variables for an account's card gradient. */
export function walletStyle(account: AccountIdentity): CSSProperties {
  const surface = walletSurface(
    accountProvider(account)?.brandColor ??
      accountTypeDetails(account.account_type).cardColor,
  );
  return {
    "--wallet-highlight": surface.highlight,
    "--wallet-base": surface.base,
    "--wallet-shadow": surface.shadow,
  } as CSSProperties;
}

const logoSizes = {
  xs: { box: "size-6", icon: "size-3", px: 24 },
  sm: { box: "size-8", icon: "size-4", px: 32 },
  md: { box: "size-9 sm:size-10", icon: "size-4.5", px: 40 },
} as const;

/**
 * An account's mark: the provider's logo on a white disc, or its type icon
 * on the account's own color. `onCard` swaps the solid disc for frosted
 * glass so it sits on a wallet card's gradient.
 */
export function AccountLogo({
  account,
  size = "sm",
  onCard = false,
  className,
}: {
  account: AccountIdentity;
  size?: keyof typeof logoSizes;
  onCard?: boolean;
  className?: string;
}) {
  const provider = accountProvider(account);
  const dimensions = logoSizes[size];

  if (provider?.iconPath) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5",
          dimensions.box,
          className,
        )}
      >
        <Image
          src={provider.iconPath}
          alt=""
          width={dimensions.px}
          height={dimensions.px}
          className="size-full rounded-full object-cover"
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-white",
        onCard
          ? "bg-white/15 ring-1 ring-white/25 backdrop-blur-sm"
          : "atlas-wallet-card relative isolate overflow-hidden",
        dimensions.box,
        className,
      )}
      style={onCard ? undefined : walletStyle(account)}
    >
      <AccountTypeIcon
        accountType={account.account_type}
        className={dimensions.icon}
        aria-hidden="true"
      />
    </span>
  );
}
