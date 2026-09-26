import { describe, expect, it } from "vitest";
import { getSignalSourceReferences } from "@/lib/graph/derived";
import {
  groupRelatedItems,
  materializeRelationships,
  type GraphEdge,
} from "@/lib/graph/model";
import {
  explicitGraphPairs,
  findExplicitPair,
  graphRegistry,
  isGraphEntityType,
  type GraphEntitySummary,
} from "@/lib/graph/registry";
import type { Signal } from "@/lib/signals/engine";

const goal: GraphEntitySummary = {
  type: "goal",
  id: "g",
  title: "Get a developer job",
  subtitle: "active",
  href: "/goals?highlight=g",
};
const task: GraphEntitySummary = {
  type: "task",
  id: "t",
  title: "Prepare CV",
  subtitle: "planned",
  href: "/tasks?highlight=t",
};
const knowledge: GraphEntitySummary = {
  type: "knowledge_concept",
  id: "k",
  title: "Server Actions",
  subtitle: null,
  href: "/knowledge?highlight=k",
};
const summaries = new Map([
  ["goal:g", goal],
  ["task:t", task],
  ["knowledge_concept:k", knowledge],
]);
const edges: GraphEdge[] = [
  {
    id: "native:task:t",
    sourceType: "task",
    sourceId: "t",
    targetType: "goal",
    targetId: "g",
    kind: "task_goal",
    origin: "native",
  },
  {
    id: "manual:k:g",
    sourceType: "knowledge_concept",
    sourceId: "k",
    targetType: "goal",
    targetId: "g",
    kind: "supports_goal",
    origin: "manual",
  },
];

describe("Graph registry", () => {
  it("contains the controlled source and target vocabulary", () => {
    expect(explicitGraphPairs).toHaveLength(6);
    expect(findExplicitPair("task", "goal", "supports_goal")).toBeUndefined();
    expect(
      findExplicitPair("knowledge_concept", "goal", "supports_goal"),
    ).toBeDefined();
    expect(isGraphEntityType("project")).toBe(false);
    expect(
      graphRegistry.job_application.summarize({
        id: "a",
        company_name: "Acme",
        role_title: "Developer",
        stage: "applied",
      }).title,
    ).toBe("Acme · Developer");
  });
});

describe("one-hop relationship materialization", () => {
  it("reads the same edge from either endpoint and keeps native links non-removable", () => {
    const fromGoal = materializeRelationships(
      edges,
      summaries,
      { type: "goal", id: "g" },
      10,
    );
    const fromKnowledge = materializeRelationships(
      edges,
      summaries,
      { type: "knowledge_concept", id: "k" },
      10,
    );
    expect(fromGoal.items.map((item) => item.related.title)).toEqual([
      "Prepare CV",
      "Server Actions",
    ]);
    expect(fromKnowledge.items[0]?.related.title).toBe("Get a developer job");
    expect(fromGoal.items[0]?.removable).toBe(false);
    expect(fromGoal.items[1]?.removable).toBe(true);
  });

  it("groups by related type, limits output, and ignores deleted endpoints", () => {
    const page = materializeRelationships(
      edges,
      summaries,
      { type: "goal", id: "g" },
      1,
    );
    expect(page.hasMore).toBe(true);
    expect(groupRelatedItems(page.items).task).toHaveLength(1);
    const stale = materializeRelationships(
      edges,
      new Map([
        ["goal:g", goal],
        ["task:t", task],
      ]),
      { type: "goal", id: "g" },
      10,
    );
    expect(stale.items).toHaveLength(1);
  });

  it("exposes an existing milestone as a native goal edge", () => {
    const milestone: GraphEntitySummary = {
      type: "goal_milestone",
      id: "m",
      title: "Complete portfolio",
      subtitle: null,
      href: "/goals?highlight=g&milestone=m",
    };
    const edge: GraphEdge = {
      id: "native:goal_milestone:m",
      sourceType: "goal_milestone",
      sourceId: "m",
      targetType: "goal",
      targetId: "g",
      kind: "milestone_goal",
      origin: "native",
    };
    const resolved = materializeRelationships(
      [edge],
      new Map([
        ["goal:g", goal],
        ["goal_milestone:m", milestone],
      ]),
      { type: "goal", id: "g" },
      10,
    );
    expect(resolved.items[0]?.related.title).toBe("Complete portfolio");
    expect(resolved.items[0]?.removable).toBe(false);
  });

  it("traces a decision through its goal, action, observation, and cited source", () => {
    const decision: GraphEntitySummary = {
      type: "decision",
      id: "d",
      title: "Apply weekly",
      subtitle: "2026-09-01",
      href: "/decisions/d",
    };
    const observation: GraphEntitySummary = {
      type: "decision_observation",
      id: "o",
      title: "Sent an application",
      subtitle: "2026-09-10",
      href: "/decisions/d#observation-o",
    };
    const application: GraphEntitySummary = {
      type: "job_application",
      id: "a",
      title: "Acme · Developer",
      subtitle: "applied",
      href: "/career?highlight=a",
    };
    const links: GraphEdge[] = [
      {
        id: "dg",
        sourceType: "decision",
        sourceId: "d",
        targetType: "goal",
        targetId: "g",
        kind: "decision_goal",
        origin: "native",
      },
      {
        id: "da",
        sourceType: "decision",
        sourceId: "d",
        targetType: "task",
        targetId: "t",
        kind: "decision_action",
        origin: "native",
      },
      {
        id: "od",
        sourceType: "decision_observation",
        sourceId: "o",
        targetType: "decision",
        targetId: "d",
        kind: "observation_decision",
        origin: "native",
      },
      {
        id: "os",
        sourceType: "decision_observation",
        sourceId: "o",
        targetType: "job_application",
        targetId: "a",
        kind: "observation_source",
        origin: "native",
      },
    ];
    const records = new Map([
      ...summaries,
      ["decision:d", decision] as const,
      ["decision_observation:o", observation] as const,
      ["job_application:a", application] as const,
    ]);
    expect(
      materializeRelationships(
        links,
        records,
        { type: "decision", id: "d" },
        10,
      ).items.map((item) => item.related.type),
    ).toEqual(["goal", "task", "decision_observation"]);
    expect(
      materializeRelationships(
        links,
        records,
        { type: "decision_observation", id: "o" },
        10,
      ).items.map((item) => item.related.type),
    ).toEqual(["decision", "job_application"]);
    expect(
      materializeRelationships(
        links,
        records,
        { type: "job_application", id: "a" },
        10,
      ).items[0]?.removable,
    ).toBe(false);
  });
});

it("keeps signal provenance derived and ephemeral", () => {
  const signal = {
    id: "deadline",
    title: "Debt due",
    sourceRefs: [{ type: "debt", id: "d" }],
  } as Signal;
  expect(getSignalSourceReferences(signal)).toEqual([
    {
      origin: "derived",
      source: { type: "signal", id: "deadline", title: "Debt due" },
      target: { type: "debt", id: "d" },
    },
  ]);
});
