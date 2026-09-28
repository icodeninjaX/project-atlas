import { describe, expect, it } from "vitest";
import {
  mentionedHandles,
  renderMentions,
  validMention,
  withoutMentions,
} from "./mentions";

const id = "f3ee7a14-4324-48de-8d87-34fbec069aa3";

describe("record mentions", () => {
  it("hides mentions from the checks and shows labels to the owner", () => {
    const text = `{{category:${id}}} leads, ahead of {{uncategorized}}.`;
    expect(mentionedHandles(text)).toEqual([`category:${id}`, "uncategorized"]);
    // The checks never read an ID's digits or a label's words.
    expect(withoutMentions(text)).toBe("that item leads, ahead of that item.");
    expect(
      renderMentions(text, new Map([[`category:${id}`, "Loan & bills 2026"]])),
    ).toBe("Loan & bills 2026 leads, ahead of Uncategorized.");
    // Without a label the owner reads a plain description, never an ID.
    expect(renderMentions(text, new Map())).toBe(
      "an unnamed category leads, ahead of Uncategorized.",
    );
  });

  it("accepts only well-formed handles", () => {
    expect(validMention(`category:${id}`)).toBe(true);
    expect(validMention("uncategorized")).toBe(true);
    expect(validMention(`planet:${id}`)).toBe(false);
    expect(mentionedHandles("{{category:not-an-id}}")).toEqual([]);
  });
});
