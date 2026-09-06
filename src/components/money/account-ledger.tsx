"use client";

import { Archive, Pencil, SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import {
  AccountCard,
  type AccountSummary,
} from "@/components/money/account-card";
import { OfflineMutationForm } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

export function AccountLedger({
  accounts,
  today,
}: {
  accounts: AccountSummary[];
  today: string;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id ?? "",
  );
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const manageMenu = useRef<HTMLDetailsElement>(null);

  function editSelectedAccount() {
    setEditingAccountId((current) =>
      current === selectedAccountId ? null : selectedAccountId,
    );
    if (manageMenu.current) manageMenu.current.open = false;
  }

  return (
    <section className="mt-5" aria-label="Active accounts">
      <div className="mb-2 flex justify-end">
        <details ref={manageMenu} className="relative z-30">
          <Button asChild variant="secondary" size="sm">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Manage accounts
            </summary>
          </Button>
          <div className="border-border bg-background absolute top-full right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border p-3 shadow-xl">
            <label className="text-muted-foreground text-xs font-medium">
              Choose an account
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/25 mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus-visible:ring-2 sm:text-sm"
                aria-label="Account to manage"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={editSelectedAccount}
              >
                <Pencil className="size-4" aria-hidden="true" />
                {editingAccountId === selectedAccountId ? "Close" : "Edit"}
              </Button>
              <OfflineMutationForm mutation="account.archive">
                <input
                  type="hidden"
                  name="accountId"
                  value={selectedAccountId}
                />
                <input type="hidden" name="archived" value="true" />
                <FormSubmitButton
                  variant="ghost"
                  aria-label="Archive selected account"
                  className="text-destructive hover:text-destructive w-full"
                >
                  <Archive className="size-4" aria-hidden="true" />
                  Archive
                </FormSubmitButton>
              </OfflineMutationForm>
            </div>
          </div>
        </details>
      </div>

      <div className="border-border bg-card rounded-2xl border shadow-[0_16px_40px_color-mix(in_srgb,var(--background)_45%,transparent)]">
        <div className="bg-primary h-px w-full" />
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            today={today}
            layout="ledger"
            editing={editingAccountId === account.id}
          />
        ))}
      </div>
    </section>
  );
}
