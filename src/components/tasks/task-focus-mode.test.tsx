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
import { TaskFocusMode } from "./task-focus-mode";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TaskFocusMode", () => {
  it("asks for an estimate before enabling a focus session", () => {
    render(
      <TaskFocusMode
        taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        title="Write proposal"
        description={null}
        estimatedMinutes={null}
        scheduledLabel={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Set focus minutes" }),
    ).toBeDisabled();
  });

  it("counts down from the task estimate and can pause", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T01:00:00.000Z"));

    render(
      <TaskFocusMode
        taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        title="Write proposal"
        description="Draft the opening section"
        estimatedMinutes={25}
        scheduledLabel="2026-08-14 at 9:00 AM"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Focus on Write proposal" }),
    );
    expect(screen.getByRole("timer")).toHaveTextContent("25:00");

    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole("timer")).toHaveTextContent("24:59");

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByRole("timer")).toHaveTextContent("24:59");
  });

  it("keeps Focus open until the task is marked complete", async () => {
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
        <TaskFocusMode
          taskId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
          title="Write proposal"
          description={null}
          estimatedMinutes={25}
          scheduledLabel={null}
          triggerPresentation="menu"
        />
      </OfflineContext.Provider>,
    );

    await user.click(
      screen.getByRole("menuitem", { name: "Focus on Write proposal" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Mark task complete" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Write proposal" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Marking complete…" }),
    ).toBeDisabled();
    expect(submit).toHaveBeenCalledWith("task.setStatus", expect.any(FormData));
    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("taskId")).toBe(
      "1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb",
    );
    expect(submittedForm.get("status")).toBe("completed");

    await act(async () => {
      resolveSubmit?.({ success: true, message: "Task completed." });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Write proposal" }),
      ).not.toBeInTheDocument();
    });
  });
});
