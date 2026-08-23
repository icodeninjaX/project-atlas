"use client";

import { ShieldAlert, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteAccountAction,
  type SecurityState,
} from "@/lib/settings/security-actions";

const initialState: SecurityState = { success: false, message: "" };

export function DeleteAccountControl({ configured }: { configured: boolean }) {
  const { pending: unsynced, clearPrivateCache } = useOfflineSync();
  const action = async (state: SecurityState, formData: FormData) => {
    if (
      !window.confirm(
        "Permanently delete your Atlas account and cloud data? This cannot be undone.",
      )
    ) {
      return state;
    }
    await clearPrivateCache().catch(() => undefined);
    return deleteAccountAction(state, formData);
  };
  const [state, formAction, deleting] = useActionState(action, initialState);

  return (
    <details className="border-destructive/25 bg-destructive/5 rounded-xl border p-4">
      <summary className="text-destructive focus-visible:ring-destructive flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none">
        <ShieldAlert className="size-4" />
        Delete account permanently
      </summary>
      <div className="mt-3">
        <p className="text-muted-foreground text-xs leading-5">
          Deletes your login and cascades all Atlas records. Export your data
          first. This action cannot be reversed.
        </p>
        {!configured ? (
          <p className="border-border bg-muted text-muted-foreground mt-3 rounded-xl border px-3 py-2.5 text-xs leading-5">
            Not configured. Add the server-only Supabase service role key to
            enable authenticated deletion.
          </p>
        ) : (
          <form action={formAction} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="delete-password" className="text-xs font-medium">
                Current password
              </label>
              <Input
                id="delete-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="delete-confirmation"
                className="text-xs font-medium"
              >
                Type DELETE MY ATLAS
              </label>
              <Input
                id="delete-confirmation"
                name="confirmation"
                autoComplete="off"
                pattern="DELETE MY ATLAS"
                required
              />
            </div>
            {unsynced > 0 && (
              <p className="text-destructive text-xs">
                Sync or resolve {unsynced} queued change
                {unsynced === 1 ? "" : "s"} before deleting the account.
              </p>
            )}
            {state.message && (
              <p role="status" className="text-destructive text-xs leading-5">
                {state.message}
              </p>
            )}
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={deleting || unsynced > 0}
            >
              <Trash2 className="size-4" />
              {deleting ? "Deleting…" : "Delete my Atlas"}
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}
