import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StageSelect } from "./stage-select";

const mocks = vi.hoisted(() => ({
  updateStage: vi.fn(),
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));

vi.mock("@/lib/career/actions", () => ({
  updateApplicationStageAction: mocks.updateStage,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.successToast,
    error: mocks.errorToast,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("StageSelect", () => {
  it("keeps the new stage selected after the server action succeeds", async () => {
    mocks.updateStage.mockResolvedValue({
      success: true,
      message: "Application stage updated.",
    });
    const user = userEvent.setup();
    render(
      <StageSelect
        applicationId="60000000-0000-4000-8000-000000000001"
        companyName="Northstar Labs"
        stage="interview"
      />,
    );

    const select = screen.getByRole("combobox", {
      name: "Stage for Northstar Labs",
    });
    await user.selectOptions(select, "offer");

    expect(select).toHaveValue("offer");
    await waitFor(() => expect(mocks.updateStage).toHaveBeenCalledOnce());
    expect(mocks.updateStage).toHaveBeenCalledWith(
      "60000000-0000-4000-8000-000000000001",
      "offer",
    );
    await waitFor(() => expect(select).toBeEnabled());
    expect(select).toHaveValue("offer");
    expect(mocks.successToast).toHaveBeenCalledWith(
      "Application stage updated.",
    );
  });

  it("rolls back the selection when the database update fails", async () => {
    mocks.updateStage.mockResolvedValue({
      success: false,
      message: "The application stage could not be updated.",
    });
    const user = userEvent.setup();
    render(
      <StageSelect
        applicationId="60000000-0000-4000-8000-000000000001"
        companyName="Northstar Labs"
        stage="interview"
      />,
    );

    const select = screen.getByRole("combobox", {
      name: "Stage for Northstar Labs",
    });
    await user.selectOptions(select, "offer");

    await waitFor(() => expect(select).toHaveValue("interview"));
    expect(mocks.errorToast).toHaveBeenCalledWith(
      "The application stage could not be updated.",
    );
  });
});
