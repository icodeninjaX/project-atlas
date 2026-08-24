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
import { TaskStatusForm } from "./task-status-form";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

afterEach(() => {
  cleanup();
  mocks.refresh.mockClear();
  vi.useRealTimers();
});

describe("TaskStatusForm", () => {
  it("shows the spinning ATLAS mark while completing a task", async () => {
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
        <TaskStatusForm
          taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
          title="Write proposal"
          completed={false}
        />
      </OfflineContext.Provider>,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Complete Write proposal" }),
    );

    const pendingButton = screen.getByRole("button", {
      name: "Completing Write proposal",
    });
    const logo = container.querySelector(
      'img[src="/brand/atlas-system-core.png"]',
    );
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(logo?.parentElement).toHaveClass("animate-spin");
    expect(submit).toHaveBeenCalledWith(
      "task.setStatus",
      expect.any(FormData),
      {
        refresh: false,
      },
    );

    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("taskId")).toBe(
      "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    );
    expect(submittedForm.get("status")).toBe("completed");

    await act(async () => {
      resolveSubmit?.({ success: false, message: "Could not complete task." });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Complete Write proposal" }),
      ).toBeEnabled();
    });
  });

  it("resolves the ATLAS mark into a green check before refreshing", async () => {
    vi.useFakeTimers();
    const submit = vi.fn().mockResolvedValue({
      success: true,
      message: "Task completed.",
    });

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
        <TaskStatusForm
          taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
          title="Write proposal"
          completed={false}
        />
      </OfflineContext.Provider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Complete Write proposal" }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: "Completed Write proposal" }),
    ).toBeDisabled();
    expect(container.querySelector(".atlas-task-success-logo")).toBeVisible();
    expect(container.querySelector(".atlas-task-success-check")).toBeVisible();
    expect(mocks.refresh).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(900));

    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
