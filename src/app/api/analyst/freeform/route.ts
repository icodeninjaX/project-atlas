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
    debtId: z.uuid().optional(),
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
  if (parsed.data.debtId && parsed.data.question.length > 400)
    return json(
      { error: "Use a shorter question when selecting a debt." },
      400,
    );
  if (parsed.data.debtId && parsed.data.goalId)
    return json({ error: "Select a goal or a debt for one question." }, 400);
  if (
    parsed.data.debtId &&
    !/\b(?:monthly|per month|each month)\b/i.test(parsed.data.question)
  )
    return json(
      { error: "State that the extra debt payment is monthly." },
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
  if (parsed.data.debtId) {
    const debt = await supabase
      .from("debts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("id", parsed.data.debtId)
      .maybeSingle();
    if (debt.error || !debt.data)
      return json({ error: "The selected active debt is unavailable." }, 404);
  }
  const associationQuestion =
    /\b(?:correlat\w*|associat\w*|coincid\w*|mov\w* together|pattern between)\b/i.test(
      parsed.data.question,
    );
  const scenarioQuestion =
    /\b(?:what if|scenario|runway if|runway under|income (?:falls|drops|decreases)|expenses? (?:rise|increase))\b/i.test(
      parsed.data.question,
    );
  const oneTimeDebtQuestion =
    /\b(?:one[- ]time|lump[- ]sum)\b.*\b(?:debt|loan|pay(?:ment|off)?)\b|\b(?:debt|loan)\b.*\b(?:one[- ]time|lump[- ]sum)\b/i.test(
      parsed.data.question,
    );
  if (oneTimeDebtQuestion)
    return json({
      status: "unsupported",
      failureCode: "unsupported_one_time_debt_scenario",
      message:
        "ATLAS can compare extra monthly debt payments, but cannot model a one-time debt payment here. Review or edit your assumptions in Runway.",
      evidence: [],
      limitations: ["No payoff date or one-time debt outcome was calculated."],
    });
  if (associationQuestion && parsed.data.goalId)
    return json(
      {
        error:
          "Pattern testing compares whole-domain history, not a selected goal.",
      },
      400,
    );
  if (scenarioQuestion && parsed.data.goalId)
    return json(
      {
        error:
          "Runway scenarios use whole-finance assumptions. Clear the selected goal to compare options.",
      },
      400,
    );
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
      : parsed.data.debtId
        ? `${parsed.data.question} Selected active debt ID: ${parsed.data.debtId}. Extra payments are monthly.`
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
    const usesPattern = plan.calls.some(
      (call) => call.tool === "getPatternAssociation",
    );
    const usesScenario = plan.calls.some(
      (call) => call.tool === "compareFinancialScenarios",
    );
    if (usesPattern && parsed.data.goalId) {
      outcome = "insufficient";
      return fallback(
        "The pattern test covers whole-domain history and cannot establish an association for the selected goal.",
        "unsupported_goal_pattern",
      );
    }
    if (usesScenario && parsed.data.goalId) {
      outcome = "insufficient";
      return fallback(
        "Runway scenarios cover the whole financial baseline, not the selected goal.",
        "unsupported_goal_scenario",
      );
    }
    if (associationQuestion && !usesPattern) {
      outcome = "insufficient";
      return fallback(
        "A reliable association requires the approved pattern test. Review the available facts below.",
        "missing_pattern_test",
      );
    }
    if (scenarioQuestion && !usesScenario) {
      outcome = "insufficient";
      return fallback(
        "A financial what-if needs the approved scenario comparison. Review the available facts below or edit your assumptions.",
        "missing_scenario_comparison",
      );
    }
    if (parsed.data.debtId) {
      const selectedDebtUsed = plan.calls.some((call) => {
        if (call.tool !== "compareFinancialScenarios") return false;
        const input = call.input as {
          alternatives?: Array<{
            extraDebtPayment?: { debtId: string } | null;
          }>;
        };
        return input.alternatives?.some(
          (option) => option.extraDebtPayment?.debtId === parsed.data.debtId,
        );
      });
      if (!selectedDebtUsed) {
        outcome = "insufficient";
        return fallback(
          "A monthly debt scenario needs the selected active debt. Review the available facts below or edit your question.",
          "missing_selected_debt",
        );
      }
    }
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
      : usesPattern
        ? evidence.filter(
            (item) => item.provenance.tool === "getPatternAssociation",
          )
        : usesScenario
          ? evidence.filter(
              (item) => item.provenance.tool === "compareFinancialScenarios",
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
