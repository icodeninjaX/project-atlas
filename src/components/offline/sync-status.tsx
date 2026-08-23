"use client";

import { Cloud, CloudAlert, RefreshCw, WifiOff } from "lucide-react";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";

export function SyncStatus({ showLabel = false }: { showLabel?: boolean }) {
  const { online, pending, blocked, retry } = useOfflineSync();

  if (blocked > 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void retry()}
        title="Retry changes that could not sync"
        className="text-destructive px-2"
      >
        <CloudAlert className="size-4" />
        <span className={showLabel ? "inline" : "hidden md:inline"}>
          {blocked} sync issue{blocked === 1 ? "" : "s"}
        </span>
      </Button>
    );
  }

  if (!online) {
    return (
      <span
        role="status"
        className="text-muted-foreground flex min-h-9 items-center gap-1.5 px-2 text-xs"
        title={`${pending} change${pending === 1 ? "" : "s"} waiting to sync`}
      >
        <WifiOff className="size-4" />
        <span className={showLabel ? "inline" : "hidden md:inline"}>
          Offline{pending ? ` · ${pending} pending` : ""}
        </span>
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span
        role="status"
        className="text-muted-foreground flex min-h-9 items-center gap-1.5 px-2 text-xs"
      >
        <RefreshCw className="size-4 animate-spin" />
        <span className={showLabel ? "inline" : "hidden md:inline"}>
          Syncing {pending}
        </span>
      </span>
    );
  }

  return (
    <span
      role="status"
      className={`text-muted-foreground min-h-9 items-center gap-1.5 px-2 text-xs ${showLabel ? "flex" : "hidden xl:flex"}`}
    >
      <Cloud className="size-4" />
      Synced
    </span>
  );
}
