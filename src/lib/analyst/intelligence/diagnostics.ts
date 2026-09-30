import { z } from "zod";

/**
 * A per-answer record of how the run went, so a failed answer can be
 * diagnosed without the person's screenshot. It holds step names, outcomes,
 * rule codes, counts and timings only: never the question, a figure, a
 * record name or any text a model wrote.
 */

// Codes are short machine words ("writer", "timeout", "review:shallow").
const code = z
  .string()
  .regex(/^[a-z0-9_:.-]{1,80}$/i)
  .catch("other");
const codes = (max: number) =>
  z
    .array(code)
    .max(200)
    .transform((items) => [...new Set(items)].slice(0, max));

export const runDiagnosticsSchema = z.object({
  status: code,
  outcome: code,
  path: code.nullable(),
  planner: z.enum(["ok", "failed", "off", "unknown"]),
  stopReason: code.nullable(),
  reads: z
    .array(
      z.object({
        tool: code,
        round: z.number().int().min(0).max(50),
        status: code,
        error: code.nullable(),
        evidence: z.number().int().min(0).max(10_000),
      }),
    )
    .max(60),
  stages: z
    .array(z.object({ stage: code, status: code, code: code.nullable() }))
    .max(20),
  rejections: codes(30),
  review: code.nullable(),
  claims: z.object({
    proposed: z.number().int().min(0).max(1_000),
    passed: z.number().int().min(0).max(1_000),
  }),
  providerCalls: z.number().int().min(0).max(1_000),
  durationMs: z.number().int().min(0).max(600_000).nullable(),
});
export type RunDiagnostics = z.infer<typeof runDiagnosticsSchema>;

/** Days a diagnostics record is kept. */
export const DIAGNOSTICS_DAYS = 14;

/** The validated record, or null when anything would not fit the shape. */
export function cleanDiagnostics(raw: unknown): RunDiagnostics | null {
  const parsed = runDiagnosticsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * The record for a run that ended before an answer was written (a
 * clarification, a cancellation): its result only.
 */
export function minimalDiagnostics(
  status: string,
  outcome: string,
): Omit<RunDiagnostics, "durationMs"> {
  return {
    status,
    outcome,
    path: null,
    planner: "unknown",
    stopReason: null,
    reads: [],
    stages: [],
    rejections: [],
    review: null,
    claims: { proposed: 0, passed: 0 },
    providerCalls: 0,
  };
}
