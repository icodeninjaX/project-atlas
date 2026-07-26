import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("provides labelled primary navigation and the Atlas identity", () => {
    render(
      <AppShell>
        <h1>Today</h1>
      </AppShell>,
    );

    expect(screen.getAllByLabelText("Primary navigation")).toHaveLength(2);
    expect(screen.getByText("Project Atlas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });
});
