export const DEFAULT_DAYLINE_CAPACITY_MINUTES = 180;
export const DEFAULT_TASK_ESTIMATE_MINUTES = 30;
export const DAYLINE_MAX_ITEMS = 3;

export type DaylineEnergy = "low" | "medium" | "high";
export type DaylinePriority = "low" | "medium" | "high" | "critical";
export type DaylinePosition = "NOW" | "NEXT" | "LATER";
export type DaylineKind = "task" | "debt" | "career" | "goal";

export type DaylineTask = {
  id: string;
  title: string;
  status: string;
  priority: DaylinePriority;
  dueAt: string | null;
  scheduledFor: string | null;
  estimatedMinutes: number | null;
  energyRequired: DaylineEnergy;
  relatedGoalId: string | null;
  createdAt: string;
};

export type DaylineDebt = {
  id: string;
  creditorName: string;
  status: string;
  nextDueDate: string | null;
  createdAt: string;
};

export type DaylineApplication = {
  id: string;
  companyName: string;
  stage: string;
  nextAction: string | null;
  nextActionAt: string | null;
  createdAt: string;
};

export type DaylineMilestone = {
  id: string;
  goalId: string;
  title: string;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type DaylineSourceData = {
  capacityMinutes: number;
  energyLevel: DaylineEnergy;
  tasks: DaylineTask[];
  debts: DaylineDebt[];
  applications: DaylineApplication[];
  milestones: DaylineMilestone[];
};

export type DaylineItem = {
  id: string;
  kind: DaylineKind;
  title: string;
  href: string;
  durationMinutes: number;
  energy: DaylineEnergy;
  position: DaylinePosition;
  reason: string;
};

export type Dayline = {
  items: DaylineItem[];
  capacityMinutes: number;
  plannedMinutes: number;
  energyLevel: DaylineEnergy;
};

type RankedCandidate = Omit<DaylineItem, "position" | "reason"> & {
  actionDate: string | null;
  createdAt: string;
  score: number;
  urgent: boolean;
  reasons: string[];
};

const energyRank: Record<DaylineEnergy, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const priorityScore: Record<DaylinePriority, number> = {
  low: 0,
  medium: 12,
  high: 30,
  critical: 50,
};

const positions: DaylinePosition[] = ["NOW", "NEXT", "LATER"];
const terminalApplicationStages = new Set([
  "rejected",
  "withdrawn",
  "accepted",
]);

function manilaIsoDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function dayNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000;
}

function daysFromToday(value: string | null, today: string): number | null {
  return value ? dayNumber(value) - dayNumber(today) : null;
}

function earliestDate(...values: Array<string | null>): string | null {
  const present = values.filter((value): value is string => Boolean(value));
  return present.length ? (present.sort()[0] ?? null) : null;
}

function normalizedDuration(value: number | null | undefined): number {
  return Number.isFinite(value) && value && value > 0
    ? Math.min(Math.floor(value), 1_440)
    : DEFAULT_TASK_ESTIMATE_MINUTES;
}

function normalizedCapacity(value: number): number {
  return Number.isFinite(value) && value >= 15
    ? Math.min(Math.floor(value), 720)
    : DEFAULT_DAYLINE_CAPACITY_MINUTES;
}

function ageInDays(createdAt: string, now: Date): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000),
  );
}

function ageScore(createdAt: string, now: Date): number {
  const ageDays = ageInDays(createdAt, now);
  return Math.min(Math.floor(ageDays / 7), 12);
}

function ageReason(createdAt: string, now: Date): string | null {
  const ageDays = ageInDays(createdAt, now);
  return ageDays >= 7 ? `Waiting ${ageDays} days` : null;
}

function scheduleScore(days: number | null): number {
  if (days === null) return 0;
  if (days < 0) return 140 + Math.min(Math.abs(days), 30);
  if (days === 0) return 110;
  if (days <= 2) return 75;
  if (days <= 7) return 45;
  return 0;
}

function effortScore(duration: number, capacity: number): number {
  if (duration > capacity) return -35;
  return duration <= 30 ? 18 : 8;
}

function energyScore(
  required: DaylineEnergy,
  available: DaylineEnergy,
): number {
  const difference = energyRank[required] - energyRank[available];
  if (difference === 0) return 10;
  return difference < 0 ? 6 : difference * -18;
}

function dateReason(
  days: number | null,
  scheduledToday = false,
): string | null {
  if (days === null) return null;
  if (days < 0) {
    const count = Math.abs(days);
    return `Overdue by ${count} ${count === 1 ? "day" : "days"}`;
  }
  if (days === 0) return scheduledToday ? "Scheduled today" : "Due today";
  return `Due in ${days} ${days === 1 ? "day" : "days"}`;
}

function taskDateReason(
  task: DaylineTask,
  actionDate: string | null,
  dueDate: string | null,
  days: number | null,
): string | null {
  if (days === null || days <= 0) {
    return dateReason(
      days,
      task.scheduledFor === actionDate && dueDate !== actionDate,
    );
  }
  const dayLabel = `${days} ${days === 1 ? "day" : "days"}`;
  return task.scheduledFor === actionDate && dueDate !== actionDate
    ? `Scheduled in ${dayLabel}`
    : `Due in ${dayLabel}`;
}

function energyReason(
  required: DaylineEnergy,
  available: DaylineEnergy,
): string {
  return energyRank[required] > energyRank[available]
    ? `${required[0]?.toUpperCase()}${required.slice(1)} energy—above your ${available}-energy mode`
    : `${required[0]?.toUpperCase()}${required.slice(1)} energy`;
}

function priorityLabel(priority: DaylinePriority): string {
  return `${priority[0]?.toUpperCase()}${priority.slice(1)} priority`;
}

function taskCandidate(
  task: DaylineTask,
  today: string,
  capacity: number,
  availableEnergy: DaylineEnergy,
  now: Date,
): RankedCandidate | null {
  if (["completed", "cancelled"].includes(task.status)) return null;

  const dueDate = task.dueAt ? manilaIsoDate(task.dueAt) : null;
  const actionDate = earliestDate(task.scheduledFor, dueDate);
  const days = daysFromToday(actionDate, today);
  const eligible =
    (days !== null && days <= 7) ||
    task.priority === "high" ||
    task.priority === "critical";
  if (!eligible) return null;

  const durationMinutes = normalizedDuration(task.estimatedMinutes);
  const reasons = [
    taskDateReason(task, actionDate, dueDate, days),
    priorityLabel(task.priority),
    task.relatedGoalId ? "Supports an active goal" : null,
    ageReason(task.createdAt, now),
    `${durationMinutes} min estimated`,
    energyReason(task.energyRequired, availableEnergy),
  ].filter((reason): reason is string => Boolean(reason));

  return {
    id: task.id,
    kind: "task",
    title: task.title,
    href: `/tasks?highlight=${task.id}`,
    durationMinutes,
    energy: task.energyRequired,
    actionDate,
    createdAt: task.createdAt,
    urgent: days !== null && days <= 0,
    reasons,
    score:
      scheduleScore(days) +
      priorityScore[task.priority] +
      effortScore(durationMinutes, capacity) +
      energyScore(task.energyRequired, availableEnergy) +
      ageScore(task.createdAt, now) +
      (task.relatedGoalId ? 8 : 0),
  };
}

function fixedCandidate({
  id,
  kind,
  title,
  href,
  actionDate,
  createdAt,
  durationMinutes,
  energy,
  priority,
  today,
  capacity,
  availableEnergy,
}: {
  id: string;
  kind: Exclude<DaylineKind, "task">;
  title: string;
  href: string;
  actionDate: string;
  createdAt: string;
  durationMinutes: number;
  energy: DaylineEnergy;
  priority: DaylinePriority;
  today: string;
  capacity: number;
  availableEnergy: DaylineEnergy;
}): RankedCandidate {
  const days = daysFromToday(actionDate, today);
  return {
    id,
    kind,
    title,
    href,
    durationMinutes,
    energy,
    actionDate,
    createdAt,
    urgent: days !== null && days <= 0,
    reasons: [
      dateReason(days),
      priorityLabel(priority),
      `${durationMinutes} min estimated`,
      energyReason(energy, availableEnergy),
    ].filter((reason): reason is string => Boolean(reason)),
    score:
      scheduleScore(days) +
      priorityScore[priority] +
      effortScore(durationMinutes, capacity) +
      energyScore(energy, availableEnergy),
  };
}

function compareCandidates(left: RankedCandidate, right: RankedCandidate) {
  return (
    right.score - left.score ||
    (left.actionDate ?? "9999-12-31").localeCompare(
      right.actionDate ?? "9999-12-31",
    ) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  );
}

export function generateDayline(
  data: DaylineSourceData,
  now = new Date(),
): Dayline {
  const today = manilaIsoDate(now);
  const capacityMinutes = normalizedCapacity(data.capacityMinutes);
  const candidates: RankedCandidate[] = [];

  for (const task of data.tasks) {
    const candidate = taskCandidate(
      task,
      today,
      capacityMinutes,
      data.energyLevel,
      now,
    );
    if (candidate) candidates.push(candidate);
  }

  for (const debt of data.debts) {
    const days = daysFromToday(debt.nextDueDate, today);
    if (debt.status !== "active" || days === null || days > 7) continue;
    candidates.push(
      fixedCandidate({
        id: debt.id,
        kind: "debt",
        title: `Pay ${debt.creditorName}`,
        href: `/debts?highlight=${debt.id}`,
        actionDate: debt.nextDueDate as string,
        createdAt: debt.createdAt,
        durationMinutes: 10,
        energy: "low",
        priority: days <= 0 ? "critical" : days <= 3 ? "high" : "medium",
        today,
        capacity: capacityMinutes,
        availableEnergy: data.energyLevel,
      }),
    );
  }

  for (const application of data.applications) {
    const actionDate = application.nextActionAt
      ? manilaIsoDate(application.nextActionAt)
      : null;
    const days = daysFromToday(actionDate, today);
    if (
      terminalApplicationStages.has(application.stage) ||
      days === null ||
      days > 3
    ) {
      continue;
    }
    candidates.push(
      fixedCandidate({
        id: application.id,
        kind: "career",
        title:
          application.nextAction?.trim() ||
          `Follow up with ${application.companyName}`,
        href: `/career?highlight=${application.id}`,
        actionDate: actionDate as string,
        createdAt: application.createdAt,
        durationMinutes: 20,
        energy: "medium",
        priority: days <= 0 ? "critical" : "high",
        today,
        capacity: capacityMinutes,
        availableEnergy: data.energyLevel,
      }),
    );
  }

  for (const milestone of data.milestones) {
    const days = daysFromToday(milestone.targetDate, today);
    if (milestone.completedAt || days === null || days > 7) continue;
    candidates.push(
      fixedCandidate({
        id: milestone.id,
        kind: "goal",
        title: milestone.title,
        href: `/goals?highlight=${milestone.goalId}`,
        actionDate: milestone.targetDate as string,
        createdAt: milestone.createdAt,
        durationMinutes: 30,
        energy: "medium",
        priority: days <= 0 ? "critical" : days <= 3 ? "high" : "medium",
        today,
        capacity: capacityMinutes,
        availableEnergy: data.energyLevel,
      }),
    );
  }

  candidates.sort(compareCandidates);

  const selected: RankedCandidate[] = [];
  let remainingMinutes = capacityMinutes;
  for (const candidate of candidates) {
    if (selected.length >= DAYLINE_MAX_ITEMS) break;
    if (candidate.durationMinutes <= remainingMinutes) {
      selected.push(candidate);
      remainingMinutes -= candidate.durationMinutes;
    } else if (candidate.urgent && selected.length === 0) {
      selected.push(candidate);
      remainingMinutes = 0;
    }
  }

  if (selected.length === 0 && candidates[0]) selected.push(candidates[0]);

  let availableBeforeItem = capacityMinutes;
  const items = selected.map<DaylineItem>((candidate, index) => {
    const capacityReason =
      candidate.durationMinutes <= availableBeforeItem
        ? `Fits within ${availableBeforeItem} min remaining`
        : `Exceeds the ${availableBeforeItem} min remaining`;
    availableBeforeItem = Math.max(
      0,
      availableBeforeItem - candidate.durationMinutes,
    );
    return {
      id: candidate.id,
      kind: candidate.kind,
      title: candidate.title,
      href: candidate.href,
      durationMinutes: candidate.durationMinutes,
      energy: candidate.energy,
      position: positions[index] ?? "LATER",
      reason: [...candidate.reasons, capacityReason].join(" · "),
    };
  });

  return {
    items,
    capacityMinutes,
    plannedMinutes: items.reduce(
      (total, item) => total + item.durationMinutes,
      0,
    ),
    energyLevel: data.energyLevel,
  };
}
