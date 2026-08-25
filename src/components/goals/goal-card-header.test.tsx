import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import type {
  OfflineActionState,
  OfflineMutationType,
} from "@/lib/offline/types";
import { renderWithProviders as render } from "@/test/render";
import { GoalCardHeader } from "./goal-card-header";

const goal = {
  id: "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
  title: "Launch portfolio",
  description: "Publish three case studies",
  area: "career",
  status: "active",
  target_date: "2026-09-30",
  success_definition: "Portfolio is live",
};

afterEach(cleanup);

describe("GoalCardHeader", () => {
  it("groups edit and delete behind an accessible goal action menu", () => {
    render(<GoalCardHeader goal={goal} />);

    expect(
      screen.queryByRole("button", { name: "Edit Launch portfolio" }),
    ).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", {
      name: "Open actions for goal Launch portfolio",
    });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu", {
      name: "Actions for goal Launch portfolio",
    });
    expect(menu).toBeVisible();
    const editItem = screen.getByRole("menuitem", { name: "Edit goal" });
    const deleteItem = screen.getByRole("menuitem", { name: "Delete goal" });
    expect(editItem).toHaveFocus();
    expect(deleteItem).toBeVisible();

    fireEvent.keyDown(editItem, { key: "ArrowDown" });
    expect(deleteItem).toHaveFocus();
    fireEvent.click(editItem);

    expect(screen.getByLabelText("Goal title")).toHaveValue("Launch portfolio");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Close editor" }));
    expect(screen.queryByLabelText("Goal title")).not.toBeInTheDocument();
  });

  it("confirms deletion and spins the ATLAS mark while deleting", async () => {
    const user = userEvent.setup();
    let resolveSubmit:
      ((value: { success: boolean; message: string }) => void) | undefined;
    const submit = vi
      .fn<
        (
          type: OfflineMutationType,
          formData: FormData,
        ) => Promise<OfflineActionState>
      >()
      .mockImplementation(
        () =>
          new Promise<{ success: boolean; message: string }>((resolve) => {
            resolveSubmit = resolve;
          }),
      );

    render(
      <OfflineContext.Provider
        value={{
          userId: "10000000-0000-4000-8000-000000000001",
          online: true,
          pending: 0,
          blocked: 0,
          lastSyncedAt: null,
          submit,
          retry: vi.fn(),
          syncNow: vi.fn(),
          clearPrivateCache: vi.fn(),
        }}
      >
        <GoalCardHeader goal={goal} />
      </OfflineContext.Provider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Open actions for goal Launch portfolio",
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete goal" }));

    const dialog = screen.getByRole("dialog", { name: "Delete goal?" });
    expect(dialog).toHaveTextContent("milestones will also be deleted");
    expect(dialog).toHaveTextContent("Related tasks will stay");
    await user.click(
      screen.getByRole("button", { name: "Delete Launch portfolio" }),
    );

    const pendingButton = screen.getByRole("button", {
      name: "Deleting Launch portfolio",
    });
    const logo = pendingButton.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");
    expect(submit).toHaveBeenCalledWith("goal.delete", expect.any(FormData));
    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("goalId")).toBe(
      "2d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    );

    await act(async () => {
      resolveSubmit?.({
        success: false,
        message: "The goal could not be deleted.",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Delete Launch portfolio" }),
      ).toBeEnabled();
    });
  });
});
