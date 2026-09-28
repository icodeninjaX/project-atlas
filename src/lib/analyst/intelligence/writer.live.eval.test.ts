import { describe, expect, it, vi } from "vitest";
import { AI_MODELS, ANALYST_MODEL_OPTIONS } from "@/lib/ai/models";
import { RUN_BUDGETS, RunLedger } from "./budgets";
import type { AnalysisBrief } from "./contracts";
import {
  SPENDING_IDS,
  V2_NOW,
  legacySpendingV2,
} from "./evaluation/v2-fixtures";
import { SHARED_ROUTE, legacyEquivalentConsent } from "./policy";
import { createStageCaller } from "./stages";
import { synthesizeAnswer } from "./synthesis";

/**
 * Opt-in live check of each selectable writer model (AI-06). For every model
 * in the picker it sends one metered writer request over synthetic
 * aggregates and reports whether the model accepted the strict JSON schema,
 * which model the provider says answered, and how many drafted claims passed
 * the deterministic checks. It does not infer capabilities from a model's
 * name, and it asserts no quality threshold: one run is not a reliability
 * estimate. Run it only with explicit approval:
 * ATLAS_ANALYST_V2_LIVE_EVALS=1 and a configured OpenAI key and pool meter.
 */

vi.mock("server-only", () => ({}));
const enabled =
  process.env.ATLAS_ANALYST_V2_LIVE_EVALS === "1" &&
  Boolean(process.env.OPENAI_API_KEY);
const suite = enabled ? describe : describe.skip;

const brief: AnalysisBrief = {
  version: "1",
  intent: "lookup",
  language: "en",
  responseStyle: "concise",
  question: "How much did I spend this month?",
  resolvedEntities: [],
  periods: [],
  requirements: [
    {
      id: "total",
      question: "Recorded expenses this month",
      essential: true,
      evidenceNeeded: [],
    },
  ],
  assumptions: [],
  unresolvedReferences: [],
};

suite("live writer model check (opt-in)", () => {
  it.each(ANALYST_MODEL_OPTIONS.map((option) => [option.id]))(
    "%s drafts a checkable lookup",
    async (model) => {
      const ledger = new RunLedger(RUN_BUDGETS.simple, Date.now);
      const consent = legacyEquivalentConsent(new Date().toISOString());
      const result = await synthesizeAnswer({
        brief,
        evidence: legacySpendingV2(),
        derived: [],
        labels: [],
        history: [],
        path: "simple",
        knownReasons: new Map(),
        limitations: [],
        now: V2_NOW,
        models: { writer: model, reviewer: AI_MODELS.planner },
        call: createStageCaller({ ledger, consent, route: SHARED_ROUTE }),
      });
      const writer = result.stages.find((stage) => stage.stage === "writer");
      const passed = result.answer.claims.filter(
        (claim) => claim.verification.deterministic === "passed",
      );
      console.info(
        JSON.stringify({
          requested: model,
          resolved: result.models.writer.resolved,
          writer: writer?.status,
          code: writer?.code ?? null,
          claims: result.answer.claims.length,
          passed: passed.length,
          citesCurrentTotal: passed.some((claim) =>
            claim.evidenceIds.includes(SPENDING_IDS.current),
          ),
          status: result.answer.status,
          usage: ledger.usage,
        }),
      );
      expect(writer).toBeDefined();
    },
  );
});
