import { Archive, ArchiveRestore } from "lucide-react";
import { AccountForm } from "@/components/money/account-form";
import { BalanceAdjustmentForm } from "@/components/money/balance-adjustment-form";
import { DeleteArchivedAccountForm } from "@/components/money/delete-archived-account-form";
import { Button } from "@/components/ui/button";
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
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label={`Archive ${account.name}`}
                >
                  <Archive className="size-4" aria-hidden="true" />
                </Button>
              </TooltipHint>
            </OfflineMutationForm>
          )}
        </div>

        {!account.is_archived && (
          <details className="border-border @container mt-4 border-t pt-3">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium">
              Edit account details
            </summary>
            <div className="mt-3">
              <AccountForm account={account} />
            </div>
          </details>
        )}

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
              <Button type="submit" variant="secondary" className="w-full">
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Restore account
              </Button>
            </OfflineMutationForm>
            <DeleteArchivedAccountForm
              accountId={account.id}
              accountName={account.name}
            />
          </>
        ) : (
          <details className="border-border @container mt-4 border-t pt-3">
            <summary className="text-primary cursor-pointer text-xs font-semibold">
              Adjust current balance
            </summary>
            <BalanceAdjustmentForm
              accountId={account.id}
              accountName={account.name}
              currentBalanceCentavos={balanceCentavos}
              today={today ?? ""}
            />
          </details>
        )}
      </CardContent>
    </Card>
  );
}
