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
  it("prefills a unique cash account and Health for medicine without requiring a merchant", async () => {
    mocks.interpret.mockResolvedValue({
      message: "Review fields.",
      previewId: "preview-money",
      proposal: {
        kind: "expense",
        confidence: "high",
        amountText: "60",
        amount: "60.00",
        currency: "PHP",
        dateText: "today",
        date: "2026-09-24",
        dateRole: "transaction",
        title: null,
        description: "medicine",
        accountText: "cash",
        accountHint: "cash",
        merchantOrSource: null,
        categorySuggestion: "Medicine",
        companyName: null,
        roleTitle: null,
        notes: null,
        ambiguities: [],
        warnings: [],
      },
    });
    render(
      <CaptureWorkspace
        accounts={[
          { id: "cash-id", name: "Wallet", account_type: "cash" },
          { id: "bank-id", name: "Bank", account_type: "bank" },
        ]}
        categories={[
          { id: "health-id", name: "Health", category_type: "expense" },
          { id: "food-id", name: "Food", category_type: "expense" },
        ]}
        models={models}
        defaultModel={defaultModel}
      />,
    );
    fireEvent.change(screen.getByLabelText("One thing to capture"), {
      target: { value: "I paid 60 for medicine using cash today" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview capture" }));
    await screen.findByRole("region", { name: "Capture preview" });
    expect(screen.getByLabelText("Account")).toHaveValue("cash-id");
    expect(screen.getByLabelText("Category")).toHaveValue("health-id");
    expect(
      screen.getByLabelText("Merchant or source (optional)"),
    ).not.toBeRequired();
  });

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
