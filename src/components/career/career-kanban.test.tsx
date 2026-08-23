import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CareerKanban, type CareerApplication } from "./career-kanban";

const mocks = vi.hoisted(() => ({
  updateStage: vi.fn(),
}));

vi.mock("@/lib/career/actions", () => ({
  updateApplicationStageAction: mocks.updateStage,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./application-edit-form", () => ({
  ApplicationEditForm: ({
    application,
  }: {
    application: CareerApplication;
  }) => <button type="button">Edit {application.company_name}</button>,
}));

const baseApplication: CareerApplication = {
  id: "60000000-0000-4000-8000-000000000001",
  company_name: "Northstar Labs",
  role_title: "Senior Frontend Engineer",
  job_url: null,
  location: "Manila",
  work_setup: "remote",
  employment_type: "full_time",
  stage: "applied",
  salary_min_centavos: null,
  salary_max_centavos: null,
  next_action: "Follow up with recruiter",
  next_action_at: "2026-08-13T09:00:00+08:00",
  applied_at: "2026-08-10T09:00:00+08:00",
  contact_name: null,
  contact_email: null,
  resume_version: null,
  notes: null,
  is_follow_up_overdue: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("CareerKanban", () => {
  it("opens on the stage with an overdue follow-up and switches stages", async () => {
    const user = userEvent.setup();
    render(
      <CareerKanban
        applications={[
          baseApplication,
          {
            ...baseApplication,
            id: "60000000-0000-4000-8000-000000000002",
            company_name: "Cloudbank",
            role_title: "UI Engineer",
            stage: "interview",
            is_follow_up_overdue: false,
          },
        ]}
        nowIso="2026-08-14T12:00:00+08:00"
      />,
    );

    expect(screen.getByText("Northstar Labs")).toBeVisible();
    expect(screen.queryByText("Cloudbank")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Interview/ }));

    expect(screen.getByText("Cloudbank")).toBeVisible();
    expect(screen.queryByText("Northstar Labs")).not.toBeInTheDocument();
  });

  it("regroups a card immediately after its stage update succeeds", async () => {
    mocks.updateStage.mockResolvedValue({
      success: true,
      message: "Application stage updated.",
    });
    const user = userEvent.setup();
    render(
      <CareerKanban
        applications={[baseApplication]}
        nowIso="2026-08-14T12:00:00+08:00"
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Stage for Northstar Labs" }),
      "offer",
    );

    await waitFor(() =>
      expect(screen.queryByText("Northstar Labs")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /Applied/ })).toHaveTextContent("0");
    expect(screen.getByRole("tab", { name: /Offer/ })).toHaveTextContent("1");

    await user.click(screen.getByRole("tab", { name: /Offer/ }));
    expect(screen.getByText("Northstar Labs")).toBeVisible();
  });
});
