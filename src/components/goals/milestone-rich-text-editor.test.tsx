import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders as render } from "@/test/render";
import { MilestoneRichTextEditor } from "./milestone-rich-text-editor";

afterEach(cleanup);

describe("MilestoneRichTextEditor", () => {
  it("applies toolbar formatting and serializes it for offline submission", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <MilestoneRichTextEditor id="milestone-description" />
      </form>,
    );

    const editor = await screen.findByRole("textbox", {
      name: "Description or learning notes",
    });
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.type(editor, "Make this memorable");

    await waitFor(() => {
      const input = container.querySelector<HTMLInputElement>(
        'input[name="description"]',
      );
      expect(input).not.toBeNull();
      expect(JSON.parse(input?.value ?? "{}")).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Make this memorable",
              },
            ],
          },
        ],
      });
    });
  });

  it("synchronizes the latest editor state before form submission", async () => {
    const user = userEvent.setup();
    let submittedDescription = "";
    const { container } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submittedDescription = String(
            new FormData(event.currentTarget).get("description"),
          );
        }}
      >
        <MilestoneRichTextEditor id="milestone-description" />
        <button type="submit">Save</button>
      </form>,
    );

    const editor = await screen.findByRole("textbox", {
      name: "Description or learning notes",
    });
    await user.type(editor, "Capture this before saving.");

    const input = container.querySelector<HTMLInputElement>(
      'input[name="description"]',
    );
    expect(input).not.toBeNull();
    input!.value = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save" }));

    expect(JSON.parse(submittedDescription)).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Capture this before saving." }],
        },
      ],
    });
  });
});
