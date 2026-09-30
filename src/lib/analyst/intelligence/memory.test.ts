import { describe, expect, it } from "vitest";
import { deterministicBrief } from "./planning";
import {
  daysLeft,
  memorySuggestion,
  memoryText,
  promptPriorities,
  relatedMemoryIds,
  type Memory,
} from "./memory";
import { planAnalysis } from "./planner";
import {
  SHARED_ROUTE,
  filterProviderPayload,
  legacyEquivalentConsent,
  type ProviderPayload,
} from "./policy";
import type { StageCaller } from "./stages";
import { renderWriterInput } from "./writer";

const now = new Date("2026-09-30T04:00:00.000Z");
const consent = legacyEquivalentConsent("2026-09-30T00:00:00.000Z");
const memories: Memory[] = [
  {
    id: "7f1a0e1c-0000-4000-8000-000000000001",
    text: "Saving for a laptop",
    lastMentionedAt: "2026-09-29T00:00:00.000Z",
  },
  {
    id: "7f1a0e1c-0000-4000-8000-000000000002",
    text: "Spend less on food delivery",
    lastMentionedAt: "2026-07-10T00:00:00.000Z",
  },
];

describe("what may be remembered", () => {
  it("keeps short stated priorities and refuses figures, amounts and links", () => {
    expect(memoryText("  Saving for a   laptop. ")).toBe("Saving for a laptop");
    expect(memoryText("Gusto kong mag-ipon para sa laptop")).toBe(
      "Gusto kong mag-ipon para sa laptop",
    );
    for (const text of [
      "Save 5000 a month",
      "Keep food under ₱3,000",
      "Pay off 2 loans",
      "Save a thousand pesos",
      "see https://example.com",
      "Track {{category:abc}}",
      "ok",
      "x".repeat(161),
      42,
      null,
    ])
      expect(memoryText(text), String(text)).toBeNull();
  });

  it("offers only a valid priority that is not already saved", () => {
    expect(memorySuggestion("saving for a laptop", memories)).toBeNull();
    expect(memorySuggestion("Paying off my loan comes first", memories)).toBe(
      "Paying off my loan comes first",
    );
    expect(memorySuggestion("Save 20% of income", memories)).toBeNull();
    expect(memorySuggestion(null, memories)).toBeNull();
  });

  it("shows the planner short IDs and maps them back to saved ones", () => {
    expect(promptPriorities(memories)).toEqual([
      { id: "p1", text: "Saving for a laptop" },
      { id: "p2", text: "Spend less on food delivery" },
    ]);
    expect(relatedMemoryIds(memories, ["p2", "p9", "p2"])).toEqual([
      memories[1]!.id,
    ]);
  });

  it("counts the days left before an unmentioned priority is forgotten", () => {
    expect(daysLeft(memories[0]!, now)).toBe(89);
    expect(daysLeft(memories[1]!, now)).toBe(8);
  });
});

describe("priorities in provider payloads", () => {
  const payload = (priorities: string[]): ProviderPayload => ({
    stage: "writer",
    question: "How am I doing?",
    history: [],
    evidence: [],
    labels: [],
    priorities,
  });

  it("sends saved priorities with consent and drops any holding a figure", () => {
    const { payload: sent, excluded } = filterProviderPayload(
      payload(["Saving for a laptop", "Save 5000 monthly"]),
      consent,
      SHARED_ROUTE,
    );
    expect(sent.priorities).toEqual(["Saving for a laptop"]);
    expect(excluded).toEqual([
      { kind: "priority", ref: "priority:1", reason: "profile_not_consented" },
    ]);
    expect(
      filterProviderPayload(
        payload(["Saving for a laptop"]),
        null,
        SHARED_ROUTE,
      ).payload.priorities,
    ).toEqual([]);
  });

  it("gives the writer the priorities that passed the filter", () => {
    const brief = deterministicBrief({
      question: "How am I doing?",
      plan: null,
      now,
    });
    const rendered = renderWriterInput(
      brief,
      [],
    )(payload(["Saving for a laptop"])) as { priorities: string[] };
    expect(rendered.priorities).toEqual(["Saving for a laptop"]);
  });
});

describe("the planner and priorities", () => {
  const brief = deterministicBrief({
    question: "I'm saving for a laptop. Am I doing okay?",
    plan: null,
    now,
  });
  const plan = (extra: Record<string, unknown>) => ({
    understanding: "Whether spending leaves room to save for a laptop.",
    intent: "lookup",
    responseStyle: "standard",
    subQuestions: [],
    hypotheses: [],
    comparePreviousPeriod: false,
    period: null,
    clarification: null,
    ...extra,
  });

  it("sees saved priorities under short IDs and reports the ones in play", async () => {
    const requests: Parameters<StageCaller>[0][] = [];
    const call: StageCaller = async (request) => {
      requests.push(request);
      return {
        status: "ok",
        content: plan({
          relatedPriorities: ["p1", "p7"],
          statedPriority: "Saving for a laptop",
        }),
        resolvedModel: "planner",
      };
    };
    const result = await planAnalysis({
      brief,
      history: [],
      model: "gpt-5.4-mini-2026-03-17",
      now,
      allowed: new Set(["money.totals"]),
      defaultedTopic: false,
      call,
      priorities: promptPriorities(memories),
    });
    const [request] = requests;
    expect(request!.payload.priorities).toEqual([
      "Saving for a laptop",
      "Spend less on food delivery",
    ]);
    const rendered = request!.render(request!.payload) as {
      priorities: Array<{ id: string; text: string }>;
    };
    // Short IDs only: no database ID reaches the provider.
    expect(rendered.priorities.map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(JSON.stringify(rendered)).not.toContain(memories[0]!.id);
    expect(result.relatedPriorities).toEqual(["p1"]);
    expect(result.statedPriority).toBe("Saving for a laptop");
  });

  it("reports nothing when the planner fails", async () => {
    const result = await planAnalysis({
      brief,
      history: [],
      model: "gpt-5.4-mini-2026-03-17",
      now,
      allowed: new Set(["money.totals"]),
      defaultedTopic: false,
      call: async () => ({ status: "error", code: "timeout" }),
      priorities: promptPriorities(memories),
    });
    expect(result.relatedPriorities).toEqual([]);
    expect(result.statedPriority).toBeNull();
  });
});
