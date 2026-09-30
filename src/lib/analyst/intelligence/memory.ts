/**
 * Long-term priorities for Analyst: goals and priorities the person stated in
 * words ("I'm saving for a laptop"), saved only after they confirm the exact
 * text. A priority never carries a figure or a record detail, is kept until
 * the person deletes it or for 90 days after it last came up, and at most ten
 * are kept. The planner and writer receive the texts to frame answers around
 * what matters to the person; they are never evidence.
 */

export const MEMORY_LIMITS = Object.freeze({
  items: 10,
  minChars: 3,
  maxChars: 160,
  days: 90,
});

export type Memory = {
  id: string;
  text: string;
  /** When the priority was saved or last came up in a question. */
  lastMentionedAt: string;
};

/** A priority as the planner and writer see it: a short ID and the text. */
export type PromptPriority = { id: string; text: string };

// Figures and money never belong in a saved priority; neither do links.
const figure = /[0-9₱$€£¥]|\b(?:php|pesos?|piso|centavos?)\b/i;
const link = /(?:https?:\/\/|www\.|@\w)/i;

/**
 * The text of a priority, cleaned, or null when it may not be saved: too
 * short or long, with a figure or amount, or with a link or handle.
 */
export function memoryText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!]+$/, "");
  if (
    text.length < MEMORY_LIMITS.minChars ||
    text.length > MEMORY_LIMITS.maxChars ||
    figure.test(text) ||
    link.test(text) ||
    text.includes("{{")
  )
    return null;
  return text;
}

/** The earliest last mention a kept priority may have. */
export function memoryCutoff(now: Date) {
  return new Date(now.getTime() - MEMORY_LIMITS.days * 86_400_000);
}

/** Whole days until a priority is forgotten, never below zero. */
export function daysLeft(memory: Memory, now: Date) {
  const expires =
    Date.parse(memory.lastMentionedAt) + MEMORY_LIMITS.days * 86_400_000;
  return Math.max(0, Math.ceil((expires - now.getTime()) / 86_400_000));
}

/** Short IDs for the prompt, so no database ID reaches a provider. */
export function promptPriorities(memories: Memory[]): PromptPriority[] {
  return memories
    .slice(0, MEMORY_LIMITS.items)
    .map((item, index) => ({ id: `p${index + 1}`, text: item.text }));
}

/** The saved priorities a planner's short IDs name. */
export function relatedMemoryIds(
  memories: Memory[],
  promptIds: readonly string[],
): string[] {
  const byPrompt = new Map(
    promptPriorities(memories).map((item, index) => [
      item.id,
      memories[index]!.id,
    ]),
  );
  return [
    ...new Set(
      promptIds.flatMap((id) => (byPrompt.has(id) ? [byPrompt.get(id)!] : [])),
    ),
  ];
}

/**
 * A priority the planner heard in this question, when it may be offered for
 * saving: valid text that is not already saved (ignoring case).
 */
export function memorySuggestion(
  stated: unknown,
  memories: Memory[],
): string | null {
  const text = memoryText(stated);
  if (!text) return null;
  const key = text.toLocaleLowerCase();
  return memories.some((item) => item.text.toLocaleLowerCase() === key)
    ? null
    : text;
}
