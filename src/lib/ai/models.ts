/** Model selected for each server-side ATLAS feature. */
export const AI_MODELS = {
  capture: "gpt-5.4-nano-2026-03-17",
  analyst: "gpt-4o-mini-2024-07-18",
  planner: "gpt-5.4-mini-2026-03-17",
} as const;

/** Independently allowed for Analyst's strict JSON Chat Completions response. */
export const ANALYST_MODEL_OPTIONS = [
  { id: AI_MODELS.analyst, label: "GPT-4o mini" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-6-astra", label: "GPT-6 Astra" },
  { id: "gpt-6-sol", label: "GPT-6 Sol" },
  { id: "gpt-6-luna", label: "GPT-6 Luna" },
] as const;

export function resolveAnalystModel(value: unknown) {
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
 * GPT-4o mini rates reviewed 2026-09-25; GPT-5.4 mini rates reviewed
 * 2026-09-27 at https://developers.openai.com/api/docs/models/gpt-5.4-mini.
 */
export const AI_MODEL_PRICING: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini-2024-07-18": { input: 0.15, output: 0.6 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-mini-2026-03-17": { input: 0.75, output: 4.5 },
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
    model === "gpt-6-sol" ||
    model === "gpt-6-luna"
  )
    return "none";
  return null;
}
