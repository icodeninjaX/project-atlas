"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getQueueCounts,
  queueChangeEvent,
  requestBackgroundSync,
  retryBlockedMutations,
  submitOfflineMutation,
} from "@/lib/offline/queue";
import type {
  OfflineActionState,
  OfflineMutationType,
} from "@/lib/offline/types";

type OfflineContextValue = {
  userId: string;
  online: boolean;
  pending: number;
  blocked: number;
  lastSyncedAt: string | null;
  submit: (
    type: OfflineMutationType,
    formData: FormData,
  ) => Promise<OfflineActionState>;
  retry: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearPrivateCache: () => Promise<void>;
};

export const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const lastSyncKey = `atlas:last-sync:${userId}`;

  const markSynced = useCallback(() => {
    const value = new Date().toISOString();
    window.localStorage.setItem(lastSyncKey, value);
    setLastSyncedAt(value);
  }, [lastSyncKey]);

  const refreshCounts = useCallback(async () => {
    try {
      const counts = await getQueueCounts(userId);
      setPending(counts.pending);
      setBlocked(counts.blocked);
    } catch {
      // IndexedDB can be unavailable in private modes; submissions report that directly.
    }
  }, [userId]);

  const submit = useCallback(
    async (type: OfflineMutationType, formData: FormData) => {
      const result = await submitOfflineMutation(userId, type, formData);
      await refreshCounts();
      if (result.success && !result.queued) {
        markSynced();
        router.refresh();
      }
      return result;
    },
    [markSynced, refreshCounts, router, userId],
  );

  const retry = useCallback(async () => {
    await retryBlockedMutations(userId);
    await refreshCounts();
    await requestBackgroundSync();
  }, [refreshCounts, userId]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Connect to the internet to sync Atlas.");
      return;
    }
    await retryBlockedMutations(userId);
    await requestBackgroundSync();
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(
        () => null,
      );
      const worker = navigator.serviceWorker.controller ?? registration?.active;
      worker?.postMessage({ type: "SYNC_NOW" });
    }
    await refreshCounts();
    if (pending === 0 && blocked === 0) markSynced();
  }, [blocked, markSynced, pending, refreshCounts, userId]);

  const clearPrivateCache = useCallback(async () => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      throw new Error("Private page caching is unavailable in this browser.");
    }
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller ?? registration.active;
    if (!worker) throw new Error("Atlas storage is not ready yet.");
    await new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        reject(new Error("Atlas storage did not respond. Try again."));
      }, 3000);
      channel.port1.onmessage = () => {
        window.clearTimeout(timeout);
        channel.port1.close();
        resolve();
      };
      worker.postMessage({ type: "CLEAR_PRIVATE_CACHE" }, [channel.port2]);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => setOnline(navigator.onLine));
    queueMicrotask(() => void refreshCounts());
    queueMicrotask(() =>
      setLastSyncedAt(window.localStorage.getItem(lastSyncKey)),
    );

    const handleOnline = () => {
      setOnline(true);
      void requestBackgroundSync();
    };
    const handleOffline = () => setOnline(false);
    const handleQueueChange = () => void refreshCounts();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(queueChangeEvent, handleQueueChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(queueChangeEvent, handleQueueChange);
    };
  }, [lastSyncKey, refreshCounts]);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    let cancelled = false;
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as
        | {
            type?: string;
            synced?: number;
            failed?: number;
            messages?: string[];
          }
        | undefined;
      if (data?.type !== "SYNC_COMPLETE") return;
      void refreshCounts();
      if (data.synced) {
        markSynced();
        toast.success(
          `${data.synced} offline change${data.synced === 1 ? "" : "s"} synced.`,
        );
        router.refresh();
      }
      if (data.failed) {
        toast.error(data.messages?.[0] ?? "An offline change needs attention.");
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    void navigator.serviceWorker.ready
      .then(async (ready) => {
        if (cancelled) return;
        const worker = navigator.serviceWorker.controller ?? ready.active;
        worker?.postMessage({
          type: "SET_USER",
          userId,
          url: window.location.href,
        });
        await requestBackgroundSync();
      })
      .catch(() => {
        // The web app remains usable online if service worker registration is blocked.
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [markSynced, refreshCounts, router, userId]);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.active?.postMessage({
          type: "CACHE_URL",
          url: window.location.href,
        }),
      )
      .catch(() => undefined);
  }, [pathname]);

  const value = useMemo(
    () => ({
      userId,
      online,
      pending,
      blocked,
      lastSyncedAt,
      submit,
      retry,
      syncNow,
      clearPrivateCache,
    }),
    [
      blocked,
      clearPrivateCache,
      lastSyncedAt,
      online,
      pending,
      retry,
      submit,
      syncNow,
      userId,
    ],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}
