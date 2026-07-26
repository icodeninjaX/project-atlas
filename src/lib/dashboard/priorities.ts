export type PriorityKind =
  "overdue-critical" | "debt" | "career" | "today-task" | "goal";

export type PriorityCandidate = {
  id: string;
  kind: PriorityKind;
  urgency: number;
  title: string;
};

export type DailyPriority = PriorityCandidate & {
  reason: string;
};

const kindRank: Record<PriorityKind, number> = {
  "overdue-critical": 0,
  debt: 1,
  career: 2,
  "today-task": 3,
  goal: 4,
};

const reasons: Record<PriorityKind, string> = {
  "overdue-critical": "Critical and already overdue",
  debt: "A payment deadline is approaching",
  career: "A career follow-up needs attention",
  "today-task": "High-priority work scheduled today",
  goal: "A goal milestone is approaching",
};

export function selectDailyPriorities(
  candidates: PriorityCandidate[],
): DailyPriority[] {
  return [...candidates]
    .sort(
      (left, right) =>
        kindRank[left.kind] - kindRank[right.kind] ||
        right.urgency - left.urgency ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 3)
    .map((candidate) => ({ ...candidate, reason: reasons[candidate.kind] }));
}
