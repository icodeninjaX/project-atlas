import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { previewAnswers } from "@/lib/analyst/intelligence/evaluation/preview";
import { SPENDING_IDS } from "@/lib/analyst/intelligence/evaluation/v2-fixtures";
import { AnswerV2View } from "./answer-v2";

const [complete, partial] = previewAnswers();

describe("AnswerV2View", () => {
  it("shows the checked answer with its tie and caveat", () => {
    render(<AnswerV2View {...complete!} />);
    expect(screen.getByText("Answered")).toBeInTheDocument();
    expect(
      screen.getByText(/tied for the largest increase/),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a reason for it/)).toBeInTheDocument();
    expect(screen.queryByText("Not answered")).not.toBeInTheDocument();
    expect(screen.getByText(/3 of 3 statements passed/)).toBeInTheDocument();
  });

  it("labels a partial answer and never shows the rejected claim", () => {
    render(<AnswerV2View {...partial!} />);
    expect(screen.getByText("Partial answer")).toBeInTheDocument();
    expect(
      screen.queryByText(/Groceries had the largest increase/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Not answered")).toBeInTheDocument();
    expect(screen.getByText(/failed ATLAS checks/)).toBeInTheDocument();
  });

  it("renders table values from evidence, not from model text", () => {
    const item = complete!;
    const answer = {
      ...item.answer,
      table: {
        captionClaimId: "c1",
        columns: ["Period", "Recorded expenses"],
        rows: [
          [{ label: "Current" }, { ref: SPENDING_IDS.current }],
          [{ label: "Previous" }, { ref: SPENDING_IDS.previous }],
        ],
      },
    };
    render(<AnswerV2View {...item} answer={answer} />);
    const table = within(screen.getByRole("table"));
    expect(table.getByRole("cell", { name: "₱11,000.00" })).toBeInTheDocument();
    expect(table.getByRole("cell", { name: "₱9,100.00" })).toBeInTheDocument();
  });
});
