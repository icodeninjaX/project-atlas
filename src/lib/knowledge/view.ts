import {
  nextReviewSchedule,
  type ReviewOutcome,
} from "@/lib/knowledge/scheduler";

export type KnowledgeConcept = {
  id: string;
  title: string;
  notes: string;
  category: string;
  tags: string[];
  example: string | null;
  personal_explanation: string | null;
  confidence: number;
  review_count: number;
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  archived_at: string | null;
  created_at: string;
};

export type KnowledgeReview = {
  id: string;
  concept_id: string;
  outcome: ReviewOutcome;
  reviewed_at: string;
  next_review_at: string;
  next_interval_days: number;
};

export type KnowledgeView = "all" | "due" | "weak" | "archived";
export type KnowledgeSort = "next-review" | "newest" | "title";

export const knowledgeViews: Array<{ value: KnowledgeView; label: string }> = [
  { value: "all", label: "All concepts" },
  { value: "due", label: "Due for review" },
  { value: "weak", label: "Needs practice" },
  { value: "archived", label: "Archived" },
];

export const sortLabels: Record<KnowledgeSort, string> = {
  "next-review": "Next review",
  newest: "Newest added",
  title: "Title A–Z",
};

export const outcomes: ReviewOutcome[] = ["again", "hard", "good", "easy"];

export const outcomeLabels: Record<ReviewOutcome, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

/** What each rating means, in the words of someone who just tried. */
export const outcomeHints: Record<ReviewOutcome, string> = {
  again: "Forgot it",
  hard: "Struggled",
  good: "Recalled it",
  easy: "Effortless",
};

// ---------------------------------------------------------------------------
// Dates, on the Manila calendar

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

const weekdayShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
});

const weekdayLong = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "long",
  month: "short",
  day: "numeric",
});

/** The Manila calendar day of a timestamp, `YYYY-MM-DD`. */
export function manilaDay(iso: string) {
  return manilaDateKey.format(new Date(iso));
}

function dayValue(key: string) {
  return Date.parse(`${key}T00:00:00Z`);
}

function addDays(key: string, days: number) {
  return new Date(dayValue(key) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whole Manila calendar days from `fromIso` to `toIso`. */
export function manilaDayDistance(fromIso: string, toIso: string) {
  return Math.round(
    (dayValue(manilaDay(toIso)) - dayValue(manilaDay(fromIso))) / 86_400_000,
  );
}

/** "Sep 6, 2026" in Manila. */
export function formatKnowledgeDate(iso: string) {
  return fullDate.format(new Date(iso));
}

/** Today, Yesterday, Tomorrow, "In 3 days", "3 days ago", or a date. */
export function relativeDay(iso: string, nowIso: string) {
  const days = manilaDayDistance(nowIso, iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days <= 7) return `In ${days} days`;
  if (days < -1 && days >= -7) return `${-days} days ago`;
  return formatKnowledgeDate(iso);
}

/** For the middle of a sentence: "today", "tomorrow", "in 3 days", "on Oct 20". */
export function whenPhrase(iso: string, nowIso: string) {
  const days = manilaDayDistance(nowIso, iso);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1 && days <= 7) return `in ${days} days`;
  return `on ${shortDate.format(new Date(iso))}`;
}

/** "10 min", "1 day", "15 days", "2 months", "1.2 years". */
export function intervalLabel(days: number) {
  if (days <= 0) return "10 min";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export function joinWords(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

// ---------------------------------------------------------------------------
// Memory strength

export type StrengthLevel = 1 | 2 | 3 | 4 | 5;

export const strengthLevels: StrengthLevel[] = [1, 2, 3, 4, 5];

/** The stored confidence (1–5), in words. */
export const strengthLabels: Record<StrengthLevel, string> = {
  1: "Fragile",
  2: "Learning",
  3: "Familiar",
  4: "Strong",
  5: "Mastered",
};

export function strengthLevel(confidence: number): StrengthLevel {
  return Math.min(5, Math.max(1, Math.round(confidence))) as StrengthLevel;
}

export function strengthCounts(concepts: KnowledgeConcept[]) {
  const counts: Record<StrengthLevel, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const concept of concepts) counts[strengthLevel(concept.confidence)]++;
  return counts;
}

// ---------------------------------------------------------------------------
// Browsing

export function isDue(concept: KnowledgeConcept, nowIso: string) {
  return (
    !concept.archived_at &&
    Date.parse(concept.next_review_at) <= Date.parse(nowIso)
  );
}

/** Confidence at 2 or below: worth practicing before it is due. */
export function isWeak(concept: KnowledgeConcept) {
  return !concept.archived_at && concept.confidence <= 2;
}

export function viewCounts(concepts: KnowledgeConcept[], nowIso: string) {
  const counts: Record<KnowledgeView, number> = {
    all: 0,
    due: 0,
    weak: 0,
    archived: 0,
  };
  for (const concept of concepts) {
    if (concept.archived_at) {
      counts.archived++;
      continue;
    }
    counts.all++;
    if (isDue(concept, nowIso)) counts.due++;
    if (isWeak(concept)) counts.weak++;
  }
  return counts;
}

/** Every category in use, A to Z, once each. */
export function conceptCategories(concepts: KnowledgeConcept[]) {
  return [
    ...new Set(concepts.map((item) => item.category.trim()).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right));
}

export function filterConcepts(
  concepts: KnowledgeConcept[],
  {
    view,
    query,
    category,
    nowIso,
  }: { view: KnowledgeView; query: string; category: string; nowIso: string },
) {
  const needle = query.trim().toLocaleLowerCase();
  return concepts.filter((item) => {
    if (view === "archived" ? !item.archived_at : item.archived_at) {
      return false;
    }
    if (view === "due" && !isDue(item, nowIso)) return false;
    if (view === "weak" && !isWeak(item)) return false;
    if (category !== "all" && item.category !== category) return false;
    if (
      needle &&
      ![item.title, item.category, ...item.tags].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      )
    ) {
      return false;
    }
    return true;
  });
}

export function sortConcepts(
  concepts: KnowledgeConcept[],
  sort: KnowledgeSort,
) {
  return [...concepts].sort((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "newest")
      return right.created_at.localeCompare(left.created_at);
    return (
      Date.parse(left.next_review_at) - Date.parse(right.next_review_at) ||
      left.title.localeCompare(right.title)
    );
  });
}

export type LibraryGroupId = "due" | "week" | "later" | "sorted" | "archived";

export type LibraryGroup = {
  id: LibraryGroupId;
  label: string;
  detail: string;
  concepts: KnowledgeConcept[];
};

/**
 * Concepts already filtered and sorted, in sections. By next review they
 * fall into what is due, what returns this week, and what is further out;
 * other sorts, and the archive, are one list.
 */
export function libraryGroups(
  concepts: KnowledgeConcept[],
  {
    view,
    sort,
    nowIso,
  }: { view: KnowledgeView; sort: KnowledgeSort; nowIso: string },
): LibraryGroup[] {
  if (concepts.length === 0) return [];
  if (view === "archived") {
    return [
      {
        id: "archived",
        label: "Archived",
        detail: "Out of your reviews until you restore them.",
        concepts,
      },
    ];
  }
  if (sort !== "next-review") {
    return [
      {
        id: "sorted",
        label: sort === "newest" ? "Newest first" : "A to Z",
        detail: plural(concepts.length, "concept"),
        concepts,
      },
    ];
  }

  const due: KnowledgeConcept[] = [];
  const week: KnowledgeConcept[] = [];
  const later: KnowledgeConcept[] = [];
  for (const concept of concepts) {
    if (isDue(concept, nowIso)) due.push(concept);
    else if (manilaDayDistance(nowIso, concept.next_review_at) <= 7)
      week.push(concept);
    else later.push(concept);
  }
  const groups: LibraryGroup[] = [
    {
      id: "due",
      label: "Due now",
      detail: "Ready for recall.",
      concepts: due,
    },
    {
      id: "week",
      label: "This week",
      detail: "Coming back within seven days.",
      concepts: week,
    },
    {
      id: "later",
      label: "Later",
      detail: "Spaced out. They return on their own.",
      concepts: later,
    },
  ];
  return groups.filter((group) => group.concepts.length > 0);
}

// ---------------------------------------------------------------------------
// When a concept comes back

export type ReviewTone = "overdue" | "today" | "soon" | "later";

export type ReviewChip = { label: string; tone: ReviewTone; date: string };

/** When a concept is next reviewed, as a chip. Archived concepts have none. */
export function reviewChip(
  concept: KnowledgeConcept,
  nowIso: string,
): ReviewChip | null {
  if (concept.archived_at) return null;
  const date = shortDate.format(new Date(concept.next_review_at));
  const days = manilaDayDistance(nowIso, concept.next_review_at);

  if (isDue(concept, nowIso)) {
    if (days <= -1) {
      return {
        label: days === -1 ? "1 day overdue" : `${-days} days overdue`,
        tone: "overdue",
        date,
      };
    }
    return {
      label: concept.review_count === 0 ? "New · due now" : "Due now",
      tone: "today",
      date,
    };
  }

  const minutes = Math.ceil(
    (Date.parse(concept.next_review_at) - Date.parse(nowIso)) / 60_000,
  );
  if (minutes <= 60) return { label: `In ${minutes} min`, tone: "today", date };
  if (days === 0) return { label: "Later today", tone: "today", date };
  if (days === 1) return { label: "Tomorrow", tone: "soon", date };
  if (days <= 7) return { label: `In ${days} days`, tone: "soon", date };
  return { label: date, tone: "later", date };
}

// ---------------------------------------------------------------------------
// The review queue

export type MemorySummary = {
  /** Concepts not archived. */
  active: number;
  due: number;
  /** Due and never reviewed. */
  fresh: number;
  /** Due from an earlier day. */
  overdue: number;
  weak: number;
  strength: Record<StrengthLevel, number>;
  categories: number;
  /** What is due, oldest first. */
  queue: KnowledgeConcept[];
  /** Concepts to practice when nothing is due: weakest, then soonest. */
  practice: KnowledgeConcept[];
  /** The soonest concept that is not due yet. */
  nextScheduled: KnowledgeConcept | null;
};

export function memorySummary(
  concepts: KnowledgeConcept[],
  nowIso: string,
): MemorySummary {
  const active = sortConcepts(
    concepts.filter((item) => !item.archived_at),
    "next-review",
  );
  const queue = active.filter((item) => isDue(item, nowIso));
  const practice = active
    .filter(isWeak)
    .sort(
      (left, right) =>
        left.confidence - right.confidence ||
        Date.parse(left.next_review_at) - Date.parse(right.next_review_at),
    );
  return {
    active: active.length,
    due: queue.length,
    fresh: queue.filter((item) => item.review_count === 0).length,
    overdue: queue.filter(
      (item) => manilaDayDistance(nowIso, item.next_review_at) < 0,
    ).length,
    weak: practice.length,
    strength: strengthCounts(active),
    categories: conceptCategories(active).length,
    queue,
    practice,
    nextScheduled: active.find((item) => !isDue(item, nowIso)) ?? null,
  };
}

export type QueueTone = "positive" | "caution" | "neutral";

export function queueStatus(summary: MemorySummary): {
  label: string;
  tone: QueueTone;
} {
  if (summary.active === 0)
    return { label: "Nothing to review", tone: "neutral" };
  if (summary.due === 0) return { label: "All caught up", tone: "positive" };
  if (summary.overdue > 0)
    return { label: `${summary.overdue} overdue`, tone: "caution" };
  return { label: "Ready to review", tone: "neutral" };
}

/** One sentence under the count: what is in the queue, or when it fills. */
export function queueSentence(summary: MemorySummary, nowIso: string) {
  if (summary.active === 0) {
    return "Every concept is archived. Restore one or add a new concept to review.";
  }
  if (summary.due > 0) {
    const returning = summary.due - summary.fresh;
    const mix =
      summary.fresh && returning
        ? `${summary.fresh} new and ${returning} returning.`
        : summary.fresh
          ? summary.fresh === 1
            ? "A first recall."
            : "All first recalls."
          : summary.due === 1
            ? "Back for another look."
            : "All back for another look.";
    return `${mix} Recall each one before you check your notes.`;
  }
  const next = summary.nextScheduled;
  if (!next) return "Nothing is scheduled.";
  const minutes = Math.ceil(
    (Date.parse(next.next_review_at) - Date.parse(nowIso)) / 60_000,
  );
  const when =
    minutes <= 60
      ? `in ${minutes} min`
      : manilaDayDistance(nowIso, next.next_review_at) === 0
        ? "later today"
        : whenPhrase(next.next_review_at, nowIso);
  return `Nothing is due. Your next review is ${when}.`;
}

// ---------------------------------------------------------------------------
// The week ahead

export type ForecastDay = {
  key: string;
  /** "Today", or the weekday: "Sat". */
  label: string;
  /** "Today", or "Saturday, Oct 3". */
  name: string;
  count: number;
};

/**
 * How many reviews fall on each of the next `days` Manila days. Anything
 * already due counts toward today.
 */
export function reviewForecast(
  concepts: KnowledgeConcept[],
  nowIso: string,
  days = 7,
) {
  const today = manilaDay(nowIso);
  const forecast: ForecastDay[] = Array.from({ length: days }, (_, index) => {
    const key = addDays(today, index);
    const date = new Date(`${key}T12:00:00Z`);
    return {
      key,
      label: index === 0 ? "Today" : weekdayShort.format(date),
      name:
        index === 0
          ? "Today"
          : index === 1
            ? "Tomorrow"
            : weekdayLong.format(date),
      count: 0,
    };
  });
  let later = 0;
  for (const concept of concepts) {
    if (concept.archived_at) continue;
    const index = Math.max(
      0,
      manilaDayDistance(nowIso, concept.next_review_at),
    );
    if (index < days) forecast[index]!.count++;
    else later++;
  }
  const busiest = forecast.reduce<ForecastDay | null>(
    (best, day) => (day.count > (best?.count ?? 0) ? day : best),
    null,
  );
  return { days: forecast, later, busiest };
}

// ---------------------------------------------------------------------------
// How reviews have gone

export function recallStats(
  reviews: KnowledgeReview[],
  nowIso: string,
  windowDays = 30,
) {
  const counts: Record<ReviewOutcome, number> = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };
  let total = 0;
  let thisWeek = 0;
  for (const review of reviews) {
    const age = manilaDayDistance(review.reviewed_at, nowIso);
    if (age < 0 || age >= windowDays) continue;
    total++;
    counts[review.outcome]++;
    if (age < 7) thisWeek++;
  }
  const recalled = counts.good + counts.easy;
  return {
    total,
    recalled,
    rate: total ? recalled / total : null,
    counts,
    thisWeek,
  };
}

/**
 * Consecutive Manila days with at least one review, ending today, or
 * yesterday while today is still open.
 */
export function reviewStreak(reviews: KnowledgeReview[], nowIso: string) {
  const days = new Set(reviews.map((review) => manilaDay(review.reviewed_at)));
  const today = manilaDay(nowIso);
  const reviewedToday = days.has(today);
  let cursor = reviewedToday ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { days: streak, reviewedToday };
}

// ---------------------------------------------------------------------------
// Scheduling, as the reviewer sees it

/** The interval, in days, each rating would set for this concept. */
export function projectedIntervals(
  concept: Pick<KnowledgeConcept, "interval_days">,
) {
  return Object.fromEntries(
    outcomes.map((outcome) => [
      outcome,
      nextReviewSchedule(outcome, concept.interval_days).intervalDays,
    ]),
  ) as Record<ReviewOutcome, number>;
}

/**
 * The intervals a new concept moves through when every review is rated
 * Good: how spacing stretches as memory holds.
 */
export function spacingLadder(steps = 5) {
  const ladder: number[] = [];
  let interval = 0;
  for (let step = 0; step < steps; step++) {
    interval = nextReviewSchedule("good", interval).intervalDays;
    ladder.push(interval);
  }
  return ladder;
}

/** A concept's reviews, newest first. */
export function conceptReviews(reviews: KnowledgeReview[], conceptId: string) {
  return reviews
    .filter((review) => review.concept_id === conceptId)
    .sort((left, right) => right.reviewed_at.localeCompare(left.reviewed_at));
}
