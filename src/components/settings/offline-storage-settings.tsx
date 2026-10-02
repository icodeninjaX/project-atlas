"use client";

import {
  Cloud,
  CloudOff,
  DatabaseZap,
  HardDrive,
  History,
  ListRestart,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import {
  SettingRow,
  StatusChip,
  tileClass,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <dl className="grid gap-2.5 sm:grid-cols-3">
        <div className={tileClass}>
          <dt className="text-muted-foreground flex items-center gap-2 text-xs">
            {online ? (
              <Cloud aria-hidden="true" className="size-3.5" />
            ) : (
              <CloudOff aria-hidden="true" className="size-3.5" />
            )}
            Connection
          </dt>
          <dd className="mt-2.5">
            <StatusChip tone={online ? "positive" : "caution"}>
              {online ? "Online" : "Offline"}
            </StatusChip>
          </dd>
        </div>
        <div className={tileClass}>
          <dt className="text-muted-foreground flex items-center gap-2 text-xs">
            <ListRestart aria-hidden="true" className="size-3.5" />
            Sync queue
          </dt>
          <dd className="mt-2 flex items-baseline gap-1.5 text-sm font-semibold">
            <span className="font-mono text-xl tabular-nums">{pending}</span>
            pending ·
            <span
              className={cn(
                "font-mono text-xl tabular-nums",
                blocked > 0 && "text-destructive",
              )}
            >
              {blocked}
            </span>
            blocked
          </dd>
        </div>
        <div className={tileClass}>
          <dt className="text-muted-foreground flex items-center gap-2 text-xs">
            <HardDrive aria-hidden="true" className="size-3.5" />
            Browser storage
          </dt>
          <dd className="mt-2 text-sm font-semibold">
            {estimate
              ? `${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}`
              : "Estimate unavailable"}
            <span
              aria-hidden="true"
              className="bg-muted mt-2.5 block h-1.5 overflow-hidden rounded-full"
            >
              <span
                className="from-primary/70 to-primary block h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
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
            <RefreshCw className="size-4" />
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
            <Trash2 className="size-4" />
            Clear page cache
          </Button>
        </SettingRow>
      </div>
    </div>
  );
}
