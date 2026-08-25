import { describe, expect, it } from "vitest";
import {
  normalizeMilestoneDescription,
  parseMilestoneDescriptionInput,
} from "./milestone-rich-text";

describe("milestone rich text", () => {
  it("accepts the allowlisted formatting produced by the editor", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            { type: "text", text: "Key lesson", marks: [{ type: "bold" }] },
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
                  content: [
                    {
                      type: "text",
                      text: "Start small",
                      marks: [{ type: "italic" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(parseMilestoneDescriptionInput(JSON.stringify(document))).toEqual({
      success: true,
      data: document,
    });
  });

  it("converts a mutation from the former plain-text editor", () => {
    expect(
      parseMilestoneDescriptionInput("Keep the first step small."),
    ).toEqual({
      success: true,
      data: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Keep the first step small." }],
          },
        ],
      },
    });
  });

  it("normalizes an empty editor document to null", () => {
    expect(
      parseMilestoneDescriptionInput(
        JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      ),
    ).toEqual({ success: true, data: null });
  });

  it("rejects unsupported nodes and marks", () => {
    expect(
      parseMilestoneDescriptionInput(
        JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Unsafe",
                  marks: [{ type: "script", attrs: { src: "evil" } }],
                },
              ],
            },
          ],
        }),
      ),
    ).toEqual({
      success: false,
      message: "The milestone description has invalid formatting.",
    });
  });

  it("keeps legacy stored text readable during a rolling deployment", () => {
    expect(normalizeMilestoneDescription("An existing note.")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "An existing note." }],
        },
      ],
    });
  });
});
