"use client";

import type {
  OfflineActionState,
  OfflineMutationType,
  QueuedMutation,
  SyncResponse,
} from "@/lib/offline/types";

const databaseName = "project-atlas-offline";
const databaseVersion = 1;
const mutationStore = "mutations";
const queueChangeEvent = "atlas:offline-queue-change";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(mutationStore)) {
        const store = database.createObjectStore(mutationStore, {
          keyPath: "id",
        });
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta", { keyPath: "key" });
      }
    };
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(mutationStore, mode);
    const completion = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    const result = await requestResult(
      run(transaction.objectStore(mutationStore)),
    );
    await completion;
    return result;
  } finally {
    database.close();
  }
}

function announceQueueChange() {
  window.dispatchEvent(new Event(queueChangeEvent));
}

function formEntries(formData: FormData) {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      throw new Error("File uploads cannot be saved offline yet.");
    }
    entries.push([key, value]);
  }
  return entries;
}

export async function createQueuedMutation(
  userId: string,
  type: OfflineMutationType,
  formData: FormData,
) {
  const id = crypto.randomUUID();
  const queuedFormData = new FormData();
  for (const [key, value] of formData.entries())
    queuedFormData.append(key, value);
  queuedFormData.set("offlineMutationId", id);
  queuedFormData.set("offlineEntityId", id);

  const mutation: QueuedMutation = {
    id,
    userId,
    type,
    entries: formEntries(queuedFormData),
    createdAt: new Date().toISOString(),
    attempts: 0,
    blocked: false,
  };
  await withStore("readwrite", (store) => store.add(mutation));
  announceQueueChange();
  return mutation;
}

export async function deleteQueuedMutation(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
  announceQueueChange();
}

export async function updateQueuedMutation(mutation: QueuedMutation) {
  await withStore("readwrite", (store) => store.put(mutation));
  announceQueueChange();
}

export async function getQueueCounts(userId: string) {
  const mutations = await withStore("readonly", (store) =>
    store.index("userId").getAll(userId),
  );
  return {
    pending: mutations.length,
    blocked: mutations.filter((mutation) => mutation.blocked).length,
  };
}

export async function retryBlockedMutations(userId: string) {
  const mutations = await withStore("readonly", (store) =>
    store.index("userId").getAll(userId),
  );
  await Promise.all(
    mutations
      .filter((mutation) => mutation.blocked)
      .map((mutation) =>
        updateQueuedMutation({
          ...mutation,
          blocked: false,
          lastError: undefined,
        }),
      ),
  );
}

async function sendMutation(mutation: QueuedMutation) {
  const response = await fetch("/api/offline-sync", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [mutation] }),
  });

  if (response.status === 401) {
    return {
      success: true,
      message: "Saved on this device. Sign in again to finish syncing.",
      queued: true,
    } satisfies OfflineActionState;
  }
  if (!response.ok)
    throw new Error("The sync service is temporarily unavailable.");

  const body = (await response.json()) as SyncResponse;
  const result = body.results[0];
  if (!result) throw new Error("The sync service returned an empty response.");

  if (result.success) {
    await deleteQueuedMutation(mutation.id);
    return { success: true, message: result.message, queued: false };
  }

  await updateQueuedMutation({
    ...mutation,
    attempts: mutation.attempts + 1,
    blocked: result.retryable === false,
    lastError: result.message,
  });
  return {
    success: false,
    message: result.message,
    queued: true,
  } satisfies OfflineActionState;
}

export async function submitOfflineMutation(
  userId: string,
  type: OfflineMutationType,
  formData: FormData,
) {
  let mutation: QueuedMutation;
  try {
    mutation = await createQueuedMutation(userId, type, formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "This change could not be saved on the device.",
    } satisfies OfflineActionState;
  }

  if (!navigator.onLine) {
    await requestBackgroundSync();
    return {
      success: true,
      message: "Saved offline. ATLAS will sync it when you are back online.",
      queued: true,
    } satisfies OfflineActionState;
  }

  try {
    return await sendMutation(mutation);
  } catch {
    await requestBackgroundSync();
    return {
      success: true,
      message: "Saved on this device. ATLAS will keep trying to sync it.",
      queued: true,
    } satisfies OfflineActionState;
  }
}

export async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };
    if (syncRegistration.sync) {
      await syncRegistration.sync.register("atlas-offline-sync");
    }
    registration.active?.postMessage({ type: "SYNC_NOW" });
  } catch {
    // The online event will retry when service workers or Background Sync recover.
  }
}

export { queueChangeEvent };
