import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_MODELS } from "@/lib/ai/models";
import { legacyEquivalentConsent, SHARED_ROUTE } from "../policy";
import { runAnalystV2, type V2Response } from "../run";
import type { StageCaller } from "../stages";
import { authorizeHandlesV2, invokeAnalystToolV2 } from "../tools/server";
import { createEmulator, fixtureTables, type Emulator } from "./postgrest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: state.createClient }));

let emulator: Emulator;
const key = randomBytes(32);
const consent = legacyEquivalentConsent("2026-09-24T00:00:00.000Z");

beforeEach(() => {
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
      return client;
    },
  );
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    emulator.fetch(input, init),
  );
});
afterEach(() => vi.unstubAllGlobals());
import { FIXTURE_CLOCK, OWNER_A } from "./fixtures";

/**
 * Regressions from the preview deployment, replayed on the synthetic
 * fixtures with a scripted writer: an ordinary, well-formed draft must not
 * be rejected wholesale, and a total must not pass for a ranking.
 */

type Input = {
  requirements: Array<{ id: string }>;
  evidence: Array<{ id: string }>;
  derivedFacts: Array<{ id: string; operation: string }>;
};
type Draft = (input: Input, stage: string) => unknown;

async function ask(question: string, draft: Draft) {
  emulator = createEmulator(fixtureTables(), OWNER_A);
  const policy = { consent, route: SHARED_ROUTE };
  const stages: string[] = [];
  const caller: StageCaller = async (request) => {
    stages.push(request.stage);
    const content = draft(
      request.render(request.payload) as Input,
      request.stage,
    );
    return content
      ? { status: "ok", content, resolvedModel: "synthetic-writer" }
      : { status: "error", code: "provider_error" };
  };
  const response = await runAnalystV2(
    {
      ownerId: OWNER_A,
      question,
      contextToken: null,
      model: AI_MODELS.analyst,
      consent,
      route: SHARED_ROUTE,
    },
    {
      invoke: (tool, input) => invokeAnalystToolV2(tool, input, policy),
      authorize: (handles) => authorizeHandlesV2(handles, policy),
      stageCaller: () => caller,
      contextKey: key,
      now: () => new Date(FIXTURE_CLOCK),
      clock: () => 0,
      emit: () => {},
    },
  );
  return { response, stages };
}

const find = (input: Input, part: string) =>
  input.evidence.find((item) => item.id.includes(part))!.id;
const claim = (
  id: string,
  requirement: string,
  text: string,
  scopeId: string,
  evidenceIds: string[],
  derivedFactIds: string[] = [],
) => ({
  id,
  kind: "fact",
  text,
  answersRequirementIds: [requirement],
  evidenceIds,
  derivedFactIds,
  assumptionIds: [],
  scopeId,
  comparison: null,
  recommendation: null,
});
const draftOf = (claims: unknown[], direct: string[]) => ({
  version: "2",
  directAnswerClaimIds: direct,
  claims,
  sections: [],
  table: null,
});
const shown = (response: V2Response) =>
  [...response.presentation.direct, ...response.presentation.findings].map(
    (item) => item.text,
  );
const reviews = "whole_domain:getWeeklyReviewMetrics";

describe("preview regressions", () => {
  it("answers a weekly review summary from fewer than twelve reviews", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { response, stages } = await ask(
      "Summarize my weekly reviews",
      (input) =>
        draftOf(
          [
            claim(
              "c1",
              "r_reviews",
              "You completed 7 weekly reviews, with an average overall score of 6.6.",
              reviews,
              [find(input, "reviews.count"), find(input, "overall_score")],
            ),
            claim(
              "c2",
              "r_reviews",
              "Your recent overall score is 1.3 points higher than earlier.",
              reviews,
              [find(input, "overall_change")],
            ),
          ],
          ["c1", "c2"],
        ),
    );
    warn.mockRestore();
    expect(response.status).toBe("answered");
    expect(shown(response)).toHaveLength(2);
    expect(response.presentation.verification.figures).toMatch(/^2 of 2 /);
    expect(response.presentation.unresolved).toEqual([]);
    // Nothing was rejected, so no repair was requested.
    expect(stages).toEqual(["writer"]);
  });

  it("still rejects a change direction that contradicts the tool's sign", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { response } = await ask("Summarize my weekly reviews", (input) =>
      draftOf(
        [
          claim(
            "c1",
            "r_reviews",
            "Your recent overall score is 1.3 points lower than earlier.",
            reviews,
            [find(input, "overall_change")],
          ),
        ],
        ["c1"],
      ),
    );
    warn.mockRestore();
    expect(shown(response).join(" ")).not.toMatch(/lower/);
  });

  it("shows checked ATLAS figures when nothing the writer proposed passes", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { response, stages } = await ask(
      "Summarize my weekly reviews",
      (input) =>
        draftOf(
          [
            // A figure no evidence carries fails every attempt.
            claim(
              "c1",
              "r_reviews",
              "You completed 9 weekly reviews this quarter.",
              reviews,
              [find(input, "reviews.count")],
            ),
          ],
          ["c1"],
        ),
    );
    expect(stages).toEqual(["writer", "repair"]);
    expect(response.status).toBe("fallback_facts");
    expect(shown(response).join(" ")).toMatch(/Completed reviews analyzed.*7/);
    expect(response.presentation.limitations.join(" ")).toMatch(
      /did not pass ATLAS checks/,
    );
    // The log names rules only, never claim text.
    const logged = JSON.stringify(warn.mock.calls);
    warn.mockRestore();
    expect(logged).toMatch(/figure/);
    expect(logged).not.toMatch(/weekly reviews this quarter/);
  });

  it("answers where spending is highest with the ranking", async () => {
    const { response } = await ask(
      "Where do you think I overspend the most?",
      (input) => {
        const rank = input.derivedFacts.find(
          (item) => item.operation === "rank",
        )!.id;
        return draftOf(
          [
            claim(
              "c1",
              "r_money",
              "Groceries is your largest spending category at ₱5,000.00.",
              "cohort:expense_by_category",
              [],
              [rank],
            ),
          ],
          ["c1"],
        );
      },
    );
    expect(response.status).toBe("answered");
    expect(shown(response)).toEqual([
      "Groceries is your largest spending category at ₱5,000.00.",
    ]);
  });

  it("answers a ranking with ATLAS's own ranking when the writer gives only a total", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { response, stages } = await ask(
      "Where do you think I overspend the most?",
      (input) =>
        draftOf(
          [
            claim(
              "c1",
              input.requirements[0]!.id,
              "Your recorded expenses total ₱11,000.00 from September 1 to 24, 2026.",
              "whole_domain:expense",
              [find(input, "expense.total")],
            ),
          ],
          ["c1"],
        ),
    );
    warn.mockRestore();
    // The total alone does not answer it, so a repair is requested; with
    // none, ATLAS states the top of its ranking first.
    expect(stages).toEqual(["writer", "repair"]);
    expect(response.status).toBe("answered");
    expect(shown(response)).toEqual([
      "Largest recorded expense category: Groceries, ₱5,000.00 from Sep 1, 2026 to Sep 24, 2026.",
      "Your recorded expenses total ₱11,000.00 from September 1 to 24, 2026.",
    ]);
  });

  it("checks a share of the total against ATLAS's share, and reports a rejection as one", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { response } = await ask(
      "Where do you think I overspend the most?",
      (input, stage) => {
        const rank = input.derivedFacts.find(
          (item) => item.operation === "rank",
        )!.id;
        const share = input.derivedFacts.find((item) =>
          item.id.startsWith("derived.share.category:f3ee7a14"),
        )!.id;
        return draftOf(
          [
            claim(
              "c1",
              "r_money",
              stage === "writer"
                ? // 5,000 of 11,000 is 45.5%, not 50%.
                  "Groceries is your largest category at ₱5,000.00, 50% of your ₱11,000.00 total."
                : "Groceries is your largest category at ₱5,000.00, 45.5% of your ₱11,000.00 total.",
              "cohort:expense_by_category",
              [],
              [rank, share],
            ),
            {
              ...claim(
                "c2",
                "r_money",
                "A ranking alone cannot show overspending; no budget is recorded.",
                "cohort:expense_by_category",
                [],
              ),
              kind: "limitation",
            },
          ],
          ["c1"],
        );
      },
    );
    warn.mockRestore();
    expect(response.status).toBe("answered");
    expect(shown(response)[0]).toBe(
      "Groceries is your largest category at ₱5,000.00, 45.5% of your ₱11,000.00 total.",
    );
  });

  it("never reports a rejected ranking beside a caveat as missing records", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { response, stages } = await ask(
      "Where do you think I overspend the most?",
      (input, stage) => {
        if (stage !== "writer") return null;
        const rank = input.derivedFacts.find(
          (item) => item.operation === "rank",
        )!.id;
        return draftOf(
          [
            // A share the writer computed itself, across two scopes.
            claim(
              "c1",
              "r_money",
              "Groceries is your largest category at ₱5,000.00, about 45% of your ₱11,000.00 total.",
              "cohort:expense_by_category",
              [find(input, "expense.total")],
              [rank],
            ),
            {
              ...claim(
                "c2",
                "r_money",
                "Spending rank alone cannot establish overspending; no budgets or spending targets are supplied.",
                "cohort:expense_by_category",
                [],
              ),
              kind: "limitation",
            },
          ],
          ["c1"],
        );
      },
    );
    warn.mockRestore();
    // The rejection earns a repair; with none, ATLAS states its ranking.
    expect(stages).toEqual(["writer", "repair"]);
    expect(response.status).toBe("answered");
    expect(shown(response)[0]).toMatch(
      /^Largest recorded expense category: Groceries/,
    );
    expect(JSON.stringify(response.presentation)).not.toMatch(
      /does not have enough records/,
    );
  });
});
