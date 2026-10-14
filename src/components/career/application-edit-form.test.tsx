import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineContext } from "@/components/offline/offline-provider";
import { ApplicationEditForm } from "./application-edit-form";

const mocks = vi.hoisted(() => ({ deleteApplication: vi.fn() }));
vi.mock("@/lib/career/actions", () => ({
  deleteApplicationAction: mocks.deleteApplication,
}));

const application = {
  id: "60000000-0000-4000-8000-000000000001",
  company_name: "Northstar Labs",
  role_title: "Frontend Engineer",
  job_url: "https://example.com/job",
  location: "Manila",
  work_setup: "hybrid",
  employment_type: "full_time",
  stage: "interview",
  applied_at: "2026-08-10T09:00:00+08:00",
  next_action: "Prepare portfolio walkthrough",
  next_action_at: "2026-08-27T09:00:00+08:00",
  contact_name: "Jamie Recruiter",
  contact_email: "jamie@example.com",
  resume_version: "Frontend v2",
  notes: "Ask about the design system.",
  salary_min_centavos: 5_000_000,
  salary_max_centavos: 7_000_000,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.deleteApplication.mockReset();
});

describe("ApplicationEditForm", () => {
  it("opens a labelled full-screen editor and closes without submitting", async () => {
    const user = userEvent.setup();
    render(<ApplicationEditForm application={application} />);

    await user.click(
      screen.getByRole("button", { name: "Edit Northstar Labs" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Edit Northstar Labs",
    });
    expect(dialog).toHaveClass("fixed", "inset-0", "overflow-y-auto");
    expect(
      screen.getByLabelText("Edit Northstar Labs company name"),
    ).toHaveValue("Northstar Labs");
    expect(screen.getByLabelText("Edit Northstar Labs stage")).toHaveValue(
      "interview",
    );
    expect(
      screen.getByLabelText("Edit Northstar Labs minimum salary in pesos"),
    ).toHaveValue("50000");
    expect(screen.getByText("Role details")).toBeVisible();
    expect(screen.getByText("Next move")).toBeVisible();
    expect(screen.getByText("Compensation")).toBeVisible();
    expect(screen.getByText("Contact & notes")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("dialog", { name: "Edit Northstar Labs" }),
    ).not.toBeInTheDocument();
  });

  it("closes with Escape and returns focus to the edit trigger", async () => {
    const user = userEvent.setup();
    render(<ApplicationEditForm application={application} />);
    const trigger = screen.getByRole("button", { name: "Edit Northstar Labs" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Edit Northstar Labs" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("submits the edited application and closes after success", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue({
      success: true,
      message: "Application updated.",
    });
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
        <ApplicationEditForm application={application} />
      </OfflineContext.Provider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Edit Northstar Labs" }),
    );
    await user.clear(screen.getByLabelText("Edit Northstar Labs role title"));
    await user.type(
      screen.getByLabelText("Edit Northstar Labs role title"),
      "Staff Frontend Engineer",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        "application.update",
        expect.any(FormData),
      );
      expect(
        screen.queryByRole("dialog", { name: "Edit Northstar Labs" }),
      ).not.toBeInTheDocument();
    });
    const submittedForm = submit.mock.calls[0]?.[1] as FormData;
    expect(submittedForm.get("roleTitle")).toBe("Staff Frontend Engineer");
  });

  it("deletes the application after confirmation and closes", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.deleteApplication.mockResolvedValue({
      success: true,
      message: "Application deleted.",
    });
    render(<ApplicationEditForm application={application} />);

    await user.click(
      screen.getByRole("button", { name: "Edit Northstar Labs" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete Northstar Labs application" }),
    );

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("Northstar Labs"),
    );
    await waitFor(() => {
      expect(mocks.deleteApplication).toHaveBeenCalledWith(application.id);
      expect(
        screen.queryByRole("dialog", { name: "Edit Northstar Labs" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps the application when deletion is not confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ApplicationEditForm application={application} />);

    await user.click(
      screen.getByRole("button", { name: "Edit Northstar Labs" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete Northstar Labs application" }),
    );

    expect(mocks.deleteApplication).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Edit Northstar Labs" }),
    ).toBeInTheDocument();
  });

  it("stays open and keeps the application when deletion fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.deleteApplication.mockResolvedValue({
      success: false,
      message: "The application could not be deleted.",
    });
    render(<ApplicationEditForm application={application} />);

    await user.click(
      screen.getByRole("button", { name: "Edit Northstar Labs" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete Northstar Labs application" }),
    );

    await waitFor(() =>
      expect(mocks.deleteApplication).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByRole("dialog", { name: "Edit Northstar Labs" }),
    ).toBeInTheDocument();
  });
});
