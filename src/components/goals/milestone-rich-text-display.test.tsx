import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { MilestoneRichTextDisplay } from "./milestone-rich-text-display";

afterEach(cleanup);

describe("MilestoneRichTextDisplay", () => {
  it("renders formatted notes without injecting stored HTML", () => {
    const { container } = render(
      <MilestoneRichTextDisplay
        content={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Important", marks: [{ type: "bold" }] },
                { type: "text", text: " <img src=x onerror=alert(1)>" },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Important").tagName).toBe("STRONG");
    expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
  });
});
