/**
 * View math for the Career page: stages in order, the pipeline summary the
 * hero leads with, the list view's groups, and how a follow-up's date reads.
 * Dates are compared as Manila calendar days.
 */

export type CareerApplication = {
  id: string;
  company_name: string;
  role_title: string;
  job_url: string | null;
  location: string | null;
  work_setup: string;
  employment_type: string;
  stage: string;
  salary_min_centavos: number | null;
  salary_max_centavos: number | null;
  next_action: string | null;
  next_action_at: string | null;
  applied_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  resume_version: string | null;
  notes: string | null;
  is_follow_up_overdue: boolean;
};

export type CareerEvent = { job_application_id: string; event_type: string };

/** Stages an application moves through while it is still open. */
export const pipelineStages = [
  "interested",
  "preparing",
  "applied",
  "assessment",
  "interview",
  "final_interview",
  "offer",
] as const;

export const closedStages = ["accepted", "rejected", "withdrawn"] as const;

export const careerStages = [...pipelineStages, ...closedStages] as const;

export type CareerStage = (typeof careerStages)[number];
export type PipelineStage = (typeof pipelineStages)[number];

export const stageLabels: Record<CareerStage, string> = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  final_interview: "Final interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function isCareerStage(stage: string): stage is CareerStage {
  return careerStages.includes(stage as CareerStage);
}

export function isOpenStage(stage: string): stage is PipelineStage {
  return pipelineStages.includes(stage as PipelineStage);
}

/** "final_interview" → "Final interview", for any stored value. */
export function sentenceCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function stageLabel(stage: string) {
  return isCareerStage(stage) ? stageLabels[stage] : sentenceCase(stage);
}

/** "Makati · Hybrid", leaving out what is not known. */
export function placeLabel(application: CareerApplication) {
  return [
    application.location,
    application.work_setup !== "unspecified"
      ? sentenceCase(application.work_setup)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const manilaDateKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const shortDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
});

const fullDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Sep 15, 2026" in Manila. */
export function formatCareerDate(iso: string) {
  return fullDate.format(new Date(iso));
}

/** Whole Manila calendar days from `fromIso` to `toIso`. */
export function manilaDayDistance(fromIso: string, toIso: string) {
  const from = Date.parse(
    `${manilaDateKey.format(new Date(fromIso))}T00:00:00Z`,
  );
  const to = Date.parse(`${manilaDateKey.format(new Date(toIso))}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export type DueTone = "overdue" | "today" | "soon" | "later";

export type DueChip = { label: string; tone: DueTone; date: string };

/** How a next action's date reads on a chip, from the viewer's today. */
export function dueChip(
  application: Pick<
    CareerApplication,
    "next_action_at" | "is_follow_up_overdue"
  >,
  nowIso: string,
): DueChip | null {
  if (!application.next_action_at) return null;
  const days = manilaDayDistance(nowIso, application.next_action_at);
  const date = shortDate.format(new Date(application.next_action_at));

  if (application.is_follow_up_overdue) {
    const late = -days;
    return {
      label:
        late <= 0
          ? "Overdue"
          : late === 1
            ? "1 day overdue"
            : `${late} days overdue`,
      tone: "overdue",
      date,
    };
  }
  if (days <= 0) return { label: "Today", tone: "today", date };
  if (days === 1) return { label: "Tomorrow", tone: "soon", date };
  if (days <= 7) return { label: `In ${days} days`, tone: "soon", date };
  return { label: date, tone: "later", date };
}

/** The most pressing dated follow-up: the most overdue, else the soonest. */
export function nextFollowUp(applications: readonly CareerApplication[]) {
  return (
    applications
      .filter(
        (application) =>
          isOpenStage(application.stage) &&
          application.next_action &&
          application.next_action_at,
      )
      .sort((a, b) => {
        const overdue =
          Number(b.is_follow_up_overdue) - Number(a.is_follow_up_overdue);
        if (overdue) return overdue;
        return Date.parse(a.next_action_at!) - Date.parse(b.next_action_at!);
      })[0] ?? null
  );
}

export type Conversion = {
  key: "assessment" | "interview" | "offer";
  label: string;
  /** Who the rate is out of, e.g. "applied". */
  base: string;
  reached: number;
  total: number;
  /** 0–1, or null before anything reached the earlier stage. */
  rate: number | null;
};

const reachedAssessment = [
  "stage_assessment",
  "stage_interview",
  "stage_final_interview",
  "stage_offer",
  "stage_accepted",
];
const reachedInterview = reachedAssessment.slice(1);
const reachedOffer = ["stage_offer", "stage_accepted"];

/**
 * How far applications got, from the stage events they have recorded. An
 * application counts as applied once it has an applied date or reached any
 * stage from applied on.
 */
export function pipelineConversions(
  applications: readonly CareerApplication[],
  events: readonly CareerEvent[],
): Conversion[] {
  const reached = (types: string[]) =>
    new Set(
      events
        .filter((event) => types.includes(event.event_type))
        .map((event) => event.job_application_id),
    );
  const applied = new Set([
    ...applications
      .filter((application) => application.applied_at)
      .map((application) => application.id),
    ...reached(["stage_applied", ...reachedAssessment]),
  ]);
  const assessment = reached(reachedAssessment);
  const interview = reached(reachedInterview);
  const offer = reached(reachedOffer);
  const conversion = (
    key: Conversion["key"],
    label: string,
    base: string,
    hit: Set<string>,
    from: Set<string>,
  ): Conversion => ({
    key,
    label,
    base,
    reached: hit.size,
    total: from.size,
    rate: from.size ? Math.min(1, hit.size / from.size) : null,
  });

  return [
    conversion("assessment", "Assessment", "applied", assessment, applied),
    conversion("interview", "Interview", "assessed", interview, assessment),
    conversion("offer", "Offer", "interviewed", offer, interview),
  ];
}

export type PipelineSummary = {
  counts: Record<CareerStage, number>;
  active: number;
  overdue: number;
  /** Open applications with no dated next action. */
  unplanned: number;
  closed: number;
};

export function pipelineSummary(
  applications: readonly CareerApplication[],
): PipelineSummary {
  const counts = Object.fromEntries(
    careerStages.map((stage) => [stage, 0]),
  ) as Record<CareerStage, number>;
  let overdue = 0;
  let unplanned = 0;
  for (const application of applications) {
    if (isCareerStage(application.stage)) counts[application.stage] += 1;
    if (application.is_follow_up_overdue) overdue += 1;
    if (isOpenStage(application.stage) && !application.next_action_at) {
      unplanned += 1;
    }
  }
  const active = pipelineStages.reduce((sum, stage) => sum + counts[stage], 0);
  const closed = closedStages.reduce((sum, stage) => sum + counts[stage], 0);
  return { counts, active, overdue, unplanned, closed };
}

export type PipelineTone = "positive" | "caution" | "destructive" | "neutral";

/** The hero's status in words, most urgent first. */
export function pipelineStatus(summary: PipelineSummary): {
  label: string;
  tone: PipelineTone;
} {
  const { counts, active, overdue, unplanned } = summary;
  if (overdue > 0) {
    return {
      label:
        overdue === 1 ? "1 follow-up overdue" : `${overdue} follow-ups overdue`,
      tone: "destructive",
    };
  }
  if (counts.accepted > 0) return { label: "Offer accepted", tone: "positive" };
  if (counts.offer > 0) {
    return {
      label:
        counts.offer === 1
          ? "Offer on the table"
          : `${counts.offer} offers on the table`,
      tone: "positive",
    };
  }
  if (active === 0) return { label: "Nothing in motion", tone: "neutral" };
  if (unplanned > 0) {
    return {
      label:
        unplanned === 1
          ? "1 without a next step"
          : `${unplanned} without a next step`,
      tone: "caution",
    };
  }
  return { label: "Every follow-up on track", tone: "positive" };
}

/** Where the open applications stand, furthest along first. */
export function momentumParts(summary: PipelineSummary) {
  const { counts } = summary;
  const interviewing = counts.interview + counts.final_interview;
  const inReview = counts.applied + counts.assessment;
  const early = counts.interested + counts.preparing;
  return [
    counts.offer ? `${counts.offer} at offer` : null,
    interviewing ? `${interviewing} in interviews` : null,
    inReview ? `${inReview} in review` : null,
    early ? `${early} not yet applied` : null,
  ].filter((part): part is string => part !== null);
}

/** ["a", "b", "c"] → "a, b, and c". */
export function joinWords(parts: readonly string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

export type ListGroupId =
  "attention" | "week" | "later" | "unplanned" | "closed";

export type ListGroup = {
  id: ListGroupId;
  label: string;
  detail: string;
  applications: CareerApplication[];
};

const groupCopy: Record<ListGroupId, { label: string; detail: string }> = {
  attention: { label: "Needs attention", detail: "Follow-ups past their date" },
  week: { label: "This week", detail: "Next actions due in the next 7 days" },
  later: { label: "Later", detail: "Next actions further out" },
  unplanned: { label: "No next step", detail: "Open, with nothing scheduled" },
  closed: { label: "Closed", detail: "Accepted, rejected, or withdrawn" },
};

const stageOrder = (stage: string) => {
  const index = careerStages.indexOf(stage as CareerStage);
  return index === -1 ? careerStages.length : index;
};

const time = (iso: string | null, fallback: number) =>
  iso ? Date.parse(iso) : fallback;

/**
 * The list view's sections: what is overdue, what is due this week, what is
 * scheduled later, what is open with nothing scheduled, and what is closed.
 * Empty sections are left out.
 */
export function listGroups(
  applications: readonly CareerApplication[],
  nowIso: string,
): ListGroup[] {
  const buckets: Record<ListGroupId, CareerApplication[]> = {
    attention: [],
    week: [],
    later: [],
    unplanned: [],
    closed: [],
  };
  for (const application of applications) {
    if (!isOpenStage(application.stage)) buckets.closed.push(application);
    else if (application.is_follow_up_overdue)
      buckets.attention.push(application);
    else if (!application.next_action_at) buckets.unplanned.push(application);
    else if (manilaDayDistance(nowIso, application.next_action_at) <= 7)
      buckets.week.push(application);
    else buckets.later.push(application);
  }

  const byDue = (a: CareerApplication, b: CareerApplication) =>
    time(a.next_action_at, Infinity) - time(b.next_action_at, Infinity);
  buckets.attention.sort(byDue);
  buckets.week.sort(byDue);
  buckets.later.sort(byDue);
  // Furthest along first: those are the ones that most need a next step.
  buckets.unplanned.sort((a, b) => stageOrder(b.stage) - stageOrder(a.stage));
  buckets.closed.sort((a, b) => time(b.applied_at, 0) - time(a.applied_at, 0));

  return (Object.keys(buckets) as ListGroupId[])
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, ...groupCopy[id], applications: buckets[id] }));
}

const compactPeso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** "₱120K–₱150K", "From ₱90K", "Up to ₱70K", or null. */
export function salaryRangeLabel(
  minCentavos: number | null,
  maxCentavos: number | null,
) {
  const format = (centavos: number) => compactPeso.format(centavos / 100);
  if (minCentavos != null && maxCentavos != null) {
    return minCentavos === maxCentavos
      ? format(minCentavos)
      : `${format(minCentavos)}–${format(maxCentavos)}`;
  }
  if (minCentavos != null) return `From ${format(minCentavos)}`;
  if (maxCentavos != null) return `Up to ${format(maxCentavos)}`;
  return null;
}

/** A company's mark: "Northstar Labs" → "NL", "Cloudbank" → "C". */
export function companyInitials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return [...words[0]!][0]!.toLocaleUpperCase();
  return (words[0]![0]! + words[1]![0]!).toLocaleUpperCase();
}

/** A stable index into a palette of `size`, from the company's name. */
export function companyHueIndex(name: string, size: number) {
  let hash = 0;
  for (const character of name.trim().toLocaleLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }
  return hash % size;
}
