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
import { MilestoneList } from "./milestone-list";

afterEach(cleanup);

describe("MilestoneList", () => {
  it("keeps milestone details and creation controls collapsed by default", () => {
    render(
      <MilestoneList
        goalId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        milestones={[
          {
            id: "53f3368c-d188-4aef-82b3-2846ba974169",
            title: "Plan the route",
            target_date: "2026-09-01",
            completed_at: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Add milestone" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Plan the route")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New milestone")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByText("Plan the route")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(screen.queryByText("Plan the route")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add milestone" }));

    expect(screen.getByLabelText("New milestone")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel adding milestone" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel adding milestone" }),
    );

    expect(screen.queryByLabelText("New milestone")).not.toBeInTheDocument();
  });

  it("shows the spinning ATLAS mark while completing a milestone", async () => {
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

    const { container } = render(
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
        <MilestoneList
          goalId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
          milestones={[
            {
              id: "53f3368c-d188-4aef-82b3-2846ba974169",
              title: "Plan the route",
              target_date: "2026-09-01",
              completed_at: null,
            },
          ]}
        />
      </OfflineContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: "View" }));
    await user.click(
      screen.getByRole("button", {
        name: "Complete milestone Plan the route",
      }),
    );

    const pendingButton = screen.getByRole("button", {
      name: "Completing milestone Plan the route",
    });
    const logo = container.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");
    expect(submit).toHaveBeenCalledWith(
      "milestone.toggle",
      expect.any(FormData),
    );

    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("milestoneId")).toBe(
      "53f3368c-d188-4aef-82b3-2846ba974169",
    );
    expect(submittedForm.get("completed")).toBe("true");

    await act(async () => {
      resolveSubmit?.({
        success: false,
        message: "The milestone could not be updated.",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Complete milestone Plan the route",
        }),
      ).toBeEnabled();
    });
  });
});
