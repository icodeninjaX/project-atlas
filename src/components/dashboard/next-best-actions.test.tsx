import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextBestAction } from "@/lib/next-best-action/engine";
import { NextBestActions } from "./next-best-actions";

const choose = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/next-best-action/actions", () => ({
  chooseCareerFollowupAction: (...args: unknown[]) => choose(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const action: NextBestAction = {
  id: "b1100000-0000-4000-8000-000000000001",
  title: "Email hiring manager",
  taskTitle: "Email hiring manager",
  sourceHref: "/career?highlight=b1100000-0000-4000-8000-000000000001",
  sourceLabel: "Acme",
  expectedAt: "2026-09-25T01:00:00Z",
  expectedUpdatedAt: "2026-09-24T01:00:00Z",
  reason: "Due today · Critical priority · 20 min estimated",
  urgency: "Due today",
  uncertainty: "Based on recorded details. Plans may have changed.",
  relatedGoals: [],
};

afterEach(() => {
  cleanup();
  choose.mockReset();
  refresh.mockReset();
});

describe("NextBestActions", () => {
  it("shows evidence and requires a separate task confirmation", async () => {
    const user = userEvent.setup();
    choose.mockResolvedValue({
      success: true,
      message: "Follow-up task created.",
    });
    render(<NextBestActions actions={[action]} />);

    expect(screen.getByText(action.reason)).toBeInTheDocument();
    expect(screen.getByText(/No known goal link/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Acme application" }),
    ).toHaveAttribute("href", action.sourceHref);
    await user.click(
      screen.getByRole("button", { name: "Review task proposal" }),
    );
    expect(choose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(choose).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Review task proposal" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm and create task" }),
    );
    expect(choose).toHaveBeenCalledWith(
      action.id,
      action.expectedAt,
      action.expectedUpdatedAt,
      "confirmed",
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Follow-up task created.",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("dismisses without creating a task", async () => {
    const user = userEvent.setup();
    choose.mockResolvedValue({
      success: true,
      message: "Recommendation dismissed.",
    });
    render(<NextBestActions actions={[action]} />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(choose).toHaveBeenCalledWith(
      action.id,
      action.expectedAt,
      action.expectedUpdatedAt,
      "dismissed",
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Recommendation dismissed.",
    );
    expect(screen.queryByText(action.reason)).not.toBeInTheDocument();
  });
});
