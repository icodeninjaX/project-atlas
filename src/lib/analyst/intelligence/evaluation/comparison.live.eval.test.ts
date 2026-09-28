import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AI_MODELS, type AnalystModelId } from "@/lib/ai/models";
import { legacyEquivalentConsent, SHARED_ROUTE } from "../policy";
import { runAnalystV2 } from "../run";
import { createStageCaller } from "../stages";
import { authorizeHandlesV2, invokeAnalystToolV2 } from "../tools/server";
import { HOLDOUT_CASES, RELEASE_THRESHOLDS, type EvalCase } from "./corpus";
import { createEmulator, fixtureTables, type Emulator } from "./postgrest";
import { scoreRun, type ObservedRun } from "./scoring";

/**
 * Opt-in live comparison on the frozen holdout (AI-07, roadmap §8.4). Three
 * arms run on identical synthetic fixtures:
 *
 * - `legacy`: the existing freeform route with the default model;
 * - `model_only`: the same legacy route with a stronger model;
 * - `v2`: the new architecture with the default model.
 *
 * Each holdout case runs `RELEASE_THRESHOLDS.liveRunsPerHoldoutCase` times
 * per arm. The run records status, deterministic score checks, provider
 * calls, settled tokens and latency, and prints the per-arm summary with its
 * variability. Facts, usefulness and preference need a human or grader and
 * are left as `needs_review`; this suite asserts no quality threshold.
 *
 * It sends metered requests with synthetic aggregates only. Run it only with
 * explicit approval: ATLAS_ANALYST_V2_LIVE_EVALS=1, a configured OpenAI key
 * and the pool meter. It has never been run live. With ATLAS_EVAL_DRY_RUN=1
 * every provider request is blocked, which checks the harness end to end at
 * no cost (every arm then falls back).
 */

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: () => undefined,
}));

const enabled =
  process.env.ATLAS_ANALYST_V2_LIVE_EVALS === "1" &&
  Boolean(process.env.OPENAI_API_KEY);
const suite = enabled ? describe : describe.skip;

const STRONGER: AnalystModelId = "gpt-5.4-2026-03-05";
const ARMS = ["legacy", "model_only", "v2"] as const;
type Arm = (typeof ARMS)[number];

type Sample = {
  arm: Arm;
  caseId: string;
  run: number;
  observed: ObservedRun;
  ms: number;
  tokens: { input: number | null; output: number | null };
};

let emulator: Emulator;
let providerCalls = 0;
let settled: { input: number | null; output: number | null } = {
  input: null,
  output: null,
};
const nativeFetch = globalThis.fetch;

function loadFixtures(item: EvalCase) {
  emulator = createEmulator(fixtureTables(item.variant), item.owner);
  providerCalls = 0;
  settled = { input: null, output: null };
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.host === "localhost:54321") return emulator.fetch(input, init);
    if (url.hostname === "api.openai.com") {
      // A dry run checks the plumbing and must never reach the provider.
      if (process.env.ATLAS_EVAL_DRY_RUN === "1")
        throw new Error("Dry run: provider requests are blocked.");
      providerCalls += 1;
    }
    return nativeFetch(input, init);
  });
  state.createClient.mockImplementation(
    async (options: { fetch?: typeof fetch } = {}) => {
      const client = createSupabaseClient(
        "http://localhost:54321",
        "synthetic-key",
        {
          global: { fetch: options.fetch ?? emulator.fetch },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const getUser = client.auth.getUser.bind(client.auth);
      client.auth.getUser = () => getUser("synthetic-access-token");
      const rpc = client.rpc.bind(client);
      // Quota rows are stubbed; the tokens each arm settles are recorded.
      client.rpc = ((name: string, args?: Record<string, unknown>) => {
        if (name === "reserve_ai_analyst_request_result")
          return Promise.resolve({
            data: { status: "reserved", request_id: 1 },
            error: null,
          });
        if (name === "finish_ai_analyst_request") {
          settled = {
            input: (args?.p_input_tokens as number | null) ?? null,
            output: (args?.p_output_tokens as number | null) ?? null,
          };
          return Promise.resolve({ data: null, error: null });
        }
        return rpc(name, args);
      }) as typeof client.rpc;
      return client;
    },
  );
}

const legacyStatus: Record<string, ObservedRun["status"]> = {
  answered: "answered",
  fallback: "fallback_facts",
  clarification_required: "clarification_required",
  unsupported: "unsupported_capability",
};

async function runLegacy(item: EvalCase, model: AnalystModelId) {
  const { POST } = await import("@/app/api/analyst/freeform/route");
  const response = await POST(
    new Request("http://localhost/api/analyst/freeform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The legacy path has no conversation context: prior turns are lost.
      body: JSON.stringify({
        question: item.question,
        dataSharingAcknowledged: true,
        model,
      }),
    }),
  );
  const body = (await response.json()) as {
    status?: string;
    claims?: Array<{ text: string }>;
    message?: string;
  };
  const text = (body.claims ?? []).map((claim) => claim.text).join(" ");
  return {
    status: legacyStatus[body.status ?? ""] ?? "error",
    text: text || body.message || "",
    claims: (body.claims ?? []).map((claim) => ({
      text: claim.text,
      requirementIds: [],
      verified: true,
    })),
  };
}

async function runV2(item: EvalCase) {
  const consent = legacyEquivalentConsent(new Date().toISOString());
  const policy = { consent, route: SHARED_ROUTE };
  const key = randomBytes(32);
  const ask = (question: string, contextToken: string | null) =>
    runAnalystV2(
      {
        ownerId: item.owner,
        question,
        contextToken,
        model: AI_MODELS.analyst,
        consent,
        route: SHARED_ROUTE,
      },
      {
        invoke: (tool, input) => invokeAnalystToolV2(tool, input, policy),
        authorize: (handles) => authorizeHandlesV2(handles, policy),
        stageCaller: (ledger) =>
          createStageCaller({ ledger, consent, route: SHARED_ROUTE }),
        contextKey: key,
        now: () => new Date(item.clock),
        clock: Date.now,
      },
    );
  let context: string | null = null;
  for (const turn of item.prior)
    context = (await ask(turn.question, context)).context;
  providerCalls = 0;
  const response = await ask(item.question, context);
  settled = {
    input: response.usage.inputTokens,
    output: response.usage.outputTokens,
  };
  const claims = [
    ...response.presentation.direct,
    ...response.presentation.findings,
    ...response.presentation.options,
  ];
  return {
    status: response.status,
    text: claims.map((claim) => claim.text).join(" "),
    claims: claims.map((claim) => ({
      text: claim.text,
      requirementIds: [],
      verified: true,
    })),
  };
}

async function sample(item: EvalCase, arm: Arm, run: number): Promise<Sample> {
  loadFixtures(item);
  const started = Date.now();
  const result =
    arm === "v2"
      ? await runV2(item)
      : await runLegacy(item, arm === "legacy" ? AI_MODELS.analyst : STRONGER);
  const observed: ObservedRun = {
    caseId: item.id,
    implementation: arm === "v2" ? "v2" : "legacy",
    model: null,
    status: result.status,
    text: result.text,
    claims: result.claims,
    facts: {},
    unresolvedRequirementIds: [],
    toolCalls: [],
    modelCalls: providerCalls,
    ownerIdsTouched: [item.owner],
  };
  return {
    arm,
    caseId: item.id,
    run,
    observed,
    ms: Date.now() - started,
    tokens: settled,
  };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : null;
};

suite("live holdout comparison (opt-in)", () => {
  it("runs every holdout case on each arm and reports the counts", async () => {
    const samples: Sample[] = [];
    for (const item of HOLDOUT_CASES)
      for (const arm of ARMS)
        for (
          let run = 1;
          run <= RELEASE_THRESHOLDS.liveRunsPerHoldoutCase;
          run++
        )
          samples.push(await sample(item, arm, run));
    vi.unstubAllGlobals();
    const byCase = new Map(HOLDOUT_CASES.map((item) => [item.id, item]));
    for (const arm of ARMS) {
      const mine = samples.filter((item) => item.arm === arm);
      const scores = mine.map((item) =>
        scoreRun(byCase.get(item.caseId)!, item.observed),
      );
      // Status agreement per case across runs shows variability.
      const perCase = HOLDOUT_CASES.map((item) => {
        const runs = scores.filter((score) => score.caseId === item.id);
        return runs.filter((score) => score.checks.status).length;
      });
      console.info(
        JSON.stringify({
          arm,
          samples: mine.length,
          statuses: mine.reduce<Record<string, number>>((tally, item) => {
            tally[item.observed.status] =
              (tally[item.observed.status] ?? 0) + 1;
            return tally;
          }, {}),
          statusMatches: scores.filter((score) => score.checks.status).length,
          casesStableAcrossRuns: perCase.filter(
            (count) =>
              count === 0 ||
              count === RELEASE_THRESHOLDS.liveRunsPerHoldoutCase,
          ).length,
          forbiddenHits: scores.filter((score) => score.checks.forbidden.length)
            .length,
          hardGateFailures: scores.flatMap((score) => score.hardGateFailures),
          providerCalls: mine.reduce(
            (sum, item) => sum + item.observed.modelCalls,
            0,
          ),
          inputTokens: mine.reduce(
            (sum, item) => sum + (item.tokens.input ?? 0),
            0,
          ),
          outputTokens: mine.reduce(
            (sum, item) => sum + (item.tokens.output ?? 0),
            0,
          ),
          unknownTokenSamples: mine.filter((item) => item.tokens.input === null)
            .length,
          medianMs: median(mine.map((item) => item.ms)),
        }),
      );
    }
    expect(samples).toHaveLength(
      HOLDOUT_CASES.length *
        ARMS.length *
        RELEASE_THRESHOLDS.liveRunsPerHoldoutCase,
    );
  }, 3_600_000);
});
