import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmCaptureBatchItemAction,
  interpretCaptureBatchAction,
  rejectCaptureBatchItemAction,
} from "./batch-actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  task: vi.fn(),
  reschedule: vi.fn(),
  transaction: vi.fn(),
  application: vi.fn(),
  knowledge: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/tasks/actions", () => ({
  createTaskAction: mocks.task,
  rescheduleTaskFromCaptureAction: mocks.reschedule,
}));
vi.mock("@/lib/money/actions", () => ({
  createTransactionAction: mocks.transaction,
}));
vi.mock("@/lib/career/actions", () => ({
  createApplicationAction: mocks.application,
}));
vi.mock("@/lib/knowledge/actions", () => ({
  createKnowledgeConceptAction: mocks.knowledge,
}));

const id = "c2100000-0000-4000-8000-000000000001";
const oldKey = process.env.OPENAI_API_KEY;
const oldFetch = globalThis.fetch;

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    kind: "task",
    confidence: "high",
    amountText: null,
    currency: null,
    dateText: "tomorrow",
    date: "2026-09-26",
    dateRole: "scheduled",
    title: "Call Acme",
    description: null,
    accountText: null,
    merchantOrSource: null,
    categorySuggestion: null,
    companyName: null,
    roleTitle: null,
    notes: null,
    ambiguities: [],
    ...overrides,
  };
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "reserve_ai_capture_request")
      return { data: true, error: null };
    if (name === "finish_capture_preview") return { data: true, error: null };
    return { data: null, error: null };
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === "capture_batch_previews") return { insert: mocks.insert };
    throw new Error(`Unexpected table ${table}`);
  });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-a" } } }),
    },
    rpc: mocks.rpc,
    from: mocks.from,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = oldKey;
  globalThis.fetch = oldFetch;
  vi.restoreAllMocks();
});

describe("Capture 2.0 actions", () => {
  it("previews two independent records without invoking a domain mutation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      sourcePhrase: "Call Acme tomorrow",
                      operation: "create",
                      targetText: null,
                      proposal: proposal(),
                    },
                    {
                      sourcePhrase: "Learn loss aversion",
                      operation: "create",
                      targetText: null,
                      proposal: proposal({
                        kind: "knowledge_item",
                        title: "loss aversion",
                        dateText: null,
                        date: null,
                        dateRole: null,
                        notes: null,
                      }),
                    },
                  ],
                }),
              },
            },
          ],
        }),
      }),
    );
    const result = await interpretCaptureBatchAction(
      { message: "", batchId: null, items: [] },
      form({ text: "Call Acme tomorrow and Learn loss aversion" }),
    );
    expect(result.items).toHaveLength(2);
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject([
      { user_id: "owner-a", position: 0 },
      { user_id: "owner-a", position: 1 },
    ]);
    expect(mocks.task).not.toHaveBeenCalled();
    expect(mocks.knowledge).not.toHaveBeenCalled();
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.store).toBe(false);
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it("dispatches a claimed task to the existing mutation and records completion", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "claim_capture_preview"
        ? {
            data: { proposal: { proposal: proposal(), candidates: [] } },
            error: null,
          }
        : { data: true, error: null },
    );
    mocks.task.mockResolvedValue({ success: true, message: "Task added." });
    const result = await confirmCaptureBatchItemAction(
      form({
        previewId: id,
        operation: "create",
        kind: "task",
        title: "Call Acme after lunch",
      }),
    );
    expect(result.status).toBe("saved");
    expect(mocks.task).toHaveBeenCalledOnce();
    expect((mocks.task.mock.calls[0]?.[1] as FormData).get("title")).toBe(
      "Call Acme after lunch",
    );
    expect(mocks.rpc).toHaveBeenCalledWith("finish_capture_preview", {
      p_id: id,
      p_status: "saved",
      p_message: "Task added.",
    });
  });

  it("refuses a replay before any domain mutation", async () => {
    const result = await confirmCaptureBatchItemAction(
      form({
        previewId: id,
        operation: "create",
        kind: "task",
        title: "Call Acme",
      }),
    );
    expect(result.status).toBe("unavailable");
    expect(mocks.task).not.toHaveBeenCalled();
  });

  it("only reschedules a task in the server-bound candidate list", async () => {
    const candidate = {
      id: "c2300000-0000-4000-8000-000000000001",
      title: "Interview prep",
      updatedAt: "2026-09-25T00:00:00Z",
      scheduledFor: null,
    };
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "claim_capture_preview"
        ? {
            data: {
              proposal: { proposal: proposal(), candidates: [candidate] },
            },
            error: null,
          }
        : { data: true, error: null },
    );
    const foreign = await confirmCaptureBatchItemAction(
      form({
        previewId: id,
        operation: "reschedule_task",
        taskId: "c2300000-0000-4000-8000-000000000099",
        scheduledFor: "2026-09-26",
      }),
    );
    expect(foreign.status).toBe("failed");
    expect(mocks.reschedule).not.toHaveBeenCalled();
    mocks.reschedule.mockResolvedValue({
      success: true,
      message: "Task rescheduled.",
    });
    const good = await confirmCaptureBatchItemAction(
      form({
        previewId: id,
        operation: "reschedule_task",
        taskId: candidate.id,
        scheduledFor: "2026-09-26",
      }),
    );
    expect(good.status).toBe("saved");
    expect(mocks.reschedule).toHaveBeenCalledWith(
      candidate.id,
      candidate.updatedAt,
      "2026-09-26",
    );
  });

  it("rejects without invoking a domain mutation", async () => {
    const result = await rejectCaptureBatchItemAction(id);
    expect(result.status).toBe("rejected");
    expect(mocks.task).not.toHaveBeenCalled();
  });
});
