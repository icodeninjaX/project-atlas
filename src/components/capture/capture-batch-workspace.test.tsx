import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaptureBatchWorkspace } from "./capture-batch-workspace";

const mocks = vi.hoisted(() => ({
  interpret: vi.fn(),
  confirm: vi.fn(),
  reject: vi.fn(),
}));
vi.mock("@/lib/capture/batch-actions", () => ({
  interpretCaptureBatchAction: mocks.interpret,
  confirmCaptureBatchItemAction: mocks.confirm,
  rejectCaptureBatchItemAction: mocks.reject,
}));

function taskItem(id: string, phrase: string) {
  return {
    id,
    sourcePhrase: phrase,
    operation: "create" as const,
    candidates: [],
    targetId: null,
    targetUpdatedAt: null,
    proposal: {
      kind: "task" as const,
      confidence: "high" as const,
      amountText: null,
      amount: null,
      currency: null,
      dateText: "tomorrow",
      date: "2026-09-26",
      dateRole: "scheduled" as const,
      title: phrase,
      description: null,
      accountText: null,
      accountHint: null,
      merchantOrSource: null,
      categorySuggestion: null,
      companyName: null,
      roleTitle: null,
      notes: null,
      ambiguities: [],
      warnings: [],
    },
  };
}

async function preview() {
  mocks.interpret.mockResolvedValue({
    message: "Review each action.",
    batchId: "batch-1",
    items: [
      taskItem("card-1", "Call Acme"),
      taskItem("card-2", "Review portfolio"),
    ],
  });
  render(
    <CaptureBatchWorkspace
      accounts={[]}
      categories={[]}
      models={[{ id: "model-1", label: "Model", pool: "small" }]}
      defaultModel="model-1"
    />,
  );
  fireEvent.change(screen.getByLabelText("What happened?"), {
    target: { value: "Call Acme and review portfolio tomorrow" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview actions" }));
  await screen.findByRole("heading", { name: "Review all 2 proposals" });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Capture 2.0 review", () => {
  it("requires a named choice for ambiguous existing tasks", async () => {
    mocks.interpret.mockResolvedValue({
      message: "Review.",
      batchId: "batch-ambiguous",
      items: [
        {
          ...taskItem("card-ambiguous", "Move interview prep tomorrow"),
          operation: "reschedule_task",
          targetId: null,
          candidates: [
            {
              id: "task-a",
              title: "Interview prep",
              updatedAt: "a",
              scheduledFor: null,
            },
            {
              id: "task-b",
              title: "Interview prep",
              updatedAt: "b",
              scheduledFor: null,
            },
          ],
        },
      ],
    });
    render(
      <CaptureBatchWorkspace
        accounts={[]}
        categories={[]}
        models={[{ id: "model-1", label: "Model", pool: "small" }]}
        defaultModel="model-1"
      />,
    );
    fireEvent.change(screen.getByLabelText("What happened?"), {
      target: { value: "Move interview prep tomorrow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview actions" }));
    await screen.findByRole("heading", { name: "Review all 1 proposals" });
    expect(screen.getByRole("combobox", { name: "Task" })).toHaveValue("");
    expect(
      screen.getAllByRole("option", { name: "Interview prep" }),
    ).toHaveLength(2);
  });

  it("stops confirm-all at a failure and leaves later cards unsaved", async () => {
    await preview();
    mocks.confirm.mockResolvedValue({
      success: false,
      status: "failed",
      message: "Could not save.",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm all 2 remaining" }),
    );
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledOnce());
    expect(screen.getByText(/Later cards remain unsaved/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Confirm this action" }),
    ).toHaveLength(1);
    expect(screen.getByText(/Not saved: Could not save/)).toBeInTheDocument();
  });

  it("recovers the review controls after a connection failure", async () => {
    await preview();
    mocks.confirm.mockRejectedValue(new Error("connection lost"));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm all 2 remaining" }),
    );
    expect(
      await screen.findByText(/Connection interrupted/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm all 2 remaining" }),
    ).toBeEnabled();
  });

  it("rejects an individual card without calling the save action", async () => {
    await preview();
    mocks.reject.mockResolvedValue({
      success: true,
      status: "rejected",
      message: "Nothing saved.",
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[0]!);
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith("card-1"));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Rejected: Nothing saved/)).toBeInTheDocument();
  });
});
