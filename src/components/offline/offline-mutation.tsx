"use client";

import { useActionState, useCallback, useContext } from "react";
import { toast } from "sonner";
import { OfflineContext } from "@/components/offline/offline-provider";
import type {
  OfflineActionState,
  OfflineMutationType,
} from "@/lib/offline/types";

export function useOfflineSync() {
  const context = useContext(OfflineContext);
  return (
    context ?? {
      userId: "",
      online: true,
      pending: 0,
      blocked: 0,
      lastSyncedAt: null,
      submit: async () => ({
        success: false,
        message: "Offline sync is unavailable outside the signed-in app.",
      }),
      retry: async () => undefined,
      syncNow: async () => undefined,
      clearPrivateCache: async () => undefined,
    }
  );
}

export function useOfflineActionState(
  mutation: OfflineMutationType,
  initialState: OfflineActionState,
) {
  const { submit } = useOfflineSync();
  const action = useCallback(
    async (_state: OfflineActionState, formData: FormData) =>
      submit(mutation, formData),
    [mutation, submit],
  );
  return useActionState(action, initialState);
}

export function OfflineMutationForm({
  mutation,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "action"> & {
  mutation: OfflineMutationType;
}) {
  const { submit } = useOfflineSync();
  const action = useCallback(
    async (formData: FormData) => {
      const result = await submit(mutation, formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    },
    [mutation, submit],
  );

  return (
    <form action={action} {...props}>
      {children}
    </form>
  );
}
