"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
    <details className="border-destructive/30 mt-4 border-t pt-3">
      <summary className="text-destructive cursor-pointer text-xs font-semibold">
        Delete permanently
      </summary>
      <form
        action={action}
        className="border-destructive/30 bg-destructive/5 mt-3 grid gap-3 rounded-xl border p-3"
      >
        <input type="hidden" name="accountId" value={accountId} />
        <p className="text-muted-foreground text-xs leading-5">
          This cannot be undone. ATLAS will only delete an archived account that
          has no transactions, transfers, or balance adjustments.
        </p>
        <label className="text-muted-foreground text-xs">
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
          <Trash2 className="size-4" aria-hidden="true" />
          Delete account permanently
        </Button>
      </form>
    </details>
  );
}
