import { describe, expect, it } from "vitest";
import type { Dayline } from "@/lib/dayline/engine";
import { proposeCareerFollowups, type FollowupSource } from "./engine";

const application: FollowupSource = {
  id: "application-1",
  companyName: "Acme",
  nextActionAt: "2026-09-25T01:00:00Z",
  nextAction: "Email hiring manager",
  stage: "applied",
  updatedAt: "2026-09-24T01:00:00Z",
};
const dayline: Dayline = {
  capacityMinutes: 180,
  plannedMinutes: 20,
  energyLevel: "medium",
  items: [
    {
      id: application.id,
      kind: "career",
      title: "Email hiring manager",
      href: "/career?highlight=application-1",
      durationMinutes: 20,
      energy: "medium",
      position: "NOW",
      reason: "Due today · Critical priority · 20 min estimated",
    },
  ],
};

describe("Next Best Action proposals", () => {
  it("carries the Dayline reason, source, uncertainty and explicit task proposal", () => {
    expect(proposeCareerFollowups(dayline, [application], [])).toEqual([
      {
        id: application.id,
        title: "Email hiring manager",
        taskTitle: "Email hiring manager",
        sourceHref: "/career?highlight=application-1",
        sourceLabel: "Acme",
        expectedAt: application.nextActionAt,
        expectedUpdatedAt: application.updatedAt,
        reason: dayline.items[0]?.reason,
        urgency: "Due today",
        uncertainty: expect.stringContaining("recorded"),
        relatedGoals: [],
      },
    ]);
  });

  it("does not offer missing, terminal, or already handled applications", () => {
    expect(proposeCareerFollowups(dayline, [], [])).toEqual([]);
    expect(
      proposeCareerFollowups(
        dayline,
        [{ ...application, stage: "rejected" }],
        [],
      ),
    ).toEqual([]);
    expect(
      proposeCareerFollowups(
        dayline,
        [application],
        [
          {
            applicationId: application.id,
            expectedAt: application.nextActionAt!,
          },
        ],
      ),
    ).toEqual([]);
  });

  it("keeps recommendations within Dayline rank and a small visible limit", () => {
    const ids = ["one", "two", "three"];
    const result = proposeCareerFollowups(
      {
        ...dayline,
        items: ids.map((id) => ({ ...dayline.items[0]!, id })),
      },
      ids.map((id) => ({ ...application, id })),
      [],
    );
    expect(result.map((item) => item.id)).toEqual(["one", "two"]);
  });

  it("names only Graph links supplied by the owner-scoped loader", () => {
    const result = proposeCareerFollowups(
      dayline,
      [application],
      [],
      [
        {
          applicationId: application.id,
          goalId: "goal-1",
          goalTitle: "Find a role",
        },
      ],
    );
    expect(result[0]?.relatedGoals).toEqual([
      {
        id: "goal-1",
        title: "Find a role",
        href: "/goals?highlight=goal-1",
      },
    ]);
  });
});
