"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TooltipHint } from "@/components/ui/tooltip";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { signOutAction, signOutEverywhereAction } from "@/lib/auth/actions";

export function SignOutButton({
  showLabel = false,
  scope = "local",
}: {
  showLabel?: boolean;
  scope?: "local" | "global";
}) {
  const [pending, setPending] = useState(false);
  const { pending: unsynced, blocked, retry } = useOfflineSync();
  const button = (
    <Button
      type="submit"
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      pending={pending}
      pendingLabel={showLabel ? "Logging out…" : undefined}
      aria-label={scope === "global" ? "Log out everywhere" : "Log out"}
      className={showLabel ? "w-full justify-start" : undefined}
    >
      <LogOut className="size-4" />
      {showLabel &&
        (scope === "global" ? "Log out everywhere" : "Log out this device")}
    </Button>
  );

  return (
    <form
      className={showLabel ? "w-full" : undefined}
      action={async () => {
        if (
          scope === "global" &&
          !window.confirm(
            "Log out every device? You will need to sign in again on each one.",
          )
        ) {
          return;
        }
        if (!navigator.onLine) {
          toast.error("Connect to the internet before logging out.");
          return;
        }
        if (unsynced > 0) {
          if (blocked > 0) await retry();
          toast.info(
            "ATLAS is syncing saved changes. Log out after the sync indicator clears.",
          );
          return;
        }
        setPending(true);
        if (
          "serviceWorker" in navigator &&
          process.env.NODE_ENV === "production"
        ) {
          await navigator.serviceWorker.ready
            .then((registration) =>
              registration.active?.postMessage({ type: "CLEAR_PRIVATE_DATA" }),
            )
            .catch(() => undefined);
        }
        if (scope === "global") {
          await signOutEverywhereAction();
        } else {
          await signOutAction();
        }
      }}
    >
      {showLabel ? button : <TooltipHint label="Log out">{button}</TooltipHint>}
    </form>
  );
}
