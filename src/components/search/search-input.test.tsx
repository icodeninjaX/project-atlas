import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SearchInput } from "./search-input";

afterEach(cleanup);

describe("SearchInput", () => {
  it("focuses global search when slash is pressed outside an input", () => {
    render(<SearchInput defaultValue="" />);

    fireEvent.keyDown(window, { key: "/" });

    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("names the search field and groups the optional filters", () => {
    render(<SearchInput defaultValue="portfolio" />);

    expect(screen.getByRole("searchbox", { name: "Search ATLAS" })).toHaveValue(
      "portfolio",
    );
    expect(
      screen.getByRole("group", { name: "Narrow results" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Search ATLAS" }),
    ).toHaveAttribute("minlength", "2");
  });

  it("falls back to supported filters when URL values are unknown", () => {
    render(
      <SearchInput
        defaultValue="portfolio"
        entityType="unknown"
        status="deleted"
      />,
    );

    expect(screen.getByLabelText("Type")).toHaveValue("all");
    expect(screen.getByLabelText("Status")).toHaveValue("all");
  });
});
