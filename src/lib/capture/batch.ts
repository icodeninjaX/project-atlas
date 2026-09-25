import { z } from "zod";
import {
  captureJsonSchema,
  modelCaptureSchema,
  prepareCaptureProposal,
  type CaptureProposal,
} from "./proposal";

export const captureBatchInputSchema = z.string().trim().min(8).max(1000);

const modelItemSchema = z.strictObject({
  sourcePhrase: z.string().min(1).max(500),
  operation: z.enum(["create", "reschedule_task"]),
  targetText: z.string().trim().max(160).nullable(),
  proposal: modelCaptureSchema,
});

export const modelBatchSchema = z.strictObject({
  items: z.array(modelItemSchema).min(1).max(5),
});

export const captureBatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourcePhrase", "operation", "targetText", "proposal"],
        properties: {
          sourcePhrase: { type: "string" },
          operation: { type: "string", enum: ["create", "reschedule_task"] },
          targetText: { type: ["string", "null"] },
          proposal: captureJsonSchema,
        },
      },
    },
  },
} as const;

export type BatchOperation = "create" | "reschedule_task";
export type TaskCandidate = {
  id: string;
  title: string;
  updatedAt: string;
  scheduledFor: string | null;
};
export type BatchCaptureItem = {
  id: string | null;
  sourcePhrase: string;
  operation: BatchOperation;
  proposal: CaptureProposal;
  candidates: TaskCandidate[];
  targetId: string | null;
  targetUpdatedAt: string | null;
};

export function prepareCaptureBatch(
  text: string,
  raw: unknown,
  today?: string,
) {
  const batch = modelBatchSchema.parse(raw);
  const used: Array<[number, number]> = [];
  return batch.items.map((item) => {
    const start = text.indexOf(item.sourcePhrase);
    const end = start + item.sourcePhrase.length;
    if (start < 0 || used.some(([a, b]) => start < b && end > a)) {
      throw new Error(
        "Capture source phrases must be distinct spans of the input.",
      );
    }
    used.push([start, end]);
    if (
      item.operation === "reschedule_task" &&
      (item.proposal.kind !== "task" ||
        !item.targetText ||
        !item.sourcePhrase
          .toLowerCase()
          .includes(item.targetText.toLowerCase()))
    ) {
      throw new Error("A task reschedule needs a stated task reference.");
    }
    const proposal = prepareCaptureProposal(
      item.sourcePhrase,
      item.proposal,
      today,
    );
    if (item.operation === "reschedule_task" && !proposal.date) {
      proposal.warnings.push("Choose the new scheduled date before saving.");
    }
    return {
      sourcePhrase: item.sourcePhrase,
      operation: item.operation,
      targetText: item.targetText,
      proposal,
    };
  });
}

export function rankTaskCandidates(
  title: string,
  tasks: TaskCandidate[],
): TaskCandidate[] {
  const needle = title.trim().toLocaleLowerCase();
  if (needle.length < 3) return [];
  const exact = tasks.filter(
    (task) => task.title.toLocaleLowerCase() === needle,
  );
  if (exact.length) return exact.slice(0, 5);
  return tasks
    .filter((task) => task.title.toLocaleLowerCase().includes(needle))
    .slice(0, 5);
}
