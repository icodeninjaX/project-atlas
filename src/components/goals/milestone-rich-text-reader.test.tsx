import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { MilestoneRichTextEditor } from "./milestone-rich-text-editor";
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

  it("preserves blank lines from notes migrated out of the plain-text editor", () => {
    const { container } = render(
      <MilestoneRichTextReader
        content={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "First thought.\n\nSecond thought.\n\nFinal thought.",
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(container.firstElementChild).toHaveClass("whitespace-pre-wrap");
    expect(container.querySelectorAll("br")).toHaveLength(4);
    expect(container).toHaveTextContent("First thought.");
    expect(container).toHaveTextContent("Second thought.");
    expect(container).toHaveTextContent("Final thought.");
  });

  it("preserves every supported editor format when switching to read mode", async () => {
    const formattedDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "text", text: " " },
            { type: "text", text: "Italic", marks: [{ type: "italic" }] },
            { type: "text", text: " " },
            {
              type: "text",
              text: "Underlined",
              marks: [{ type: "underline" }],
            },
            { type: "text", text: " " },
            {
              type: "text",
              text: "Struck",
              marks: [{ type: "strike" }],
            },
            { type: "text", text: " " },
            { type: "text", text: "Inline code", marks: [{ type: "code" }] },
            { type: "text", text: " " },
            {
              type: "text",
              text: "Bold italic",
              marks: [{ type: "bold" }, { type: "italic" }],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Reader heading" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bullet item" }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Numbered item" }],
                },
              ],
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted insight" }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Line one" },
            { type: "hardBreak" },
            { type: "text", text: "Line two" },
          ],
        },
      ],
    };
    const editor = render(
      <MilestoneRichTextEditor
        id="formatted-milestone-description"
        initialContent={formattedDocument}
      />,
    );

    await screen.findByRole("textbox", {
      name: "Description or learning notes",
    });
    const serialized = JSON.parse(
      editor.container.querySelector<HTMLInputElement>(
        'input[name="description"]',
      )?.value ?? "{}",
    );
    expect(serialized).toEqual(formattedDocument);

    editor.unmount();
    const reader = render(<MilestoneRichTextReader content={serialized} />);

    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    expect(screen.getByText("Italic").tagName).toBe("EM");
    expect(screen.getByText("Underlined")).toHaveClass("underline");
    expect(screen.getByText("Struck").tagName).toBe("S");
    expect(screen.getByText("Inline code").tagName).toBe("CODE");
    const combinedMarks = screen.getByText("Bold italic");
    expect(combinedMarks.tagName).toBe("STRONG");
    expect(combinedMarks.parentElement?.tagName).toBe("EM");
    expect(
      screen.getByRole("heading", { name: "Reader heading" }),
    ).toBeVisible();
    expect(screen.getByText("Bullet item").closest("ul")).not.toBeNull();
    expect(screen.getByText("Numbered item").closest("ol")).toHaveAttribute(
      "start",
      "3",
    );
    expect(
      screen.getByText("Quoted insight").closest("blockquote"),
    ).not.toBeNull();
    expect(reader.container.querySelectorAll("br")).toHaveLength(1);
  });
});
