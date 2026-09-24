/** Model aliases in the OpenAI data-sharing offer shown on 2026-09-24. */
export const DATA_SHARING_OFFER_MODELS = {
  daily250k: [
    "gpt-5.4",
    "gpt-5.2",
    "gpt-5.1",
    "gpt-5",
    "gpt-4.1",
    "gpt-4o",
    "o1",
    "o3",
  ],
  daily2_5m: [
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o-mini",
    "o3-mini",
    "o4-mini",
  ],
} as const;

/** Model selected for each server-side ATLAS feature. */
export const AI_MODELS = {
  capture: "gpt-4o-mini-2024-07-18",
} as const;

/** Capture models verified with Chat Completions strict JSON output. */
export const CAPTURE_MODEL_OPTIONS = [
  { id: AI_MODELS.capture, label: "GPT-4o mini", pool: "2.5M" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", pool: "2.5M" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano", pool: "2.5M" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", pool: "2.5M" },
  { id: "gpt-4o", label: "GPT-4o", pool: "250K" },
  { id: "gpt-5.4", label: "GPT-5.4", pool: "250K" },
] as const;

export function resolveCaptureModel(value: FormDataEntryValue | null) {
  if (value === null) return AI_MODELS.capture;
  return (
    CAPTURE_MODEL_OPTIONS.find((option) => option.id === value)?.id ?? null
  );
}
