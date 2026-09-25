import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODELS } from "@/lib/ai/models";
import { runAnalystQueryPlanner } from "@/lib/analyst/planner/server";
import { plannerQuestionSchema } from "@/lib/analyst/planner/contracts";
import {
  ANSWER_LIMITS,
  requestGroundedAnswer,
} from "@/lib/analyst/freeform/answer";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
const inputSchema = z
  .object({
    question: plannerQuestionSchema,
    goalId: z.uuid().optional(),
    dataSharingAcknowledged: z.literal(true),
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

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return json({ error: "Analyst is unavailable." }, 503);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return json({ error: "Sign in to use Analyst." }, 401);
  let input: unknown;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 4096)
      return json({ error: "Request is too large." }, 413);
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: "Request is too large." }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    return json(
      { error: "Enter a question and acknowledge data sharing." },
      400,
    );
  if (parsed.data.goalId && parsed.data.question.length > 400)
    return json(
      { error: "Use a shorter question when selecting a goal." },
      400,
    );
  if (parsed.data.goalId) {
    const goal = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", parsed.data.goalId)
      .maybeSingle();
    if (goal.error || !goal.data)
      return json({ error: "The selected goal is unavailable." }, 404);
  }
  if (!process.env.OPENAI_API_KEY)
    return json({ error: "AI analysis is not configured." }, 503);

  const { data: reservation, error: reservationError } = await supabase.rpc(
    "reserve_ai_analyst_request_result",
    { p_type: "freeform", p_model: AI_MODELS.analyst },
  );
  if (reservationError)
    return json({ error: "Analyst quota is unavailable." }, 503);
  const allowed = reservationSchema.safeParse(reservation);
  if (!allowed.success)
    return json({ error: "Analyst quota is unavailable." }, 503);
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
          : status === "invalid_type"
            ? "Freeform Analyst needs the latest database update."
            : status === "unauthenticated"
              ? "Sign in to use Analyst."
              : "Analyst is unavailable.",
      },
      quota ? 429 : status === "unauthenticated" ? 401 : 503,
    );
  }

  let outcome = "provider_error";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  try {
    const plannerQuestion = parsed.data.goalId
      ? `${parsed.data.question} Selected goal ID: ${parsed.data.goalId}.`
      : parsed.data.question;
    const plan = await runAnalystQueryPlanner(plannerQuestion);
    const plannerUsage =
      "calls" in plan ? plan.metadata.planner : plan.metadata;
    inputTokens = plannerUsage?.inputTokens ?? null;
    outputTokens = plannerUsage?.outputTokens ?? null;
    if (plan.status === "clarification_required") {
      outcome = "insufficient";
      return json({
        status: "clarification_required",
        failureCode: "clarification_required",
        message: plan.clarification,
        evidence: [],
        limitations: [],
      });
    }
    if (plan.status === "unsupported") {
      outcome = "insufficient";
      return json({
        status: "unsupported",
        failureCode: "unsupported_question",
        message: plan.unsupportedReason,
        evidence: [],
        limitations: plan.missingCapabilities,
      });
    }
    if (plan.status === "error") {
      const code = plan.error?.code;
      outcome =
        code === "timeout" || code === "execution_timeout"
          ? "timeout"
          : code === "context_limit" || code === "cost_limit"
            ? "context_limit"
            : "provider_error";
      return json({
        status: "fallback",
        failureCode: code ?? "retrieval_error",
        message: plan.error?.message ?? "Analysis could not be completed.",
        evidence: [],
        limitations: [],
      });
    }
    const evidence = plan.evidence;
    const limitations = plan.limitations;
    const fallback = (message: string, failureCode: string) =>
      json({ status: "fallback", failureCode, message, evidence, limitations });
    if (
      parsed.data.goalId &&
      !plan.calls.some((call) => call.tool === "getGoalLinkedActivity")
    ) {
      outcome = "insufficient";
      return fallback(
        "This answer needs the selected goal's linked activity. Review the available facts below.",
        "missing_goal_context",
      );
    }
    if (plan.status === "partial" || evidence.length === 0) {
      outcome = "insufficient";
      return fallback(
        "ATLAS could not gather complete evidence for an AI explanation. Review the available facts below.",
        "insufficient_evidence",
      );
    }
    const explanationEvidence = parsed.data.goalId
      ? evidence.filter(
          (item) => item.provenance.tool === "getGoalLinkedActivity",
        )
      : evidence;
    if (explanationEvidence.length > ANSWER_LIMITS.evidenceItems) {
      outcome = "context_limit";
      return fallback(
        "The evidence exceeds the explanation limit. Review the ATLAS facts below.",
        "context_limit",
      );
    }
    const answer = await requestGroundedAnswer(
      parsed.data.question,
      explanationEvidence,
    );
    if (answer.status === "error") {
      inputTokens = (inputTokens ?? 0) + (answer.inputTokens ?? 0);
      outputTokens = (outputTokens ?? 0) + (answer.outputTokens ?? 0);
      outcome =
        answer.code === "timeout"
          ? "timeout"
          : answer.code === "context_limit" || answer.code === "cost_limit"
            ? "context_limit"
            : answer.code === "invalid_response"
              ? "invalid_response"
              : "provider_error";
      return fallback(
        "An AI explanation is unavailable. The verified ATLAS facts are shown below.",
        answer.code,
      );
    }
    outcome = "success";
    inputTokens = (inputTokens ?? 0) + answer.inputTokens;
    outputTokens = (outputTokens ?? 0) + answer.outputTokens;
    return json({
      status: "answered",
      claims: answer.claims,
      evidence,
      limitations,
    });
  } catch {
    return json(
      {
        status: "fallback",
        failureCode: "retrieval_error",
        message: "Analysis could not be completed. Try again.",
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
      /* Audit failure must not replace the answer. */
    }
  }
}
