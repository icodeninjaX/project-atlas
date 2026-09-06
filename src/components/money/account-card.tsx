import {
  ArchiveRestore,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import { AccountForm } from "@/components/money/account-form";
import { BalanceAdjustmentForm } from "@/components/money/balance-adjustment-form";
import { DeleteArchivedAccountForm } from "@/components/money/delete-archived-account-form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { formatCentavos } from "@/lib/money/money";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AccountSummary = {
  id: string;
  name: string;
  account_type: string;
  institution: string | null;
  current_balance_centavos: number;
  is_archived: boolean;
};

function accountIcon(accountType: string) {
  switch (accountType) {
    case "cash":
      return Banknote;
    case "bank":
      return Landmark;
    case "e_wallet":
      return Smartphone;
    case "savings":
      return PiggyBank;
    case "investment":
      return ChartNoAxesCombined;
    default:
      return CircleDollarSign;
  }
}

export function AccountCard({
  account,
  today,
  layout = "card",
  editing = false,
}: {
  account: AccountSummary;
  today?: string;
  layout?: "card" | "ledger";
  editing?: boolean;
}) {
  const balanceCentavos = Number(account.current_balance_centavos);
  const AccountIcon = accountIcon(account.account_type);
  const isGCash = account.name.trim().toLowerCase() === "gcash";

  return (
    <Card
      className={cn(
        "overflow-visible",
        layout === "ledger" &&
          "rounded-none border-0 bg-transparent shadow-none first:rounded-t-2xl last:rounded-b-2xl [&:not(:last-child)]:border-b",
      )}
    >
      <CardContent
        className={cn(
          "relative p-4",
          layout === "ledger" && "p-3 sm:px-5 sm:py-4",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            layout === "ledger" &&
              "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2.5 sm:grid-cols-[auto_minmax(0,1fr)_minmax(9rem,auto)] sm:gap-x-5",
          )}
        >
          {layout === "ledger" ? (
            <div className="border-primary/20 bg-primary/8 text-primary grid size-8 shrink-0 place-items-center rounded-lg border sm:size-10 sm:rounded-xl">
              {isGCash ? (
                <Image
                  src="/icons/gcash-wallet.png"
                  alt=""
                  width={28}
                  height={28}
                  className="size-5 object-contain sm:size-7"
                  aria-hidden="true"
                />
              ) : (
                <AccountIcon className="size-4 sm:size-5" aria-hidden="true" />
              )}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.01em] sm:text-[15px]">
              {account.name}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs capitalize">
              {account.account_type.replaceAll("_", " ")}
              {account.institution ? ` · ${account.institution}` : ""}
            </p>
          </div>

          {layout === "ledger" ? (
            <p className="text-right font-mono text-base font-semibold tracking-[-0.035em] tabular-nums sm:text-2xl">
              <SensitiveValue>{formatCentavos(balanceCentavos)}</SensitiveValue>
            </p>
          ) : null}
        </div>

        {layout === "card" ? (
          <>
            <div className="border-border/80 mt-3 border-t" />
            <p className="mt-3 font-mono text-2xl font-semibold tracking-[-0.035em] tabular-nums">
              <SensitiveValue>{formatCentavos(balanceCentavos)}</SensitiveValue>
            </p>
          </>
        ) : null}

        {account.is_archived ? (
          <>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Balance when archived
            </p>
            <OfflineMutationForm mutation="account.archive" className="mt-4">
              <input type="hidden" name="accountId" value={account.id} />
              <input type="hidden" name="archived" value="false" />
              <FormSubmitButton
                variant="secondary"
                pendingLabel="Restoring…"
                className="w-full"
              >
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Restore account
              </FormSubmitButton>
            </OfflineMutationForm>
            <DeleteArchivedAccountForm
              accountId={account.id}
              accountName={account.name}
            />
          </>
        ) : editing ? (
          <div className="@container">
            <div className="border-border mt-4 grid gap-4 border-t pt-3">
              <section aria-labelledby={`account-details-${account.id}`}>
                <p
                  id={`account-details-${account.id}`}
                  className="text-muted-foreground mb-2 text-xs font-medium"
                >
                  Account details
                </p>
                <AccountForm account={account} />
              </section>
              <section aria-labelledby={`account-balance-${account.id}`}>
                <p
                  id={`account-balance-${account.id}`}
                  className="text-muted-foreground text-xs font-medium"
                >
                  Current balance
                </p>
                <BalanceAdjustmentForm
                  accountId={account.id}
                  accountName={account.name}
                  currentBalanceCentavos={balanceCentavos}
                  today={today ?? ""}
                />
              </section>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
