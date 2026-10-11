"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoneyActionState } from "@/lib/money/actions";
import { useOfflineActionState } from "@/components/offline/offline-mutation";

const initial: MoneyActionState = { success: false, message: "" };

export function DeleteArchivedAccountForm({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useOfflineActionState(
    "account.deleteArchived",
    initial,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <details className="mt-3">
      <summary className="text-destructive focus-visible:ring-ring inline-flex min-h-11 cursor-pointer items-center rounded-lg px-1 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none sm:min-h-9">
        Delete permanently
      </summary>
      <form
        action={action}
        className="bg-muted/40 mt-2 grid gap-3 rounded-xl p-4"
      >
        <input type="hidden" name="accountId" value={accountId} />
        <p className="text-muted-foreground text-xs leading-5">
          This cannot be undone. ATLAS will only delete an archived account that
          has no transactions, transfers, or balance adjustments.
        </p>
        <label className="text-sm font-medium">
          Type {accountName} to confirm
          <Input
            name="confirmationName"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
            autoComplete="off"
            required
            aria-label={`Type ${accountName} to confirm permanent deletion`}
            className="mt-1.5"
          />
        </label>
        <Button
          type="submit"
          variant="destructive"
          disabled={pending || confirmation !== accountName}
          pending={pending}
          pendingLabel="Deleting…"
          className="w-full"
        >
          Delete account permanently
        </Button>
      </form>
    </details>
  );
}
