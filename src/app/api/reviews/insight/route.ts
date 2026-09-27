import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODELS } from "@/lib/ai/models";
import {
  ANSWER_LIMITS,
  requestGroundedAnswer,
} from "@/lib/analyst/freeform/answer";
import {
  WEEKLY_INSIGHT_QUESTIONS,
  gatherWeeklyInsightEvidence,
  previousWeekWindows,
} from "@/lib/reviews/insight";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
const inputSchema = z
  .object({
    // "current": this week so far; "previous": last full week, stored once.
    mode: z.enum(["current", "previous"]).default("current"),
    dataSharingAcknowledged: z.literal(true).optional(),
  })
  .strict();
const reservationSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("reserved"),
    request_id: z.number().int().positive(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("invalid_type") }),
  z.object({ status: z.literal("invalid_model") }),
  z.object({ status: z.literal("hourly_quota") }),
  z.object({ status: z.literal("daily_quota") }),
  z.object({ status: z.literal("site_quota") }),
]);

/**
 * Generates a verified week-over-week insight for /reviews. Last week's
 * insight is stored once per owner and week and returned without a model call
 * afterwards.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return json({ error: "Insights are unavailable." }, 503);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return json({ error: "Sign in to generate an insight." }, 401);
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 256) return json({ error: "Request is too large." }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const { mode } = parsed.data;
  const weekStart =
    mode === "previous" ? previousWeekWindows(new Date()).current.from : null;
  if (weekStart) {
    const stored = await supabase
      .from("weekly_insights")
      .select("status,claims,evidence,limitations")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (stored.data)
      return json({
        status: stored.data.status === "answered" ? "answered" : "fallback",
        ...(stored.data.status !== "answered" && {
          failureCode: "insufficient_evidence",
          message:
            "Last week's records were not complete enough for an insight. Review the facts below.",
        }),
        claims: stored.data.claims,
        evidence: stored.data.evidence,
        limitations: stored.data.limitations,
        weekStart,
        stored: true,
      });
  }
  // A saved opt-in is standing consent for last week's automatic insight.
  let consented = parsed.data.dataSharingAcknowledged === true;
  if (!consented && mode === "previous") {
    const preferences = await supabase
      .from("user_preferences")
      .select("weekly_insight_auto")
      .eq("user_id", user.id)
      .maybeSingle();
    consented = preferences.data?.weekly_insight_auto === true;
  }
  if (!consented)
    return json({ error: "Acknowledge data sharing to continue." }, 400);
  if (!process.env.OPENAI_API_KEY)
    return json({ error: "AI insights are not configured." }, 503);

  // Insights share the freeform Analyst allowance and audit ledger.
  const { data: reservation, error: reservationError } = await supabase.rpc(
    "reserve_ai_analyst_request_result",
    { p_type: "freeform", p_model: AI_MODELS.analyst },
  );
  if (reservationError)
    return json({ error: "Insight quota is unavailable." }, 503);
  const allowed = reservationSchema.safeParse(reservation);
  if (!allowed.success)
    return json({ error: "Insight quota is unavailable." }, 503);
  if (allowed.data.status !== "reserved") {
    const status = allowed.data.status;
    const quota =
      status === "hourly_quota" ||
      status === "daily_quota" ||
      status === "site_quota";
    return json(
      {
        error: quota
          ? "Your Analyst usage limit has been reached."
          : status === "unauthenticated"
            ? "Sign in to generate an insight."
            : "Insights are unavailable.",
      },
      quota ? 429 : status === "unauthenticated" ? 401 : 503,
    );
  }

  let outcome = "provider_error";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  try {
    const { evidence, limitations, complete } =
      await gatherWeeklyInsightEvidence(new Date(), undefined, mode);
    const fallback = (message: string, failureCode: string) =>
      json({
        status: "fallback",
        failureCode,
        message,
        evidence,
        limitations,
        ...(weekStart && { weekStart }),
      });
    // Stores last week's result so later visits reuse it without a model call.
    const store = async (
      status: "answered" | "insufficient",
      claims: unknown[] = [],
    ) => {
      if (!weekStart) return;
      await supabase.from("weekly_insights").insert({
        user_id: user.id,
        week_start: weekStart,
        status,
        claims: claims as Json,
        evidence: evidence as unknown as Json,
        limitations,
      });
    };
    if (!complete || evidence.length === 0) {
      outcome = "insufficient";
      await store("insufficient");
      return fallback(
        "ATLAS could not gather complete weekly evidence for an insight. Review the available facts below.",
        "insufficient_evidence",
      );
    }
    if (evidence.length > ANSWER_LIMITS.evidenceItems) {
      outcome = "context_limit";
      return fallback(
        "The weekly evidence exceeds the explanation limit. Review the facts below.",
        "context_limit",
      );
    }
    const answer = await requestGroundedAnswer(
      WEEKLY_INSIGHT_QUESTIONS[mode],
      evidence,
    );
    if (answer.status === "error") {
      inputTokens = answer.inputTokens ?? null;
      outputTokens = answer.outputTokens ?? null;
      outcome =
        answer.code === "timeout"
          ? "timeout"
          : answer.code === "context_limit" || answer.code === "cost_limit"
            ? "context_limit"
            : answer.code === "invalid_response"
              ? "invalid_response"
              : "provider_error";
      return fallback(
        "An AI insight is unavailable. The verified weekly facts are shown below.",
        answer.code,
      );
    }
    outcome = "success";
    inputTokens = answer.inputTokens;
    outputTokens = answer.outputTokens;
    await store("answered", answer.claims);
    return json({
      status: "answered",
      claims: answer.claims,
      evidence,
      limitations,
      ...(weekStart && { weekStart }),
    });
  } catch {
    return json(
      {
        status: "fallback",
        failureCode: "retrieval_error",
        message: "The insight could not be completed. Try again.",
        evidence: [],
        limitations: [],
      },
      503,
    );
  } finally {
    try {
      await supabase.rpc("finish_ai_analyst_request", {
        p_id: allowed.data.request_id,
        p_outcome: outcome,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens,
      });
    } catch {
      /* Audit failure must not replace the insight. */
    }
  }
}
