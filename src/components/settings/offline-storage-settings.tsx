"use client";

import { DatabaseZap, History } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { SettingRow, StatusChip } from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cellClass = "bg-card min-w-0 px-3.5 py-3";

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

  const usedShare =
    estimate?.usage && estimate.quota
      ? Math.min(1, estimate.usage / estimate.quota)
      : 0;

  return (
    <div className="space-y-6">
      <dl className="bg-border grid gap-px overflow-hidden rounded-xl sm:grid-cols-3">
        <div className={cellClass}>
          <dt className="text-muted-foreground text-xs">Connection</dt>
          <dd className="mt-2">
            <StatusChip tone={online ? "positive" : "caution"}>
              {online ? "Online" : "Offline"}
            </StatusChip>
          </dd>
        </div>
        <div className={cellClass}>
          <dt className="text-muted-foreground text-xs">Sync queue</dt>
          <dd className="mt-2 flex items-baseline gap-1.5 text-sm">
            <span className="font-mono font-semibold tabular-nums">
              {pending}
            </span>
            pending ·
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                blocked > 0 && "text-destructive",
              )}
            >
              {blocked}
            </span>
            blocked
          </dd>
        </div>
        <div className={cellClass}>
          <dt className="text-muted-foreground text-xs">Browser storage</dt>
          <dd className="mt-2 text-sm font-semibold">
            {estimate
              ? `${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}`
              : "Estimate unavailable"}
            <span
              aria-hidden="true"
              className="bg-muted mt-2.5 block h-1.5 overflow-hidden rounded-full"
            >
              <span
                className="bg-primary block h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${Math.max(usedShare * 100, estimate ? 2 : 0)}%`,
                }}
              />
            </span>
          </dd>
        </div>
      </dl>

      <div className="divide-border/70 divide-y">
        <SettingRow
          icon={History}
          title="Last successful sync"
          detail={lastSyncLabel}
          className="pb-5"
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!online}
            pending={syncing}
            pendingLabel="Syncing…"
            onClick={() =>
              startSync(async () => {
                await syncNow();
                toast.success("ATLAS sync was requested.");
              })
            }
          >
            Sync now
          </Button>
        </SettingRow>

        <SettingRow
          icon={DatabaseZap}
          title="Cached private pages"
          detail="Remove offline page copies without deleting queued changes or your cloud data. Pages can be cached again as you visit them."
          className="pt-5"
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            pending={clearing}
            pendingLabel="Clearing…"
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
            Clear page cache
          </Button>
        </SettingRow>
      </div>
    </div>
  );
}
