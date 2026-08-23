export const offlineMutationTypes = [
  "account.create",
  "account.update",
  "account.adjustBalance",
  "account.archive",
  "account.deleteArchived",
  "transaction.create",
  "transaction.update",
  "transaction.delete",
  "transfer.create",
  "budget.save",
  "task.create",
  "task.update",
  "task.setStatus",
  "task.delete",
  "goal.create",
  "goal.update",
  "goal.updateProgress",
  "milestone.create",
  "milestone.toggle",
  "application.create",
  "application.update",
  "application.setStage",
  "debt.create",
  "debt.update",
  "debtPayment.create",
  "debtPayment.delete",
  "review.save",
] as const;

export type OfflineMutationType = (typeof offlineMutationTypes)[number];

export type OfflineActionState = {
  success: boolean;
  message: string;
  queued?: boolean;
};

export type QueuedMutation = {
  id: string;
  userId: string;
  type: OfflineMutationType;
  entries: Array<[string, string]>;
  createdAt: string;
  attempts: number;
  blocked: boolean;
  lastError?: string;
};

export type SyncMutationResult = {
  id: string;
  success: boolean;
  message: string;
  retryable?: boolean;
};

export type SyncResponse = {
  results: SyncMutationResult[];
};
