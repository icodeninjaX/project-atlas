import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewForm } from "./review-form";

afterEach(cleanup);

describe("ReviewForm", () => {
  it("shows the automatic exact date and updates reflection progress", async () => {
    const user = userEvent.setup();
    render(
      <ReviewForm
        weekStart="2026-08-24"
        entryTimestamp="2026-08-25T05:00:00.000Z"
      />,
    );

    expect(screen.getByText("Tuesday, August 25, 2026")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Weekly reflection progress" }),
    ).toHaveAttribute("aria-valuenow", "0");

    await user.type(
      screen.getByRole("textbox", { name: "What went well?" }),
      "I kept a promise to myself.",
    );

    expect(
      screen.getByRole("progressbar", { name: "Weekly reflection progress" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("You have unsaved thoughts")).toBeVisible();
  });

  it("lets the score controls stay playful without forcing a score", async () => {
    const user = userEvent.setup();
    render(
      <ReviewForm
        weekStart="2026-08-24"
        entryTimestamp="2026-08-25T05:00:00.000Z"
      />,
    );

    const energy = screen.getByRole("spinbutton", { name: "Energy" });
    expect(energy).toHaveValue(null);

    await user.click(
      screen.getByRole("button", { name: "Increase energy score" }),
    );

    expect(energy).toHaveValue(5);
    expect(screen.getByText("Energy came and went")).toBeVisible();
  });

  it("asks three prompts up front and folds the rest behind More", async () => {
    const user = userEvent.setup();
    render(
      <ReviewForm
        weekStart="2026-08-24"
        entryTimestamp="2026-08-25T05:00:00.000Z"
        initial={{ moneyReflection: "Groceries came in under budget." }}
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "What went well?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "What matters most next week?" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "What happened financially?" }),
    ).not.toBeInTheDocument();

    const more = screen.getByRole("button", { name: /More to reflect on/ });
    expect(more).toHaveTextContent("1 of 3 written");
    await user.click(more);

    expect(
      screen.getByRole("textbox", { name: "What happened financially?" }),
    ).toHaveValue("Groceries came in under budget.");
  });
});
