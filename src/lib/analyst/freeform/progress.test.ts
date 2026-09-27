import { describe, expect, it } from "vitest";
import { domainsForCalls, parseStreamEvent, stageLabel } from "./progress";

describe("Analyst progress", () => {
  it("names domains from tools and metrics, never from inputs' text", () => {
    expect(
      domainsForCalls([
        { tool: "getTaskFocus", input: {} },
        { tool: "getSignals", input: {} },
        { tool: "getMoneySummary", input: { kind: "income" } },
        {
          tool: "getCrossDomainHistory",
          input: { metrics: ["expense_centavos", "task_completions"] },
        },
        { tool: "getGoalProgress", input: { note: "Private title" } },
      ]),
    ).toEqual(["tasks", "signals", "income", "spending", "goals"]);
  });
  it("labels stages and caps named domains at three", () => {
    expect(stageLabel("reading", ["tasks", "signals"])).toBe(
      "Reading tasks and signals",
    );
    expect(stageLabel("reading", ["tasks", "signals", "goals", "debts"])).toBe(
      "Reading tasks, signals, goals and more",
    );
    expect(stageLabel("reading")).toBe("Reading your records");
    expect(stageLabel("repairing")).toBe(
      "Correcting an answer that failed checks",
    );
  });
  it("accepts only known stages and domains from a stream line", () => {
    expect(
      parseStreamEvent(
        JSON.stringify({
          type: "stage",
          stage: "reading",
          domains: ["tasks", "My secret goal"],
        }),
      ),
    ).toEqual({ type: "stage", stage: "reading", domains: ["tasks"] });
    expect(parseStreamEvent('{"type":"stage","stage":"hacking"}')).toBeNull();
    expect(parseStreamEvent("not json")).toBeNull();
    expect(
      parseStreamEvent('{"type":"result","status":200,"body":{"a":1}}'),
    ).toEqual({ type: "result", status: 200, body: { a: 1 } });
  });
});
