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
    const actionsTrigger = screen.getByRole("button", {
      name: "Open milestone actions",
    });
    expect(actionsTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Plan the route")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New milestone")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByText("Plan the route")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(screen.queryByText("Plan the route")).not.toBeInTheDocument();

    fireEvent.click(actionsTrigger);
    const actionsMenu = screen.getByRole("menu", {
      name: "Milestone actions",
    });
    expect(actionsMenu).toBeVisible();
    const addItem = screen.getByRole("menuitem", { name: "Add milestone" });
    expect(addItem).toHaveFocus();
    expect(
      screen.getByRole("menuitem", { name: "Edit milestones" }),
    ).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Remove milestones" }),
    ).toBeVisible();
    fireEvent.click(addItem);

    expect(screen.getByLabelText("New milestone")).toBeVisible();
    expect(actionsTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("New milestone")).not.toBeInTheDocument();
  });

  it("opens learning notes when the milestone title is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MilestoneList
        goalId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        milestones={[
          {
            id: "53f3368c-d188-4aef-82b3-2846ba974169",
            title: "Cost of Inaction",
            description:
              "The consequences of leaving a prospect's problem unsolved.",
            target_date: null,
            completed_at: null,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View" }));
    expect(screen.queryByText("Add learning notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Open learning notes")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open milestone Cost of Inaction" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Milestone details" }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", {
        name: "Description or learning notes",
      }),
    ).toHaveValue("The consequences of leaving a prospect's problem unsolved.");
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

  it("shows the spinning ATLAS mark while adding a milestone", async () => {
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
          milestones={[]}
        />
      </OfflineContext.Provider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Open milestone actions" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Add milestone" }));
    await user.type(screen.getByLabelText("New milestone"), "Book lodging");
    await user.click(screen.getByRole("button", { name: "Add milestone" }));

    const pendingButton = screen.getByRole("button", {
      name: "Adding milestone",
    });
    const logo = container.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");
    expect(submit).toHaveBeenCalledWith(
      "milestone.create",
      expect.any(FormData),
    );

    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("goalId")).toBe(
      "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    );
    expect(submittedForm.get("title")).toBe("Book lodging");

    await act(async () => {
      resolveSubmit?.({
        success: false,
        message: "The milestone could not be added.",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Add milestone" }),
      ).toBeEnabled();
    });
  });

  it("reveals row edit buttons only while edit mode is active", async () => {
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
    expect(
      screen.queryByRole("button", {
        name: "Edit milestone Plan the route",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Remove milestone Plan the route",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Open actions for milestone Plan the route",
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Open milestone actions" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Edit milestones" }));

    expect(screen.getByText("Editing")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Edit milestone Plan the route" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Remove milestone Plan the route",
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Edit milestone Plan the route" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Milestone details" }),
    ).toBeVisible();
    const title = screen.getByRole("textbox", { name: "Title" });
    expect(title).toHaveValue("Plan the route");
    const description = screen.getByRole("textbox", {
      name: "Description or learning notes",
    });
    expect(description).toHaveValue("");
    expect(screen.getByLabelText("Target date")).toHaveValue("2026-09-01");
    await user.clear(title);
    await user.type(title, "Confirm the route");
    await user.type(
      description,
      "Learn the tradeoffs before choosing a route.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save changes to Plan the route" }),
    );

    const pendingButton = screen.getByRole("button", {
      name: "Saving changes to Plan the route",
    });
    const logo = pendingButton.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");
    expect(submit).toHaveBeenCalledWith(
      "milestone.update",
      expect.any(FormData),
    );
    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("milestoneId")).toBe(
      "53f3368c-d188-4aef-82b3-2846ba974169",
    );
    expect(submittedForm.get("title")).toBe("Confirm the route");
    expect(submittedForm.get("description")).toBe(
      "Learn the tradeoffs before choosing a route.",
    );
    expect(submittedForm.get("targetDate")).toBe("2026-09-01");

    await act(async () => {
      resolveSubmit?.({
        success: false,
        message: "The milestone could not be updated.",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Save changes to Plan the route",
        }),
      ).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(
      screen.getByRole("button", { name: "Open milestone actions" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Finish editing" }));
    expect(
      screen.queryByRole("button", {
        name: "Edit milestone Plan the route",
      }),
    ).not.toBeInTheDocument();
  });

  it("confirms removal and spins the ATLAS mark while deleting", async () => {
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
      screen.getByRole("button", { name: "Open milestone actions" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Remove milestones" }),
    );

    expect(screen.getByText("Removing")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Remove milestone Plan the route",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Edit milestone Plan the route" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Remove milestone Plan the route",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Remove milestone?" });
    expect(dialog).toHaveTextContent("this cannot be undone");
    await user.click(
      screen.getByRole("button", { name: "Remove Plan the route" }),
    );

    const pendingButton = screen.getByRole("button", {
      name: "Removing Plan the route",
    });
    const logo = pendingButton.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");
    expect(submit).toHaveBeenCalledWith(
      "milestone.delete",
      expect.any(FormData),
    );
    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("milestoneId")).toBe(
      "53f3368c-d188-4aef-82b3-2846ba974169",
    );

    await act(async () => {
      resolveSubmit?.({ success: true, message: "Milestone removed." });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Remove milestone?" }),
      ).not.toBeInTheDocument();
    });
  });
});
