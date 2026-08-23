import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoalProgressSlider } from "./goal-progress-slider";

const action = vi.fn();

vi.mock("@/components/offline/offline-mutation", () => ({
  useOfflineActionState: () => [{ success: false, message: "" }, action, false],
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  action.mockReset();
});

describe("GoalProgressSlider", () => {
  it("updates the percentage in the bar and saves when dragging ends", () => {
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => undefined);

    render(
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
    expect(screen.getByText("35%")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "68" } });

    expect(slider).toHaveValue("68");
    expect(screen.getByText("68%")).toBeInTheDocument();

    fireEvent.pointerUp(slider);

    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });
});
