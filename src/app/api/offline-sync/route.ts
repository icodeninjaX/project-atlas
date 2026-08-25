import { NextResponse, type NextRequest } from "next/server";
import { saveBudgetAction } from "@/lib/budgets/actions";
import {
  createApplicationAction,
  updateApplicationAction,
  updateApplicationStageAction,
} from "@/lib/career/actions";
import {
  createDebtAction,
  deleteDebtPaymentAction,
  recordDebtPaymentAction,
  updateDebtAction,
} from "@/lib/debts/actions";
import {
  createGoalAction,
  createMilestoneAction,
  deleteGoalAction,
  deleteMilestoneAction,
  toggleMilestoneAction,
  updateGoalAction,
  updateGoalProgressAction,
  updateMilestoneAction,
} from "@/lib/goals/actions";
import {
  adjustAccountBalanceAction,
  archiveAccountAction,
  createAccountAction,
  createTransactionAction,
  createTransferAction,
  deleteArchivedAccountAction,
  deleteTransactionAction,
  updateAccountAction,
  updateTransactionAction,
} from "@/lib/money/actions";
import {
  offlineMutationTypes,
  type OfflineActionState,
  type OfflineMutationType,
  type QueuedMutation,
  type SyncMutationResult,
} from "@/lib/offline/types";
import { saveWeeklyReviewAction } from "@/lib/reviews/actions";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskAction,
  deleteTaskAction,
  setTaskStatusAction,
  updateTaskAction,
} from "@/lib/tasks/actions";

export const runtime = "nodejs";

const mutationTypeSet = new Set<string>(offlineMutationTypes);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const blankState: OfflineActionState = { success: false, message: "" };

type Receipt = {
  mutation_id: string;
  status: "processing" | "succeeded" | "failed";
  result_message: string | null;
  updated_at: string;
};

function validMutation(value: unknown): value is QueuedMutation {
  if (!value || typeof value !== "object") return false;
  const mutation = value as Partial<QueuedMutation>;
  return (
    typeof mutation.id === "string" &&
    uuidPattern.test(mutation.id) &&
    typeof mutation.userId === "string" &&
    uuidPattern.test(mutation.userId) &&
    typeof mutation.type === "string" &&
    mutationTypeSet.has(mutation.type) &&
    Array.isArray(mutation.entries) &&
    mutation.entries.length <= 100 &&
    mutation.entries.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[0].length <= 100 &&
        entry[1].length <= 20_000,
    )
  );
}

function toFormData(mutation: QueuedMutation) {
  const formData = new FormData();
  for (const [key, value] of mutation.entries) formData.append(key, value);
  formData.set("offlineMutationId", mutation.id);
  formData.set("offlineEntityId", mutation.id);
  return formData;
}

async function executeMutation(
  type: OfflineMutationType,
  formData: FormData,
): Promise<OfflineActionState> {
  switch (type) {
    case "account.create":
      return createAccountAction(blankState, formData);
    case "account.update":
      return updateAccountAction(blankState, formData);
    case "account.adjustBalance":
      return adjustAccountBalanceAction(blankState, formData);
    case "account.archive":
      return archiveAccountAction(formData);
    case "account.deleteArchived":
      return deleteArchivedAccountAction(blankState, formData);
    case "transaction.create":
      return createTransactionAction(blankState, formData);
    case "transaction.update":
      return updateTransactionAction(blankState, formData);
    case "transaction.delete":
      return deleteTransactionAction(formData);
    case "transfer.create":
      return createTransferAction(blankState, formData);
    case "budget.save":
      return saveBudgetAction(blankState, formData);
    case "task.create":
      return createTaskAction(blankState, formData);
    case "task.update":
      return updateTaskAction(formData);
    case "task.setStatus":
      return setTaskStatusAction(formData);
    case "task.delete":
      return deleteTaskAction(formData);
    case "goal.create":
      return createGoalAction(blankState, formData);
    case "goal.update":
      return updateGoalAction(blankState, formData);
    case "goal.delete":
      return deleteGoalAction(formData);
    case "goal.updateProgress":
      return updateGoalProgressAction(formData);
    case "milestone.create":
      return createMilestoneAction(formData);
    case "milestone.update":
      return updateMilestoneAction(formData);
    case "milestone.toggle":
      return toggleMilestoneAction(formData);
    case "milestone.delete":
      return deleteMilestoneAction(formData);
    case "application.create":
      return createApplicationAction(blankState, formData);
    case "application.update":
      return updateApplicationAction(blankState, formData);
    case "application.setStage":
      return updateApplicationStageAction(
        String(formData.get("applicationId") ?? ""),
        String(formData.get("stage") ?? ""),
      );
    case "debt.create":
      return createDebtAction(blankState, formData);
    case "debt.update":
      return updateDebtAction(blankState, formData);
    case "debtPayment.create":
      return recordDebtPaymentAction(blankState, formData);
    case "debtPayment.delete":
      return deleteDebtPaymentAction(formData);
    case "review.save":
      return saveWeeklyReviewAction(blankState, formData);
  }
}

async function existingCreateWasApplied(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  mutation: QueuedMutation,
) {
  const tables: Partial<Record<OfflineMutationType, string>> = {
    "account.create": "financial_accounts",
    "transaction.create": "transactions",
    "transfer.create": "account_transfers",
    "task.create": "tasks",
    "goal.create": "goals",
    "milestone.create": "goal_milestones",
    "application.create": "job_applications",
    "debt.create": "debts",
    "debtPayment.create": "debt_payments",
  };
  const table = tables[mutation.type];
  if (!table) return false;
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", mutation.id)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function processMutation(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  mutation: QueuedMutation,
): Promise<SyncMutationResult> {
  const { data: current } = await supabase
    .from("offline_mutation_receipts")
    .select("mutation_id,status,result_message,updated_at")
    .eq("user_id", userId)
    .eq("mutation_id", mutation.id)
    .maybeSingle<Receipt>();

  if (current?.status === "succeeded") {
    return {
      id: mutation.id,
      success: true,
      message: current.result_message || "Change synced.",
    };
  }

  if (current?.status === "processing") {
    const age = Date.now() - new Date(current.updated_at).getTime();
    if (Number.isFinite(age) && age < 120_000) {
      return {
        id: mutation.id,
        success: false,
        message: "This change is already syncing.",
        retryable: true,
      };
    }
  }

  const claim = {
    user_id: userId,
    mutation_id: mutation.id,
    mutation_type: mutation.type,
    status: "processing",
    result_message: null,
    updated_at: new Date().toISOString(),
  };
  const { error: claimError } = current
    ? await supabase
        .from("offline_mutation_receipts")
        .update(claim)
        .eq("user_id", userId)
        .eq("mutation_id", mutation.id)
    : await supabase.from("offline_mutation_receipts").insert(claim);
  if (claimError) {
    return {
      id: mutation.id,
      success: false,
      message: "ATLAS could not reserve this change for syncing.",
      retryable: true,
    };
  }

  let result: OfflineActionState;
  try {
    if (await existingCreateWasApplied(supabase, userId, mutation)) {
      result = { success: true, message: "Change synced." };
    } else {
      result = await executeMutation(mutation.type, toFormData(mutation));
    }
  } catch {
    result = {
      success: false,
      message: "The server could not apply this change yet.",
    };
  }

  await supabase
    .from("offline_mutation_receipts")
    .update({
      status: result.success ? "succeeded" : "failed",
      result_message: result.message,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("mutation_id", mutation.id);

  return {
    id: mutation.id,
    success: result.success,
    message:
      result.message || (result.success ? "Change synced." : "Sync failed."),
    retryable: result.success ? undefined : false,
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    (origin && origin !== request.nextUrl.origin) ||
    fetchSite === "cross-site"
  ) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "JSON is required." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 512_000) {
    return NextResponse.json(
      { error: "Sync batch is too large." },
      { status: 413 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 503 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { mutations?: unknown[] };
  try {
    body = (await request.json()) as { mutations?: unknown[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.mutations) || body.mutations.length > 25) {
    return NextResponse.json({ error: "Invalid sync batch." }, { status: 400 });
  }

  const mutations = body.mutations.filter(validMutation);
  if (
    mutations.length !== body.mutations.length ||
    mutations.some((mutation) => mutation.userId !== user.id)
  ) {
    return NextResponse.json({ error: "Invalid mutation." }, { status: 400 });
  }

  const results: SyncMutationResult[] = [];
  for (const mutation of mutations) {
    results.push(await processMutation(supabase, user.id, mutation));
  }
  return NextResponse.json({ results });
}
