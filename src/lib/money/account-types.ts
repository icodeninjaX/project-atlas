export const ACCOUNT_TYPE_VALUES = [
  "cash",
  "bank",
  "e_wallet",
  "savings",
  "investment",
  "other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];

export type AllocationBucketId = "everyday" | "savings" | "invested" | "other";

type AccountTypeDetails = {
  label: string;
  /** Card color for accounts without a recognised provider brand. */
  cardColor: `#${string}`;
  bucket: AllocationBucketId;
};

export const ACCOUNT_TYPE_DETAILS: Record<AccountType, AccountTypeDetails> = {
  cash: { label: "Cash", cardColor: "#0f7a5a", bucket: "everyday" },
  bank: { label: "Bank", cardColor: "#1d4f91", bucket: "everyday" },
  e_wallet: { label: "E-wallet", cardColor: "#5b3fd1", bucket: "everyday" },
  savings: { label: "Savings", cardColor: "#b4235a", bucket: "savings" },
  investment: {
    label: "Investment",
    cardColor: "#b45309",
    bucket: "invested",
  },
  other: { label: "Other", cardColor: "#3f4a5c", bucket: "other" },
};

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPE_VALUES as readonly string[]).includes(value);
}

export function accountTypeDetails(value: string): AccountTypeDetails {
  return ACCOUNT_TYPE_DETAILS[isAccountType(value) ? value : "other"];
}

export const ALLOCATION_BUCKETS: ReadonlyArray<{
  id: AllocationBucketId;
  label: string;
  detail: string;
}> = [
  { id: "everyday", label: "Everyday", detail: "Cash, bank & e-wallets" },
  { id: "savings", label: "Savings", detail: "Set aside" },
  { id: "invested", label: "Invested", detail: "Investment accounts" },
  { id: "other", label: "Other", detail: "Other accounts" },
];

export type AllocationSlice = {
  id: AllocationBucketId;
  label: string;
  detail: string;
  centavos: number;
  /** Share of the positive total, 0–1. */
  share: number;
  accountCount: number;
};

export type Allocation = {
  slices: AllocationSlice[];
  /** Sum of positive balances — the base every share is measured against. */
  positiveCentavos: number;
  /** Sum of negative balances (overdrawn accounts), as a negative number. */
  negativeCentavos: number;
};

/**
 * Groups account balances into a few buckets for a part-to-whole bar.
 * Only positive balances form the whole; a negative balance cannot be a
 * share, so it is reported separately instead of shrinking a slice.
 * Slices keep a fixed order so each bucket always wears the same color.
 */
export function allocateBalances(
  accounts: ReadonlyArray<{
    account_type: string;
    current_balance_centavos: number;
  }>,
): Allocation {
  const totals = new Map<
    AllocationBucketId,
    { centavos: number; count: number }
  >();
  let positiveCentavos = 0;
  let negativeCentavos = 0;

  for (const account of accounts) {
    const balance = Number(account.current_balance_centavos);
    if (balance < 0) {
      negativeCentavos += balance;
      continue;
    }
    if (balance === 0) continue;
    const bucket = accountTypeDetails(account.account_type).bucket;
    const current = totals.get(bucket) ?? { centavos: 0, count: 0 };
    totals.set(bucket, {
      centavos: current.centavos + balance,
      count: current.count + 1,
    });
    positiveCentavos += balance;
  }

  const slices = ALLOCATION_BUCKETS.flatMap((bucket) => {
    const total = totals.get(bucket.id);
    if (!total) return [];
    return [
      {
        ...bucket,
        centavos: total.centavos,
        share: positiveCentavos > 0 ? total.centavos / positiveCentavos : 0,
        accountCount: total.count,
      },
    ];
  });

  return { slices, positiveCentavos, negativeCentavos };
}

/** "26%", or "<1%" for a sliver that would otherwise read as zero. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.005) return "<1%";
  return `${Math.round(share * 100)}%`;
}
