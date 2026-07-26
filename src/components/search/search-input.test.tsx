import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  it("focuses global search when slash is pressed outside an input", () => {
    render(<SearchInput defaultValue="" />);

    fireEvent.keyDown(window, { key: "/" });

    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
