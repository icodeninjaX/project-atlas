"use client";

import { Cloud, CloudOff, DatabaseZap, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";

function formatBytes(value: number | undefined) {
  if (!value) return "0 MB";
  const megabytes = value / 1024 / 1024;
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`;
}

export function OfflineStorageSettings() {
  const { online, pending, blocked, lastSyncedAt, syncNow, clearPrivateCache } =
    useOfflineSync();
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [syncing, startSync] = useTransition();
  const [clearing, startClear] = useTransition();

  const refreshEstimate = async () => {
    if (!navigator.storage?.estimate) return;
    setEstimate(await navigator.storage.estimate());
  };

  useEffect(() => {
    queueMicrotask(() => void refreshEstimate());
  }, []);

  const lastSyncLabel = lastSyncedAt
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(lastSyncedAt))
    : "Not recorded yet";

  return (
    <div className="space-y-5">
      <dl className="grid gap-2 sm:grid-cols-3">
        <div className="bg-muted/60 rounded-xl p-3">
          <dt className="text-muted-foreground flex items-center gap-2 text-xs">
            {online ? (
              <Cloud className="size-3.5" />
            ) : (
              <CloudOff className="size-3.5" />
            )}
            Connection
          </dt>
          <dd className="mt-2 text-sm font-semibold">
            {online ? "Online" : "Offline"}
          </dd>
        </div>
        <div className="bg-muted/60 rounded-xl p-3">
          <dt className="text-muted-foreground text-xs">Sync queue</dt>
          <dd className="mt-2 text-sm font-semibold">
            {pending} pending · {blocked} blocked
          </dd>
        </div>
        <div className="bg-muted/60 rounded-xl p-3">
          <dt className="text-muted-foreground text-xs">Browser storage</dt>
          <dd className="mt-2 text-sm font-semibold">
            {estimate
              ? `${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}`
              : "Estimate unavailable"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Last successful sync</p>
          <p className="text-muted-foreground mt-1 text-xs">{lastSyncLabel}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!online || syncing}
          onClick={() =>
            startSync(async () => {
              await syncNow();
              toast.success("Atlas sync was requested.");
            })
          }
        >
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      <div className="border-border flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <DatabaseZap className="text-muted-foreground size-4" />
            Cached private pages
          </p>
          <p className="text-muted-foreground mt-1 max-w-lg text-xs leading-5">
            Remove offline page copies without deleting queued changes or your
            cloud data. Pages can be cached again as you visit them.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={clearing}
          onClick={() => {
            if (
              !window.confirm(
                "Clear cached private pages from this device? Queued changes will be kept.",
              )
            ) {
              return;
            }
            startClear(async () => {
              try {
                await clearPrivateCache();
                await refreshEstimate();
                toast.success("Cached private pages cleared.");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Cached pages could not be cleared.",
                );
              }
            });
          }}
        >
          <Trash2 className="size-4" />
          {clearing ? "Clearing…" : "Clear page cache"}
        </Button>
      </div>
    </div>
  );
}
