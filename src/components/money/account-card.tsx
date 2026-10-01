import { ArchiveRestore } from "lucide-react";
import { DeleteArchivedAccountForm } from "@/components/money/delete-archived-account-form";
import { WalletCard } from "@/components/money/wallet-card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";

export type AccountSummary = {
  id: string;
  name: string;
  account_type: string;
  institution: string | null;
  provider_id?: string | null;
  current_balance_centavos: number;
  is_archived: boolean;
};

/**
 * An archived account: its card in grayscale, read-only apart from restoring
 * it or, when it has no history, deleting it for good.
 */
export function AccountCard({ account }: { account: AccountSummary }) {
  if (!account.is_archived) return <WalletCard account={account} />;

  return (
    <article className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-[1.5rem] border p-3">
      <WalletCard
        account={account}
        balanceLabel="Balance when archived"
        muted
      />
      <div className="px-1 pb-1">
        <OfflineMutationForm mutation="account.archive">
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
      </div>
    </article>
  );
}
