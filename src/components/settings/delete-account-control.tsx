"use client";

import { ChevronDown, ShieldAlert, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormFeedback,
  IconTile,
  fieldLabelClass,
} from "@/components/settings/settings-chrome";
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
        "Permanently delete your ATLAS account and cloud data? This cannot be undone.",
      )
    ) {
      return state;
    }
    await clearPrivateCache().catch(() => undefined);
    return deleteAccountAction(state, formData);
  };
  const [state, formAction, deleting] = useActionState(action, initialState);

  return (
    <details className="group from-destructive/[0.07] ring-destructive/25 rounded-2xl bg-gradient-to-br to-transparent ring-1">
      <summary className="focus-visible:ring-destructive flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl p-3 focus-visible:ring-2 focus-visible:outline-none sm:p-3.5 [&::-webkit-details-marker]:hidden">
        <IconTile icon={ShieldAlert} tone="danger" size="sm" />
        <span className="min-w-0 flex-1">
          <span className="text-destructive block text-sm font-semibold">
            Delete account permanently
          </span>
          <span className="text-muted-foreground mt-0.5 block text-xs">
            Removes your login and every ATLAS record.
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="text-destructive/70 size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-destructive/15 border-t p-3 sm:p-4">
        <p className="text-muted-foreground text-xs leading-5">
          Deletes your login and cascades all ATLAS records. Export your data
          first. This action cannot be reversed.
        </p>
        {!configured ? (
          <p className="bg-muted/60 ring-border/80 text-muted-foreground mt-3 rounded-xl px-3 py-2.5 text-xs leading-5 ring-1">
            Not configured. Add the server-only Supabase service role key to
            enable authenticated deletion.
          </p>
        ) : (
          <form action={formAction} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="delete-password" className={fieldLabelClass}>
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
              <label htmlFor="delete-confirmation" className={fieldLabelClass}>
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
              <FormFeedback success={false}>{state.message}</FormFeedback>
            )}
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={deleting || unsynced > 0}
              pending={deleting}
              pendingLabel="Deleting…"
            >
              <Trash2 className="size-4" />
              Delete my ATLAS
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}
