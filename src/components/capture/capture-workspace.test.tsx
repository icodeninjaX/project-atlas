import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaptureWorkspace } from "./capture-workspace";

const mocks = vi.hoisted(() => ({ interpret: vi.fn(), confirm: vi.fn() }));
const defaultModel = "gpt-4o-mini-2024-07-18";
const models = [
  { id: defaultModel, label: "GPT-4o mini", pool: "2.5M" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", pool: "2.5M" },
];
vi.mock("@/lib/capture/actions", () => ({
  interpretCaptureAction: mocks.interpret,
  confirmCaptureAction: mocks.confirm,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CaptureWorkspace", () => {
  it("cancels a preview without saving", async () => {
    mocks.interpret.mockResolvedValue({
      message: "Review fields.",
      previewId: "preview-1",
      proposal: {
        kind: "task",
        confidence: "high",
        amount: null,
        currency: null,
        dateText: null,
        date: null,
        dateRole: null,
        title: "Call Alex",
        description: null,
        merchantOrSource: null,
        categorySuggestion: null,
        companyName: null,
        roleTitle: null,
        notes: null,
        ambiguities: [],
        warnings: [],
      },
    });
    render(
      <CaptureWorkspace
        accounts={[]}
        categories={[]}
        models={models}
        defaultModel={defaultModel}
      />,
    );
    fireEvent.change(screen.getByLabelText("One thing to capture"), {
      target: { value: "Call Alex tomorrow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview capture" }));
    await screen.findByRole("region", { name: "Capture preview" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Capture preview" }),
      ).not.toBeInTheDocument(),
    );
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("submits the chosen model and dismisses a stale preview when it changes", async () => {
    mocks.interpret.mockResolvedValue({
      message: "Review fields.",
      previewId: "preview-2",
      proposal: {
        kind: "task",
        confidence: "high",
        amount: null,
        currency: null,
        dateText: null,
        date: null,
        dateRole: null,
        title: "Call Alex",
        description: null,
        merchantOrSource: null,
        categorySuggestion: null,
        companyName: null,
        roleTitle: null,
        notes: null,
        ambiguities: [],
        warnings: [],
      },
    });
    render(
      <CaptureWorkspace
        accounts={[]}
        categories={[]}
        models={models}
        defaultModel={defaultModel}
      />,
    );
    fireEvent.change(screen.getByLabelText("AI model"), {
      target: { value: "gpt-5.4-mini" },
    });
    fireEvent.change(screen.getByLabelText("One thing to capture"), {
      target: { value: "Call Alex tomorrow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview capture" }));
    await screen.findByRole("region", { name: "Capture preview" });
    expect((mocks.interpret.mock.calls[0]?.[1] as FormData).get("model")).toBe(
      "gpt-5.4-mini",
    );
    fireEvent.change(screen.getByLabelText("AI model"), {
      target: { value: "gpt-4o-mini-2024-07-18" },
    });
    expect(
      screen.queryByRole("region", { name: "Capture preview" }),
    ).not.toBeInTheDocument();
  });
});
