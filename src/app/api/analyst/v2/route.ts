import { after, NextResponse } from "next/server";
import { resolveAnalystModel } from "@/lib/ai/models";
import { NDJSON_TYPE } from "@/lib/analyst/freeform/progress";
import {
  parseV2Request,
  needsContext,
} from "@/lib/analyst/intelligence/context";
import { analystIntelligenceV2Enabled } from "@/lib/analyst/intelligence/flags";
import { listMemories } from "@/lib/analyst/intelligence/memory-store";
import {
  parseConsent,
  preferredRoute,
} from "@/lib/analyst/intelligence/policy";
import type { V2StreamEvent } from "@/lib/analyst/intelligence/progress";
import {
  reserveAnalystRequest,
  serveAnalystRun,
} from "@/lib/analyst/intelligence/serve";
import { createClient } from "@/lib/supabase/server";

/**
 * Analyst V2 (AI-06). Off unless `ATLAS_ANALYST_V2=1`; the legacy freeform
 * route is unchanged. Identity comes from the session, consent from the
 * request's versioned consent object, and every read and provider call runs
 * through the V2 policy, tools and run budget. The analysis planner runs on
 * the planner model before retrieval. One question uses one Analyst
 * request from the existing quota, finished exactly once.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
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
  // The key the chosen route sends with must exist; the shared key is not
  // needed when every call goes through the private route.
  const route = preferredRoute();
  if (
    !(route.id === "openai_non_sharing"
      ? process.env.OPENAI_NON_SHARING_API_KEY
      : process.env.OPENAI_API_KEY)
  )
    return json({ error: "AI analysis is not configured." }, 503);

  const reserved = await reserveAnalystRequest(supabase, model);
  if (!reserved.ok) return json({ error: reserved.error }, reserved.status);
  // Saved priorities; an unavailable store only means none are used.
  const memories =
    (await listMemories(supabase, user.id, new Date()).catch(() => null)) ?? [];

  const run = (emit?: (event: V2StreamEvent) => void, signal?: AbortSignal) =>
    serveAnalystRun({
      supabase,
      ownerId: user.id,
      requestId: reserved.requestId,
      question: parsed.request.question,
      contextToken: parsed.request.context,
      model,
      consent,
      route,
      memories,
      emit,
      signal,
    });

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
