import type { FreePool } from "./pools";

/** Model selected for each server-side ATLAS feature. */
export const AI_MODELS = {
  capture: "gpt-5.4-nano-2026-03-17",
  analyst: "gpt-4o-mini-2024-07-18",
  planner: "gpt-5.4-mini-2026-03-17",
} as const;

/**
 * Models the Analyst chat can explain with, by exact ID only: every one is in
 * a free daily pool (see ./pools). The planner always stays on
 * `AI_MODELS.planner`; this choice only changes who writes the explanation.
 */
export const ANALYST_MODEL_OPTIONS = [
  {
    id: AI_MODELS.analyst,
    label: "GPT-4o mini",
    short: "4o mini",
    hint: "Fast and proven with ATLAS checks",
    pool: "small",
  },
  {
    id: "gpt-5.4-mini-2026-03-17",
    label: "GPT-5.4 mini",
    short: "5.4 mini",
    hint: "Sharper writing, still quick",
    pool: "small",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    short: "5.6 Terra",
    hint: "Newest mid-size model",
    pool: "small",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    short: "5.6 Luna",
    hint: "Lightest and fastest",
    pool: "small",
  },
  {
    id: "gpt-5.4-2026-03-05",
    label: "GPT-5.4",
    short: "GPT-5.4",
    hint: "Flagship depth for harder questions",
    pool: "large",
  },
  {
    id: "gpt-6-sol",
    label: "GPT-6 Sol",
    short: "6 Sol",
    hint: "Most capable in the free pool",
    pool: "large",
  },
  {
    id: "gpt-6-luna",
    label: "GPT-6 Luna",
    short: "6 Luna",
    hint: "GPT-6 quality at low latency",
    pool: "large",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  short: string;
  hint: string;
  pool: FreePool;
}>;

export type AnalystModelId = (typeof ANALYST_MODEL_OPTIONS)[number]["id"];

/** The exact Analyst model ID, the default when omitted, or null. */
export function resolveAnalystModel(value: unknown): AnalystModelId | null {
  if (value === undefined || value === null) return AI_MODELS.analyst;
  return (
    ANALYST_MODEL_OPTIONS.find((option) => option.id === value)?.id ?? null
  );
}

/** Capture models allowed for Chat Completions strict JSON output. */
export const CAPTURE_MODEL_OPTIONS = [
  { id: AI_MODELS.capture, label: "GPT-5.4 Nano", pool: "small" },
  { id: "gpt-5.4-mini-2026-03-17", label: "GPT-5.4 Mini", pool: "small" },
  { id: "gpt-4o-mini-2024-07-18", label: "GPT-4o Mini", pool: "small" },
  { id: "gpt-4.1-mini-2025-04-14", label: "GPT-4.1 Mini", pool: "small" },
  { id: "gpt-5.4-2026-03-05", label: "GPT-5.4", pool: "large" },
  { id: "gpt-4o-2024-11-20", label: "GPT-4o", pool: "large" },
  { id: "gpt-6-astra", label: "GPT-6 Astra", pool: "large" },
  { id: "gpt-6-sol", label: "GPT-6 Sol", pool: "large" },
  { id: "gpt-6-luna", label: "GPT-6 Luna", pool: "large" },
] as const;

export function resolveCaptureModel(value: FormDataEntryValue | null) {
  if (value === null) return AI_MODELS.capture;
  return (
    CAPTURE_MODEL_OPTIONS.find((option) => option.id === value)?.id ?? null
  );
}

/**
 * Published standard text rates in USD per 1M tokens, used for request
 * budgets. A model without an entry cannot be used by budgeted features, so
 * switching the Analyst planner or answer model requires adding its rates.
 * Inside a free pool these tokens cost nothing; the rates bound what one
 * request could cost if it were ever billed. Reviewed 2026-09-27 on each
 * model's page at https://developers.openai.com/api/docs/models.
 */
export const AI_MODEL_PRICING: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini-2024-07-18": { input: 0.15, output: 0.6 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-mini-2026-03-17": { input: 0.75, output: 4.5 },
  "gpt-5.6-terra": { input: 2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, output: 1.2 },
  "gpt-5.4-2026-03-05": { input: 2.5, output: 15 },
  "gpt-6-sol": { input: 2, output: 10 },
  "gpt-6-luna": { input: 0.1, output: 0.5 },
};

/**
 * Most one Analyst explanation attempt may cost if billed, by free pool. The
 * large-pool ceiling admits flagship rates on a full-size answer. Either caps
 * a billed attempt at a few US cents if the daily meter were ever wrong.
 */
export const ANSWER_COST_CEILING_USD_MICROS: Record<FreePool, number> = {
  small: 60_000,
  large: 80_000,
};

/** Estimated cost in USD micros, or null when the model has no known rates. */
export function estimatedCostUsdMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const rates = AI_MODEL_PRICING[model];
  if (!rates) return null;
  return Math.ceil(inputTokens * rates.input + outputTokens * rates.output);
}

/**
 * Reasoning effort for models that accept it. Reasoning models reject a
 * temperature setting, so callers omit temperature whenever this is non-null.
 */
export function reasoningEffortFor(model: string) {
  if (model === "gpt-6-astra") return "low";
  if (
    model.startsWith("gpt-5.4") ||
    model.startsWith("gpt-5.6") ||
    model === "gpt-6-sol" ||
    model === "gpt-6-luna"
  )
    return "none";
  return null;
}
