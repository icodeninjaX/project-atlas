import { describe, expect, it } from "vitest";
import {
  companyHueIndex,
  companyInitials,
  dueChip,
  joinWords,
  listGroups,
  momentumParts,
  nextFollowUp,
  pipelineConversions,
  pipelineStatus,
  pipelineSummary,
  salaryRangeLabel,
  type CareerApplication,
} from "./view";

const now = "2026-10-02T11:00:00Z"; // 7:00 PM, October 2 in Manila

function application(
  overrides: Partial<CareerApplication> & { id: string },
): CareerApplication {
  return {
    company_name: "Northstar Labs",
    role_title: "Frontend Engineer",
    job_url: null,
    location: null,
    work_setup: "unspecified",
    employment_type: "full_time",
    stage: "applied",
    salary_min_centavos: null,
    salary_max_centavos: null,
    next_action: null,
    next_action_at: null,
    applied_at: null,
    contact_name: null,
    contact_email: null,
    resume_version: null,
    notes: null,
    is_follow_up_overdue: false,
    ...overrides,
  };
}

describe("career view", () => {
  it("reads a follow-up date as Manila days from now", () => {
    const due = (date: string, overdue = false) =>
      dueChip(
        {
          next_action_at: `${date}T09:00:00+08:00`,
          is_follow_up_overdue: overdue,
        },
        now,
      );

    expect(
      dueChip({ next_action_at: null, is_follow_up_overdue: false }, now),
    ).toBeNull();
    expect(due("2026-09-29", true)).toMatchObject({
      label: "3 days overdue",
      tone: "overdue",
      date: "Sep 29",
    });
    expect(due("2026-10-01", true)?.label).toBe("1 day overdue");
    expect(due("2026-10-02", true)?.label).toBe("Overdue");
    expect(due("2026-10-02")).toMatchObject({ label: "Today", tone: "today" });
    expect(due("2026-10-03")).toMatchObject({
      label: "Tomorrow",
      tone: "soon",
    });
    expect(due("2026-10-09")).toMatchObject({
      label: "In 7 days",
      tone: "soon",
    });
    expect(due("2026-10-21")).toMatchObject({ label: "Oct 21", tone: "later" });
  });

  it("picks the most overdue follow-up first, then the soonest", () => {
    const soon = application({
      id: "soon",
      next_action: "Send portfolio",
      next_action_at: "2026-10-03T01:00:00Z",
    });
    const late = application({
      id: "late",
      next_action: "Follow up",
      next_action_at: "2026-09-30T01:00:00Z",
      is_follow_up_overdue: true,
    });
    const later = application({
      id: "later",
      next_action: "Follow up",
      next_action_at: "2026-09-28T01:00:00Z",
      is_follow_up_overdue: true,
    });
    const closed = application({
      id: "closed",
      stage: "rejected",
      next_action: "Ask for feedback",
      next_action_at: "2026-09-01T01:00:00Z",
    });
    const undated = application({ id: "undated", next_action: "Research" });

    expect(nextFollowUp([soon, late, later, closed, undated])?.id).toBe(
      "later",
    );
    expect(nextFollowUp([soon, closed, undated])?.id).toBe("soon");
    expect(nextFollowUp([closed, undated])).toBeNull();
  });

  it("counts conversions from stage events and applied dates", () => {
    const applications = [
      application({ id: "a", applied_at: "2026-09-01T04:00:00Z" }),
      application({ id: "b", applied_at: "2026-09-02T04:00:00Z" }),
      application({ id: "c" }),
      application({ id: "d", stage: "interested" }),
    ];
    const events = [
      { job_application_id: "c", event_type: "stage_applied" },
      { job_application_id: "a", event_type: "stage_assessment" },
      { job_application_id: "a", event_type: "stage_interview" },
      { job_application_id: "b", event_type: "stage_assessment" },
    ];

    expect(pipelineConversions(applications, events)).toEqual([
      expect.objectContaining({ key: "assessment", reached: 2, total: 3 }),
      expect.objectContaining({
        key: "interview",
        reached: 1,
        total: 2,
        rate: 0.5,
      }),
      expect.objectContaining({ key: "offer", reached: 0, total: 1, rate: 0 }),
    ]);
    expect(pipelineConversions([], [])[0]?.rate).toBeNull();
  });

  it("summarizes the pipeline and names its status, most urgent first", () => {
    const summary = pipelineSummary([
      application({ id: "1", stage: "interview", next_action_at: now }),
      application({ id: "2", stage: "final_interview", next_action_at: now }),
      application({ id: "3", stage: "applied" }),
      application({ id: "4", stage: "preparing", next_action_at: now }),
      application({ id: "5", stage: "rejected" }),
    ]);

    expect(summary).toMatchObject({
      active: 4,
      overdue: 0,
      unplanned: 1,
      closed: 1,
    });
    expect(pipelineStatus(summary)).toEqual({
      label: "1 without a next step",
      tone: "caution",
    });
    expect(joinWords(momentumParts(summary))).toBe(
      "2 in interviews, 1 in review, and 1 not yet applied",
    );

    expect(pipelineStatus({ ...summary, overdue: 2 })).toEqual({
      label: "2 follow-ups overdue",
      tone: "destructive",
    });
    expect(
      pipelineStatus({
        ...summary,
        counts: { ...summary.counts, offer: 1 },
      }).label,
    ).toBe("Offer on the table");
    expect(
      pipelineStatus(
        pipelineSummary([application({ id: "x", stage: "withdrawn" })]),
      ),
    ).toEqual({ label: "Nothing in motion", tone: "neutral" });
  });

  it("groups the list by what each application needs next", () => {
    const groups = listGroups(
      [
        application({ id: "later", next_action_at: "2026-10-20T01:00:00Z" }),
        application({
          id: "closed-old",
          stage: "withdrawn",
          applied_at: "2026-08-01T01:00:00Z",
        }),
        application({ id: "week", next_action_at: "2026-10-05T01:00:00Z" }),
        application({
          id: "closed-new",
          stage: "rejected",
          applied_at: "2026-09-01T01:00:00Z",
        }),
        application({ id: "today", next_action_at: "2026-10-02T13:00:00Z" }),
        application({ id: "early", stage: "interested" }),
        application({ id: "offer", stage: "offer" }),
        application({
          id: "overdue",
          next_action_at: "2026-09-30T01:00:00Z",
          is_follow_up_overdue: true,
        }),
      ],
      now,
    );

    expect(
      groups.map((group) => [
        group.id,
        group.applications.map((item) => item.id),
      ]),
    ).toEqual([
      ["attention", ["overdue"]],
      ["week", ["today", "week"]],
      ["later", ["later"]],
      ["unplanned", ["offer", "early"]],
      ["closed", ["closed-new", "closed-old"]],
    ]);
    expect(listGroups([], now)).toEqual([]);
  });

  it("formats salary ranges compactly", () => {
    expect(salaryRangeLabel(12_000_000, 15_000_000)).toBe("₱120K–₱150K");
    expect(salaryRangeLabel(9_000_000, 9_000_000)).toBe("₱90K");
    expect(salaryRangeLabel(9_050_000, null)).toBe("From ₱90.5K");
    expect(salaryRangeLabel(null, 7_000_000)).toBe("Up to ₱70K");
    expect(salaryRangeLabel(null, null)).toBeNull();
  });

  it("gives each company a stable mark", () => {
    expect(companyInitials("Northstar Labs")).toBe("NL");
    expect(companyInitials("Cloudbank")).toBe("C");
    expect(companyInitials("  (Arc) studio & co ")).toBe("AS");
    expect(companyInitials("—")).toBe("?");
    expect(companyHueIndex("Cloudbank", 8)).toBe(
      companyHueIndex(" cloudbank", 8),
    );
    expect(companyHueIndex("Cloudbank", 8)).toBeLessThan(8);
  });
});
