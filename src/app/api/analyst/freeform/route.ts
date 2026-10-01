import { hasRequiredAssurance } from "@/lib/auth/assurance";
import { after, NextResponse } from "next/server";
import { focusTaskLabels } from "@/lib/analyst/freeform/display-labels";
import {
  NDJSON_TYPE,
  type AnalystStageHook,
  type AnalystStreamEvent,
} from "@/lib/analyst/freeform/progress";
import { suggestFollowUps } from "@/lib/analyst/freeform/suggestions";
import type { ToolName } from "@/lib/analyst/tools/contracts";
import { z } from "zod";
import {
  AI_MODELS,
  ANALYST_MODEL_OPTIONS,
  resolveAnalystModel,
} from "@/lib/ai/models";
import { freePoolFor } from "@/lib/ai/pools";
import { runAnalystQueryPlanner } from "@/lib/analyst/planner/server";
import {
  isScenarioQuestion,
  plannerQuestionSchema,
} from "@/lib/analyst/planner/contracts";
import {
  ANSWER_LIMITS,
  requestGroundedAnswer,
} from "@/lib/analyst/freeform/answer";
import {
  MENTION_LIMITS,
  resolveMentionedEntity,
  type MentionedEntity,
} from "@/lib/analyst/freeform/mentions";
import { createClient } from "@/lib/supabase/server";

const partialEvidenceNote =
  "Some ATLAS sources had no or incomplete records for this question, so the explanation uses only the complete facts.";
export const runtime = "nodejs";
// Planning, retrieval and an answer with one repair attempt.
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
// Room for the question plus two earlier exchanges.
const MAX_REQUEST_CHARS = 8192;
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
type Reply = { body: unknown; status: number };
const modelLabel = (id: string) =>
  ANALYST_MODEL_OPTIONS.find((option) => option.id === id)?.label ?? id;
const reply = (body: unknown, status = 200): Reply => ({ body, status });
const inputSchema = z
  .object({
    question: plannerQuestionSchema,
    goalId: z.uuid().optional(),
    debtId: z.uuid().optional(),
    // Earlier answered exchanges in this conversation, oldest first.
    history: z
      .array(
        z
          .object({
            question: plannerQuestionSchema,
            answer: z.string().trim().max(600),
          })
          .strict(),
      )
      .max(2)
      .optional(),
    /** Exact ID of the model that writes the explanation. */
    model: z.string().max(64).optional(),
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
  if (!(await hasRequiredAssurance(supabase)))
    return json({ error: "MFA required" }, 403);

  let input: unknown;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_CHARS)
      return json({ error: "Request is too large." }, 413);
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_CHARS)
      return json({ error: "Request is too large." }, 413);
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
  const model = resolveAnalystModel(parsed.data.model);
  if (!model) return json({ error: "Choose an available Analyst model." }, 400);
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
  // A follow-up inherits the what-if it continues, as the planner does.
  const scenarioQuestion = isScenarioQuestion(
    parsed.data.question,
    parsed.data.history?.at(-1)?.question,
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
  let goalId = parsed.data.goalId;
  let debtId = parsed.data.debtId;
  let matchedEntity: MentionedEntity = null;
  if (!goalId && !debtId && parsed.data.question.length <= 400) {
    const [goals, debts] = await Promise.all([
      supabase
        .from("goals")
        .select("id,title")
        .eq("user_id", user.id)
        .limit(MENTION_LIMITS.goals),
      supabase
        .from("debts")
        .select("id,creditor_name")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(MENTION_LIMITS.debts),
    ]);
    if (!goals.error && !debts.error) {
      matchedEntity = resolveMentionedEntity(parsed.data.question, {
        goals: (goals.data ?? []).map((goal) => ({
          id: goal.id,
          name: goal.title,
        })),
        debts: (debts.data ?? []).map((debt) => ({
          id: debt.id,
          name: debt.creditor_name,
        })),
        allowGoal: !associationQuestion && !scenarioQuestion,
        // Matches the planner's scenario phrasing, including "extra monthly".
        allowDebt:
          (scenarioQuestion ||
            /\b(?:extra|additional)\b/i.test(parsed.data.question)) &&
          /\b(?:monthly|per month|each month)\b/i.test(parsed.data.question),
      });
      if (matchedEntity?.type === "goal") goalId = matchedEntity.id;
      if (matchedEntity?.type === "debt") debtId = matchedEntity.id;
    }
  }
  if (!process.env.OPENAI_API_KEY)
    return json({ error: "AI analysis is not configured." }, 503);

  const { data: reservation, error: reservationError } = await supabase.rpc(
    "reserve_ai_analyst_request_result",
    { p_type: "freeform", p_model: model },
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

  const requestId = allowed.data.request_id;
  const history = parsed.data.history ?? [];
  // Ideas under an answered or fallback turn; fixed text, never record data.
  const followUps = (calls: Array<{ tool: ToolName; input: unknown }>) =>
    suggestFollowUps({ question: parsed.data.question, history, calls });
  /** Plans, reads and explains once, then records the outcome exactly once. */
  const run = async (onStage?: AnalystStageHook): Promise<Reply> => {
    let outcome = "provider_error";
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    try {
      const plannerQuestion = goalId
        ? `${parsed.data.question} Selected goal ID: ${goalId}.`
        : debtId
          ? `${parsed.data.question} Selected active debt ID: ${debtId}. Extra payments are monthly.`
          : parsed.data.question;
      const plan =
        history.length || onStage
          ? await runAnalystQueryPlanner(plannerQuestion, {
              ...(history.length && {
                previousQuestion: history.at(-1)!.question,
              }),
              ...(onStage && { onStage }),
            })
          : await runAnalystQueryPlanner(plannerQuestion);
      const plannerUsage =
        "calls" in plan ? plan.metadata.planner : plan.metadata;
      inputTokens = plannerUsage?.inputTokens ?? null;
      outputTokens = plannerUsage?.outputTokens ?? null;
      if (plan.status === "clarification_required") {
        outcome = "insufficient";
        return reply({
          status: "clarification_required",
          failureCode: "clarification_required",
          message: plan.clarification,
          evidence: [],
          limitations: [],
        });
      }
      if (plan.status === "unsupported") {
        outcome = "insufficient";
        return reply({
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
              : code === "pool_exhausted"
                ? "pool_exhausted"
                : "provider_error";
        return reply({
          status: "fallback",
          failureCode: code ?? "retrieval_error",
          message: plan.error?.message ?? "Analysis could not be completed.",
          evidence: [],
          limitations: [],
          suggestions: followUps([]),
        });
      }
      const evidence = plan.evidence;
      const limitations = [...plan.limitations];
      // Owner-only task titles, added after any model call and never sent to it.
      const labels = () => focusTaskLabels(supabase, user.id, evidence);
      const suggestions = followUps(plan.calls);
      const fallback = async (message: string, failureCode: string) =>
        reply({
          status: "fallback",
          failureCode,
          message,
          evidence,
          limitations,
          labels: await labels(),
          suggestions,
        });
      const usesPattern = plan.calls.some(
        (call) => call.tool === "getPatternAssociation",
      );
      const usesScenario = plan.calls.some(
        (call) => call.tool === "compareFinancialScenarios",
      );
      if (usesPattern && goalId) {
        outcome = "insufficient";
        return fallback(
          "The pattern test covers whole-domain history and cannot establish an association for the selected goal.",
          "unsupported_goal_pattern",
        );
      }
      if (usesScenario && goalId) {
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
      if (debtId) {
        const selectedDebtUsed = plan.calls.some((call) => {
          if (call.tool !== "compareFinancialScenarios") return false;
          const input = call.input as {
            alternatives?: Array<{
              extraDebtPayment?: { debtId: string } | null;
            }>;
          };
          return input.alternatives?.some(
            (option) => option.extraDebtPayment?.debtId === debtId,
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
        goalId &&
        !plan.calls.some((call) => call.tool === "getGoalLinkedActivity")
      ) {
        outcome = "insufficient";
        return fallback(
          "This answer needs the selected goal's linked activity. Review the available facts below.",
          "missing_goal_context",
        );
      }
      // A tool that finds no or incomplete records (no reviews yet, say) should
      // not block the whole answer: explain only complete facts from tools that
      // finished, and say so. Missing capabilities still fall back.
      const readyIds = new Set(
        plan.calls
          .filter((call) => call.status === "ready")
          .flatMap((call) => call.result.evidence.map((item) => item.id)),
      );
      const completeEvidence =
        plan.status === "partial"
          ? evidence.filter(
              (item) =>
                readyIds.has(item.id) && item.completeness === "complete",
            )
          : evidence;
      const missingCapability =
        plan.status === "partial" &&
        (plan.missingCapabilities?.length ?? 0) > 0;
      const scoped = goalId
        ? completeEvidence.filter(
            (item) => item.provenance.tool === "getGoalLinkedActivity",
          )
        : usesPattern
          ? completeEvidence.filter(
              (item) => item.provenance.tool === "getPatternAssociation",
            )
          : usesScenario
            ? completeEvidence.filter(
                (item) => item.provenance.tool === "compareFinancialScenarios",
              )
            : completeEvidence;
      // A focused, pattern or scenario answer needs its own tool to be complete.
      const coreIncomplete =
        plan.status === "partial" &&
        (goalId || usesPattern || usesScenario) &&
        plan.calls.some(
          (call) =>
            call.status !== "ready" &&
            (call.tool === "getGoalLinkedActivity" ||
              call.tool === "getPatternAssociation" ||
              call.tool === "compareFinancialScenarios"),
        );
      if (missingCapability || coreIncomplete || scoped.length === 0) {
        outcome = "insufficient";
        return fallback(
          "ATLAS could not gather complete evidence for an AI explanation. Review the available facts below.",
          "insufficient_evidence",
        );
      }
      if (scoped.length < evidence.length && plan.status === "partial")
        limitations.push(partialEvidenceNote);
      const explanationEvidence = scoped;
      if (explanationEvidence.length > ANSWER_LIMITS.evidenceItems) {
        outcome = "context_limit";
        return fallback(
          "The evidence exceeds the explanation limit. Review the ATLAS facts below.",
          "context_limit",
        );
      }
      const explain = (explainer: typeof model) => {
        const options = {
          ...(history.length && { history }),
          ...(onStage && { onStage }),
          ...(explainer !== AI_MODELS.analyst && { model: explainer }),
        };
        return Object.keys(options).length > 0
          ? requestGroundedAnswer(
              parsed.data.question,
              explanationEvidence,
              options,
            )
          : requestGroundedAnswer(parsed.data.question, explanationEvidence);
      };
      let explainer = model;
      let answer = await explain(explainer);
      // A used-up large pool refuses before anything is sent, so the default
      // small-pool model can still explain this question.
      if (
        answer.status === "error" &&
        answer.code === "pool_exhausted" &&
        freePoolFor(model) === "large"
      ) {
        inputTokens = (inputTokens ?? 0) + (answer.inputTokens ?? 0);
        outputTokens = (outputTokens ?? 0) + (answer.outputTokens ?? 0);
        explainer = AI_MODELS.analyst;
        limitations.push(
          `${modelLabel(model)}'s free daily allowance is used up, so ${modelLabel(explainer)} wrote this explanation. It resets at 8:00 AM Manila time.`,
        );
        answer = await explain(explainer);
      }
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
                : answer.code === "pool_exhausted"
                  ? "pool_exhausted"
                  : "provider_error";
        return fallback(
          answer.code === "pool_exhausted"
            ? "ATLAS's free daily AI allowance is used up, so only the verified facts are shown. It resets at 8:00 AM Manila time."
            : answer.code === "meter_unavailable"
              ? "ATLAS's AI usage meter is unavailable, so no explanation was requested. The verified facts are shown below."
              : "An AI explanation is unavailable. The verified ATLAS facts are shown below.",
          answer.code,
        );
      }
      outcome = "success";
      inputTokens = (inputTokens ?? 0) + answer.inputTokens;
      outputTokens = (outputTokens ?? 0) + answer.outputTokens;
      return reply({
        status: "answered",
        claims: answer.claims,
        evidence,
        limitations,
        labels: await labels(),
        suggestions,
        model: { id: explainer, label: modelLabel(explainer) },
        ...(matchedEntity && {
          matchedEntity: { type: matchedEntity.type, name: matchedEntity.name },
        }),
      });
    } catch {
      return reply(
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
          p_id: requestId,
          p_outcome: outcome,
          p_input_tokens: inputTokens,
          p_output_tokens: outputTokens,
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
  // Streamed progress: one JSON line per stage, then the same result the
  // JSON response carries. A client that leaves early only stops the writes;
  // the run continues under `after` so the quota is still finished once.
  const encoder = new TextEncoder();
  let open = true;
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
    },
    cancel() {
      open = false;
    },
  });
  const send = (event: AnalystStreamEvent) => {
    if (!open) return;
    try {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    } catch {
      open = false;
    }
  };
  const work = run(send).then((result) => {
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
