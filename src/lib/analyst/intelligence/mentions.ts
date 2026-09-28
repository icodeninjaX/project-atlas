import { parseHandle } from "./tools/contracts";

/**
 * Record mentions in claim text (Analyst V2). A claim names an owner's
 * record by its handle in double braces, such as `{{category:<uuid>}}`, and
 * ATLAS shows the owner its label only when presenting the answer. Names
 * therefore never reach a provider that may not see them, and the claim
 * checks never read a label as a figure, date or measure.
 */

// Any double-brace token is a mention; one that is not a valid handle
// fails the checks rather than reaching the owner as a raw token.
const MENTION = /\{\{([^{}]{0,120})\}\}/g;

/** The handles a text mentions, in order, well-formed or not. */
export function mentionedHandles(text: string) {
  return [...text.matchAll(MENTION)].map((match) =>
    match[1]!.trim().toLowerCase(),
  );
}

/** Whether a mention names a well-formed handle. */
export function validMention(handle: string) {
  return handle === "uncategorized" || parseHandle(handle) !== null;
}

/** The text the claim checks read: each mention becomes a plain word. */
export function withoutMentions(text: string) {
  return text.replace(MENTION, "that item");
}

/**
 * The text an owner reads: each mention becomes the owner's label, or a
 * plain description when no label is available.
 */
export function renderMentions(
  text: string,
  labels: ReadonlyMap<string, string>,
) {
  return text.replace(MENTION, (_, raw: string) => {
    const handle = raw.trim().toLowerCase();
    if (handle === "uncategorized") return "Uncategorized";
    const label = labels.get(handle);
    if (label) return label;
    const type = parseHandle(handle)?.type.replace(/_/g, " ") ?? "record";
    return `an unnamed ${type}`;
  });
}
