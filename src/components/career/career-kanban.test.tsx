import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  window.localStorage.clear();
});

afterEach(cleanup);

describe("CareerKanban", () => {
  it("focuses the stage with an overdue follow-up on mobile and switches stages", async () => {
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

    expect(screen.getByRole("tab", { name: /Applied/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      within(screen.getByTestId("kanban-column-applied")).getByText(
        "Northstar Labs",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("kanban-column-interview")).getByText(
        "Cloudbank",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Interview/ }));

    expect(screen.getByRole("tab", { name: /Interview/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("kanban-column-interview")).toHaveClass("flex");
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

    await waitFor(() => {
      expect(
        within(screen.getByTestId("kanban-column-applied")).queryByText(
          "Northstar Labs",
        ),
      ).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId("kanban-column-offer")).getByText(
          "Northstar Labs",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /Applied/ })).toHaveTextContent("0");
    expect(screen.getByRole("tab", { name: /Offer/ })).toHaveTextContent("1");

    await user.click(screen.getByRole("tab", { name: /Offer/ }));
    expect(screen.getByTestId("kanban-column-offer")).toHaveClass("flex");
  });

  it("moves a card between columns with drag and drop", async () => {
    mocks.updateStage.mockResolvedValue({
      success: true,
      message: "Application stage updated.",
    });
    render(
      <CareerKanban
        applications={[baseApplication]}
        nowIso="2026-08-14T12:00:00+08:00"
      />,
    );
    const dataTransfer = {
      dropEffect: "none",
      effectAllowed: "none",
      getData: vi.fn(() => baseApplication.id),
      setData: vi.fn(),
    };

    fireEvent.dragStart(
      screen.getByTestId(`kanban-card-${baseApplication.id}`),
      {
        dataTransfer,
      },
    );
    fireEvent.dragOver(screen.getByTestId("kanban-column-offer"), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByTestId("kanban-column-offer"), {
      dataTransfer,
    });

    await waitFor(() => {
      expect(mocks.updateStage).toHaveBeenCalledWith(
        baseApplication.id,
        "offer",
      );
      expect(
        within(screen.getByTestId("kanban-column-offer")).getByText(
          "Northstar Labs",
        ),
      ).toBeInTheDocument();
    });
  });

  it("keeps the mobile record hierarchy and card actions together", () => {
    const application = {
      ...baseApplication,
      job_url: "https://example.com/northstar-role",
    };
    render(
      <CareerKanban
        applications={[application]}
        nowIso="2026-08-14T12:00:00+08:00"
      />,
    );

    const card = screen.getByTestId(`kanban-card-${application.id}`);
    const mobileStatus = within(card).getByTestId(
      `kanban-card-mobile-status-${application.id}`,
    );

    expect(within(mobileStatus).getByText("Applied")).toBeInTheDocument();
    expect(within(mobileStatus).getByText("Aug 10, 2026")).toBeInTheDocument();
    expect(within(card).getByText("Follow up with recruiter")).toBeVisible();
    expect(
      within(card).getByRole("combobox", { name: "Stage for Northstar Labs" }),
    ).toBeVisible();
    expect(
      within(card).getByRole("link", {
        name: "Open job post for Northstar Labs",
      }),
    ).toHaveAttribute("href", "https://example.com/northstar-role");
  });

  it("filters the board and persists layout customization", async () => {
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

    await user.type(
      screen.getByRole("searchbox", { name: "Search applications" }),
      "Cloudbank",
    );

    expect(screen.queryByText("Northstar Labs")).not.toBeInTheDocument();
    expect(screen.getByText("Cloudbank")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Customize" }));
    expect(
      screen.getByRole("dialog", { name: "Make the board yours" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "compact" }));
    await user.click(
      screen.getByRole("checkbox", { name: "Interested column" }),
    );

    const saved = JSON.parse(
      window.localStorage.getItem("atlas-career-board-preferences-v1") ?? "{}",
    );
    expect(saved.density).toBe("compact");
    expect(saved.visibleStages).not.toContain("interested");
    expect(
      screen.queryByTestId("kanban-column-interested"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(
      screen.queryByRole("dialog", { name: "Make the board yours" }),
    ).not.toBeInTheDocument();
  });
});
