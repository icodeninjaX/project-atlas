import {
  ArchiveRestore,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Smartphone,
  type LucideProps,
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
  provider_id?: string | null;
  current_balance_centavos: number;
  is_archived: boolean;
};

function AccountTypeIcon({
  accountType,
  ...props
}: LucideProps & { accountType: string }) {
  switch (accountType) {
    case "cash":
      return <Banknote {...props} />;
    case "bank":
      return <Landmark {...props} />;
    case "e_wallet":
      return <Smartphone {...props} />;
    case "savings":
      return <PiggyBank {...props} />;
    case "investment":
      return <ChartNoAxesCombined {...props} />;
    default:
      return <CircleDollarSign {...props} />;
  }
}

function walletTone(account: AccountSummary) {
  if (account.name.trim().toLowerCase() === "gcash") {
    return "border-blue-300/25 bg-blue-600 text-white shadow-blue-950/30";
  }

  switch (account.account_type) {
    case "cash":
      return "border-emerald-200/25 bg-emerald-600 text-white shadow-emerald-950/30";
    case "bank":
      return "border-cyan-200/25 bg-cyan-700 text-white shadow-cyan-950/30";
    case "savings":
      return "border-rose-200/25 bg-rose-500 text-white shadow-rose-950/30";
    case "investment":
      return "border-orange-200/25 bg-orange-600 text-white shadow-orange-950/30";
    default:
      return "border-violet-200/25 bg-violet-600 text-white shadow-violet-950/30";
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
  const isGCash = account.name.trim().toLowerCase() === "gcash";

  if (layout === "ledger") {
    return (
      <div className="contents">
        <Card
          className={cn(
            "relative min-h-36 overflow-hidden rounded-2xl border shadow-lg",
            walletTone(account),
          )}
        >
          <AccountTypeIcon
            accountType={account.account_type}
            className="pointer-events-none absolute -right-3 -bottom-4 size-24 rotate-[-8deg] opacity-10"
            aria-hidden="true"
          />
          <CardContent className="relative flex min-h-36 flex-col p-3.5 sm:min-h-40 sm:p-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/20 bg-white/15 shadow-sm backdrop-blur-sm sm:size-9">
                {isGCash ? (
                  <Image
                    src="/icons/gcash-official.png"
                    alt=""
                    width={32}
                    height={32}
                    className="size-7 rounded-md object-contain sm:size-8"
                    aria-hidden="true"
                  />
                ) : (
                  <AccountTypeIcon
                    accountType={account.account_type}
                    className="size-4.5 sm:size-5"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="truncate text-sm font-semibold tracking-[-0.01em] sm:text-[15px]">
                  {account.name}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-medium text-white/70 capitalize sm:text-[11px]">
                  {account.account_type.replaceAll("_", " ")}
                  {account.institution ? ` · ${account.institution}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-5">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-white/65 uppercase">
                Balance
              </p>
              <p className="mt-1 truncate font-mono text-lg font-bold tracking-[-0.045em] tabular-nums sm:text-xl">
                <SensitiveValue>
                  {formatCentavos(balanceCentavos)}
                </SensitiveValue>
              </p>
            </div>
          </CardContent>
        </Card>

        {editing ? (
          <div className="border-border bg-card col-span-full mt-0.5 grid gap-4 rounded-2xl border p-4 shadow-lg sm:grid-cols-2">
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
        ) : null}
      </div>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.01em] sm:text-[15px]">
              {account.name}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs capitalize">
              {account.account_type.replaceAll("_", " ")}
              {account.institution ? ` · ${account.institution}` : ""}
            </p>
          </div>
        </div>

        <div className="border-border/80 mt-3 border-t" />
        <p className="mt-3 font-mono text-2xl font-semibold tracking-[-0.035em] tabular-nums">
          <SensitiveValue>{formatCentavos(balanceCentavos)}</SensitiveValue>
        </p>

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
