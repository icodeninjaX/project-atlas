"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const { pending: unsynced, blocked, retry } = useOfflineSync();

  return (
    <form
      action={async () => {
        if (!navigator.onLine) {
          toast.error("Connect to the internet before logging out.");
          return;
        }
        if (unsynced > 0) {
          if (blocked > 0) await retry();
          toast.info(
            "Atlas is syncing saved changes. Log out after the sync indicator clears.",
          );
          return;
        }
        setPending(true);
        if ("serviceWorker" in navigator) {
          await navigator.serviceWorker.ready
            .then((registration) =>
              registration.active?.postMessage({ type: "CLEAR_PRIVATE_DATA" }),
            )
            .catch(() => undefined);
        }
        await signOutAction();
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label="Log out"
      >
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
