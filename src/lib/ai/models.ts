/** Model selected for each server-side ATLAS feature. */
export const AI_MODELS = {
  capture: "gpt-5.4-nano-2026-03-17",
  analyst: "gpt-4o-mini-2024-07-18",
  planner: "gpt-4o-mini-2024-07-18",
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
