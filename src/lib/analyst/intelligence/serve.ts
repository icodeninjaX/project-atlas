import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { AI_MODELS, type AnalystModelId } from "@/lib/ai/models";
import type { RunLedger } from "./budgets";
import { contextKey } from "./context";
import { minimalDiagnostics } from "./diagnostics";
import { recordDiagnostics } from "./diagnostics-store";
import type { Memory } from "./memory";
import { touchMemories } from "./memory-store";
import type { AnalystConsent, ProviderRoute } from "./policy";
import type { V2StreamEvent } from "./progress";
import { runAnalystV2, type V2Response } from "./run";
import { createStageCaller } from "./stages";
import { authorizeHandlesV2, invokeAnalystToolV2 } from "./tools/server";
import type { createClient } from "@/lib/supabase/server";

/**
 * One Analyst V2 run as a request serves it: reserve one request from the
 * existing quota, run the analysis, record its diagnostics and settle the
 * reservation exactly once. The question route and the monthly summary
 * share it, so both are metered and checked the same way.
 */

type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;

const reservationSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("reserved"),
    request_id: z.number().int().positive(),
  }),
  z.object({
    status: z.enum([
      "unauthenticated",
      "invalid_type",
      "invalid_model",
      "hourly_quota",
      "daily_quota",
      "site_quota",
    ]),
  }),
]);

export type Reservation =
  | { ok: true; requestId: number }
  | { ok: false; status: 429 | 503; error: string };

/** Reserves one Analyst request for the signed-in owner. */
export async function reserveAnalystRequest(
  supabase: Client,
  model: AnalystModelId,
): Promise<Reservation> {
  const { data: reservation, error } = await supabase.rpc(
    "reserve_ai_analyst_request_result",
    { p_type: "freeform", p_model: model },
  );
  const allowed = reservationSchema.safeParse(reservation);
  if (error || !allowed.success)
    return { ok: false, status: 503, error: "Analyst quota is unavailable." };
  if (allowed.data.status === "reserved")
    return { ok: true, requestId: allowed.data.request_id };
  const quota = ["hourly_quota", "daily_quota", "site_quota"].includes(
    allowed.data.status,
  );
  return quota
    ? {
        ok: false,
        status: 429,
        error: "Your Analyst usage limit has been reached.",
      }
    : { ok: false, status: 503, error: "Analyst is unavailable." };
}

export type ServedRun = {
  status: number;
  /** The response body: never quota bookkeeping, record IDs or diagnostics. */
  body: Partial<V2Response> | { error: string };
  result: V2Response | null;
};

/** Runs one reserved analysis and settles its reservation. */
export async function serveAnalystRun(input: {
  supabase: Client;
  ownerId: string;
  requestId: number;
  question: string;
  contextToken: string | null;
  model: AnalystModelId;
  consent: AnalystConsent;
  route: ProviderRoute;
  memories: Memory[];
  emit?: (event: V2StreamEvent) => void;
  signal?: AbortSignal;
}): Promise<ServedRun> {
  const { supabase, ownerId, consent, route } = input;
  const options = { consent, route };
  let result: V2Response | null = null;
  let ledger: RunLedger | null = null;
  const started = Date.now();
  try {
    result = await runAnalystV2(
      {
        ownerId,
        question: input.question,
        contextToken: input.contextToken,
        model: input.model,
        consent,
        route,
        memories: input.memories,
      },
      {
        invoke: (tool, toolInput) =>
          invokeAnalystToolV2(tool, toolInput, options),
        authorize: (handles) => authorizeHandlesV2(handles, options),
        stageCaller: (value) =>
          createStageCaller({ ledger: value, consent, route }),
        contextKey: contextKey(),
        now: () => new Date(),
        clock: Date.now,
        emit: input.emit,
        signal: input.signal,
        onLedger: (value) => {
          ledger = value;
        },
        planModel: AI_MODELS.planner,
      },
    );
    // Priorities this question bore on are kept longer.
    await touchMemories(
      supabase,
      ownerId,
      result.relatedMemoryIds ?? [],
      new Date(),
    ).catch(() => undefined);
    // How the run went, in codes only, for diagnosing failed answers.
    // It is saved alongside the response, never before it, so a slow
    // write cannot cost the answer; `after` keeps it alive once sent.
    after(
      recordDiagnostics(
        supabase,
        ownerId,
        result.diagnostics ?? minimalDiagnostics(result.status, result.outcome),
        Date.now() - started,
        new Date(),
      ).catch(() => undefined),
    );
    // Quota bookkeeping, record IDs and diagnostics stay on the server.
    const body: Partial<V2Response> = { ...result };
    delete body.outcome;
    delete body.usage;
    delete body.relatedMemoryIds;
    delete body.diagnostics;
    return { status: 200, body, result };
  } catch {
    return {
      status: 503,
      body: { error: "Analysis could not be completed. Try again." },
      result: null,
    };
  } finally {
    // A run that threw still settles the tokens it was charged.
    const charged = (ledger as RunLedger | null)?.usage;
    const usage =
      result?.usage ?? (charged?.providerCalls ? charged : undefined);
    try {
      await supabase.rpc("finish_ai_analyst_request", {
        p_id: input.requestId,
        p_outcome: result?.outcome ?? "provider_error",
        p_input_tokens: usage?.inputTokens ?? null,
        p_output_tokens: usage?.outputTokens ?? null,
      });
    } catch {
      /* Audit failure must not replace the answer. */
    }
  }
}
