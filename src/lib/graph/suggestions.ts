import type { GraphEntitySummary, GraphEntityType } from "@/lib/graph/registry";

/** Entity types that can be suggested as a manual link to a goal. */
export const suggestibleGraphTypes = [
  "knowledge_concept",
  "debt",
  "job_application",
  "transaction",
] as const satisfies readonly GraphEntityType[];

export type SuggestibleGraphType = (typeof suggestibleGraphTypes)[number];

export function isSuggestibleGraphType(
  value: unknown,
): value is SuggestibleGraphType {
  return suggestibleGraphTypes.includes(value as SuggestibleGraphType);
}

export type GoalSuggestionInput = {
  title: string;
  description?: string | null;
  success_definition?: string | null;
  area?: string | null;
};

export type SuggestionCandidate = {
  summary: GraphEntitySummary;
  /** Searchable text for the record: name first, then secondary fields. */
  text: string;
};

export type GraphLinkSuggestion = {
  item: GraphEntitySummary;
  reason: string;
  score: number;
};

const stopWords = new Set([
  "about",
  "after",
  "again",
  "all",
  "and",
  "any",
  "are",
  "before",
  "being",
  "but",
  "can",
  "could",
  "every",
  "for",
  "from",
  "get",
  "goal",
  "has",
  "have",
  "into",
  "its",
  "make",
  "month",
  "months",
  "more",
  "most",
  "new",
  "not",
  "off",
  "one",
  "our",
  "out",
  "over",
  "per",
  "should",
  "some",
  "start",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "this",
  "through",
  "until",
  "very",
  "want",
  "week",
  "weeks",
  "when",
  "will",
  "with",
  "within",
  "year",
  "years",
  "your",
]);

/** Goal areas whose records are plausibly related even without a shared word. */
const areaTypes: Partial<Record<string, SuggestibleGraphType>> = {
  finance: "debt",
  career: "job_application",
  learning: "knowledge_concept",
};

function normalize(word: string) {
  return word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;
}

/**
 * Lowercase, punctuation-free keywords; safe to embed in PostgREST filters.
 * Numbers (years, amounts) are skipped because they match unrelated records.
 */
export function extractKeywords(text: string, max = 8): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) => word.length >= 3 && !stopWords.has(word) && !/^\d+$/.test(word),
    )
    .map(normalize);
  return [...new Set(words)].slice(0, max);
}

export function goalKeywords(goal: GoalSuggestionInput) {
  return extractKeywords(
    [goal.title, goal.description, goal.success_definition]
      .filter(Boolean)
      .join(" "),
  );
}

export function areaSuggestionType(area: string | null | undefined) {
  return area ? (areaTypes[area] ?? null) : null;
}

/**
 * Ranks candidate records for a goal. Shared keywords drive the score;
 * a matching goal area adds a weak signal. Excluded keys are `type:id`.
 */
export function rankGoalSuggestions(
  goal: GoalSuggestionInput,
  candidates: SuggestionCandidate[],
  excluded: Set<string>,
  limit = 6,
): GraphLinkSuggestion[] {
  const keywords = goalKeywords(goal);
  const areaType = areaSuggestionType(goal.area);
  const seen = new Set<string>();
  const ranked: GraphLinkSuggestion[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.summary.type}:${candidate.summary.id}`;
    if (excluded.has(key) || seen.has(key)) continue;
    seen.add(key);
    const words = new Set(extractKeywords(candidate.text, 40));
    const shared = keywords.filter((keyword) => words.has(keyword));
    const areaMatch = candidate.summary.type === areaType;
    if (shared.length === 0 && !areaMatch) continue;
    ranked.push({
      item: candidate.summary,
      score: shared.length * 2 + (areaMatch ? 1 : 0),
      reason:
        shared.length > 0
          ? `Mentions ${shared
              .slice(0, 3)
              .map((word) => `“${word}”`)
              .join(", ")}`
          : "Same area as this goal",
    });
  }
  return ranked
    .sort(
      (a, b) =>
        b.score - a.score ||
        suggestibleGraphTypes.indexOf(a.item.type as SuggestibleGraphType) -
          suggestibleGraphTypes.indexOf(b.item.type as SuggestibleGraphType),
    )
    .slice(0, limit);
}
