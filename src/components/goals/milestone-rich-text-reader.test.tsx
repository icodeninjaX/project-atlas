import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { MilestoneRichTextReader } from "./milestone-rich-text-reader";

afterEach(cleanup);

describe("MilestoneRichTextReader", () => {
  it("renders formatted notes without injecting stored HTML", () => {
    const { container } = render(
      <MilestoneRichTextReader
        content={{
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "What I learned" }],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Important", marks: [{ type: "bold" }] },
                { type: "text", text: " <img src=x onerror=alert(1)>" },
              ],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "First insight" }],
                    },
                  ],
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "What I learned" }),
    ).toBeVisible();
    expect(screen.getByText("Important").tagName).toBe("STRONG");
    expect(screen.getByRole("list")).toHaveTextContent("First insight");
    expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the supplied empty state when notes are blank or invalid", () => {
    render(
      <MilestoneRichTextReader
        content={null}
        emptyFallback={<p>No notes yet.</p>}
      />,
    );

    expect(screen.getByText("No notes yet.")).toBeVisible();
  });
});
