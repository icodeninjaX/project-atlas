import { after, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAnalystModel } from "@/lib/ai/models";
import { NDJSON_TYPE } from "@/lib/analyst/freeform/progress";
import {
  contextKey,
  parseV2Request,
  needsContext,
} from "@/lib/analyst/intelligence/context";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { SHARED_ROUTE, parseConsent } from "@/lib/analyst/intelligence/policy";
import type { V2StreamEvent } from "@/lib/analyst/intelligence/progress";
import { runAnalystV2, type V2Response } from "@/lib/analyst/intelligence/run";
import { createStageCaller } from "@/lib/analyst/intelligence/stages";
import {
  authorizeHandlesV2,
  invokeAnalystToolV2,
} from "@/lib/analyst/intelligence/tools/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Analyst V2 (AI-06). Off unless `ATLAS_ANALYST_V2=1`; the legacy freeform
 * route is unchanged. Identity comes from the session, consent from the
 * request's versioned consent object, and every read and provider call runs
 * through the V2 policy, tools and run budget. One question uses one Analyst
 * request from the existing quota, finished exactly once.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
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

export async function POST(request: Request) {
  if (!analystIntelligenceV2Enabled())
    return json({ error: "Not found." }, 404);
  const supabase = await createClient();
  if (!supabase) return json({ error: "Analyst is unavailable." }, 503);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return json({ error: "Sign in to use Analyst." }, 401);
  const parsed = parseV2Request(await request.text());
  if (!parsed.ok)
    return json(
      {
        error:
          parsed.reason === "too_large"
            ? "Request is too large."
            : "Invalid request.",
      },
      parsed.reason === "too_large" ? 413 : 400,
    );
  const consent = parseConsent(parsed.request.consent);
  if (!consent)
    return json({ error: "Choose what Analyst may share before asking." }, 400);
  const model = resolveAnalystModel(parsed.request.model);
  if (!model) return json({ error: "Choose an available Analyst model." }, 400);
  if (needsContext(parsed.request.question) && !parsed.request.context)
    return json({ error: "Ask a complete question." }, 400);
  if (!process.env.OPENAI_API_KEY)
    return json({ error: "AI analysis is not configured." }, 503);

  const { data: reservation, error: reservationError } = await supabase.rpc(
    "reserve_ai_analyst_request_result",
    {
      p_type: "freeform",
      p_model: model,
    },
  );
  const allowed = reservationSchema.safeParse(reservation);
  if (reservationError || !allowed.success)
    return json({ error: "Analyst quota is unavailable." }, 503);
  if (allowed.data.status !== "reserved") {
    const quota = ["hourly_quota", "daily_quota", "site_quota"].includes(
      allowed.data.status,
    );
    return json(
      {
        error: quota
          ? "Your Analyst usage limit has been reached."
          : "Analyst is unavailable.",
      },
      quota ? 429 : 503,
    );
  }
  const requestId = allowed.data.request_id;
  const route = SHARED_ROUTE;
  const options = { consent, route };

  const run = async (
    emit?: (event: V2StreamEvent) => void,
    signal?: AbortSignal,
  ) => {
    let result: V2Response | null = null;
    try {
      result = await runAnalystV2(
        {
          ownerId: user.id,
          question: parsed.request.question,
          contextToken: parsed.request.context,
          model,
          consent,
          route,
        },
        {
          invoke: (tool, input) => invokeAnalystToolV2(tool, input, options),
          authorize: (handles) => authorizeHandlesV2(handles, options),
          stageCaller: (ledger) =>
            createStageCaller({ ledger, consent, route }),
          contextKey: contextKey(),
          now: () => new Date(),
          clock: Date.now,
          emit,
          signal,
        },
      );
      // Quota bookkeeping stays on the server.
      const body: Partial<V2Response> = { ...result };
      delete body.outcome;
      delete body.usage;
      return { status: 200, body };
    } catch {
      return {
        status: 503,
        body: { error: "Analysis could not be completed. Try again." },
      };
    } finally {
      try {
        await supabase.rpc("finish_ai_analyst_request", {
          p_id: requestId,
          p_outcome: result?.outcome ?? "provider_error",
          p_input_tokens: result?.usage.inputTokens ?? null,
          p_output_tokens: result?.usage.outputTokens ?? null,
        });
      } catch {
        /* Audit failure must not replace the answer. */
      }
    }
  };

  if (!request.headers.get("accept")?.includes(NDJSON_TYPE)) {
    const result = await run();
    return json(result.body, result.status);
  }
  // A client that leaves stops new investigative rounds; the run still
  // finishes its accounting under `after`.
  const encoder = new TextEncoder();
  const abandoned = new AbortController();
  let open = true;
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
    },
    cancel() {
      open = false;
      abandoned.abort();
    },
  });
  const send = (event: V2StreamEvent) => {
    if (!open) return;
    try {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    } catch {
      open = false;
    }
  };
  const work = run(send, abandoned.signal).then((result) => {
    send({ type: "result", status: result.status, body: result.body });
    if (!open) return;
    open = false;
    try {
      controller.close();
    } catch {
      /* The client already left. */
    }
  });
  after(work);
  return new Response(stream, {
    headers: { ...headers, "Content-Type": `${NDJSON_TYPE}; charset=utf-8` },
  });
}
