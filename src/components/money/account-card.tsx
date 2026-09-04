import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { AccountForm } from "@/components/money/account-form";
import { BalanceAdjustmentForm } from "@/components/money/balance-adjustment-form";
import { DeleteArchivedAccountForm } from "@/components/money/delete-archived-account-form";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { TooltipHint } from "@/components/ui/tooltip";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { formatCentavos } from "@/lib/money/money";
import { Card, CardContent } from "@/components/ui/card";

export type AccountSummary = {
  id: string;
  name: string;
  account_type: string;
  institution: string | null;
  current_balance_centavos: number;
  is_archived: boolean;
};

export function AccountCard({
  account,
  today,
}: {
  account: AccountSummary;
  today?: string;
}) {
  const balanceCentavos = Number(account.current_balance_centavos);

  return (
    <Card>
      <CardContent className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={account.is_archived ? "min-w-0" : "min-w-0 pr-12"}>
            <p className="truncate text-sm font-semibold">{account.name}</p>
            <p className="text-muted-foreground mt-1 truncate text-xs capitalize">
              {account.account_type.replaceAll("_", " ")}
              {account.institution ? ` · ${account.institution}` : ""}
            </p>
          </div>
          {!account.is_archived && (
            <OfflineMutationForm mutation="account.archive">
              <input type="hidden" name="accountId" value={account.id} />
              <input type="hidden" name="archived" value="true" />
              <TooltipHint label={`Archive ${account.name}`} side="left">
                <FormSubmitButton
                  variant="ghost"
                  size="icon"
                  aria-label={`Archive ${account.name}`}
                >
                  <Archive className="size-4" aria-hidden="true" />
                </FormSubmitButton>
              </TooltipHint>
            </OfflineMutationForm>
          )}
        </div>

        <p className="mt-6 font-mono text-2xl font-semibold">
          <SensitiveValue>{formatCentavos(balanceCentavos)}</SensitiveValue>
        </p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          {account.is_archived
            ? "Balance when archived"
            : "Current derived balance"}
        </p>

        {account.is_archived ? (
          <>
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
        ) : (
          <details className="@container">
            <TooltipHint label={`Edit ${account.name}`} side="left">
              <Button asChild variant="ghost" size="icon">
                <summary
                  aria-label={`Edit ${account.name}`}
                  className="absolute top-4 right-[3.75rem] cursor-pointer list-none sm:top-5 [&::-webkit-details-marker]:hidden"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </summary>
              </Button>
            </TooltipHint>
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
          </details>
        )}
      </CardContent>
    </Card>
  );
}
