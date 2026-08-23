import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoalProgressSlider } from "./goal-progress-slider";

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  state: { success: false, message: "" },
  pending: false,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/components/offline/offline-mutation", () => ({
  useOfflineActionState: () => [mocks.state, mocks.action, mocks.pending],
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.action.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  mocks.state = { success: false, message: "" };
  mocks.pending = false;
});

describe("GoalProgressSlider", () => {
  it("requires intentional adjustment and confirms the saved percentage", async () => {
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => undefined);

    const { rerender } = render(
      <GoalProgressSlider
        goalId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        goalTitle="Launch portfolio"
        progressPercent={35}
        status="active"
      />,
    );

    const slider = screen.getByRole("slider", {
      name: "Progress for Launch portfolio",
    });
    expect(slider).toHaveValue("35");
    expect(slider).toBeDisabled();
    expect(slider).toHaveClass("touch-pan-y");
    expect(screen.getByText("35%")).toBeInTheDocument();

    fireEvent.pointerUp(slider);
    expect(requestSubmit).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Adjust progress for Launch portfolio",
      }),
    );

    expect(slider).toBeEnabled();

    fireEvent.change(slider, { target: { value: "68" } });

    expect(slider).toHaveValue("68");
    expect(screen.getByText("68%")).toBeInTheDocument();

    fireEvent.pointerUp(slider);

    expect(requestSubmit).toHaveBeenCalledTimes(1);

    mocks.state = { success: true, message: "Goal progress updated." };
    rerender(
      <GoalProgressSlider
        goalId="1d334d84-4e32-46fa-bbdb-05ce7dc0dfbb"
        goalTitle="Launch portfolio"
        progressPercent={35}
        status="active"
      />,
    );

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Progress updated to 68%.",
      );
      expect(slider).toBeDisabled();
    });
  });
});
