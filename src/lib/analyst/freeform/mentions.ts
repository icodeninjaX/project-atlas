/**
 * Resolves a goal or debt the user named in a freeform question ("my emergency
 * fund goal", "my BPI loan") to its owner-scoped ID, so the planner receives a
 * literal ID instead of asking for one. Only an unambiguous, whole-phrase name
 * match resolves; everything else keeps the existing clarification path.
 */

export const MENTION_LIMITS = Object.freeze({ goals: 100, debts: 50 });

type Named = { id: string; name: string };
export type MentionedEntity =
  | { type: "goal"; id: string; name: string }
  | { type: "debt"; id: string; name: string }
  | null;

const normalize = (value: string) =>
  ` ${value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

function mentioned(question: string, items: Named[]) {
  const text = normalize(question);
  const found = items.filter((item) => {
    const name = normalize(item.name);
    return name.trim().length >= 3 && text.includes(name);
  });
  // Prefer the longest name when one mention contains another ("Car" vs "Car loan").
  const longest = Math.max(0, ...found.map((item) => item.name.length));
  const best = found.filter((item) => item.name.length === longest);
  return best.length === 1 ? best[0]! : found.length === 0 ? null : undefined;
}

export function resolveMentionedEntity(
  question: string,
  options: {
    goals: Named[];
    debts: Named[];
    allowGoal: boolean;
    allowDebt: boolean;
  },
): MentionedEntity {
  const goal = options.allowGoal ? mentioned(question, options.goals) : null;
  const debt = options.allowDebt ? mentioned(question, options.debts) : null;
  // undefined = ambiguous; either ambiguity or both kinds named means no guess.
  if (goal === undefined || debt === undefined || (goal && debt)) return null;
  if (goal) return { type: "goal", ...goal };
  if (debt) return { type: "debt", ...debt };
  return null;
}
