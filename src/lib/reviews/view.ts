import { getISOWeek } from "date-fns";
import {
  calendarDaysBetween,
  compactReviewWeekLabel,
  manilaTodayIsoDate,
} from "@/lib/dates/dates";

/** How many recent reviews the page loads for the archive. */
export const REVIEW_HISTORY_LIMIT = 12;

/** One saved weekly review, as the archive shows it. */
export type ReviewArchiveItem = {
  id: string;
  weekStart: string;
  wins: string | null;
  challenges: string | null;
  lessons: string | null;
  timeWasters: string | null;
  moneyReflection: string | null;
  careerReflection: string | null;
  nextWeekFocus: string | null;
  energyScore: number | null;
  stressScore: number | null;
  overallScore: number | null;
  completedAt: string | null;
  reflectedAt: string | null;
};

/** The seven written prompts, in the order the form asks them. */
export const promptKeys = [
  "wins",
  "challenges",
  "lessons",
  "timeWasters",
  "moneyReflection",
  "careerReflection",
  "nextWeekFocus",
] as const;

export type PromptKey = (typeof promptKeys)[number];

/** How many of the seven prompts hold more than whitespace. */
export function promptsWritten(
  fields: Partial<Record<PromptKey, string | null | undefined>>,
): number {
  return promptKeys.filter((key) => fields[key]?.trim()).length;
}

/** `YYYY-MM-DD` plus whole days. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The ISO week number of a review week, from its Monday. */
export function isoWeekNumber(weekStart: string): number {
  // Noon UTC is the same calendar day in every zone the app runs in.
  return getISOWeek(new Date(`${weekStart}T12:00:00Z`));
}

/** 0 for Monday through 6 for Sunday: where today sits in the review week. */
export function weekDayIndex(weekStart: string, nowIso: string): number {
  const days = calendarDaysBetween(
    weekStart,
    manilaTodayIsoDate(new Date(nowIso)),
  );
  return Math.min(6, Math.max(0, days));
}

const weekdayName = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "long",
});
const weekdayShort = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
});

export type WeekDay = {
  iso: string;
  /** "Mon". */
  short: string;
  /** "Monday". */
  name: string;
  /** Day of the month. */
  day: number;
  state: "past" | "today" | "future";
};

/** The seven days of the review week, each placed against today. */
export function weekDays(weekStart: string, dayIndex: number): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const iso = addDays(weekStart, index);
    const date = new Date(`${iso}T00:00:00Z`);
    return {
      iso,
      short: weekdayShort.format(date),
      name: weekdayName.format(date),
      day: date.getUTCDate(),
      state:
        index < dayIndex ? "past" : index === dayIndex ? "today" : "future",
    };
  });
}

export type StatusTone = "positive" | "primary" | "neutral";

export type ThisWeekStatus = {
  tone: StatusTone;
  /** A short pill label. */
  label: string;
  /** One sentence under the week's title. */
  sentence: string;
};

/** Where this week's review stands, in words. */
export function thisWeekStatus({
  dayIndex,
  submitted,
  hasDraft,
  written,
}: {
  dayIndex: number;
  submitted: boolean;
  hasDraft: boolean;
  written: number;
}): ThisWeekStatus {
  const daysLeft = 6 - dayIndex;
  const closes =
    daysLeft === 0
      ? "The week closes today."
      : `The week closes on Sunday, in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`;
  const prompts = `${written} of ${promptKeys.length} prompts written`;

  if (submitted) {
    return {
      tone: "positive",
      label: "Submitted",
      sentence: `This week is reviewed, with ${prompts}. You can still add to it before the week closes.`,
    };
  }
  if (hasDraft) {
    return {
      tone: "primary",
      label: "Draft saved",
      sentence: `A draft is waiting, with ${prompts}. ${closes}`,
    };
  }
  if (dayIndex >= 4) {
    return {
      tone: "primary",
      label: "Ready to reflect",
      sentence: `The weekend is a good moment to look back. ${closes}`,
    };
  }
  return {
    tone: "neutral",
    label: "Not started",
    sentence: `The week is still unfolding. Jot a note any time. ${closes}`,
  };
}

export type ReviewStreak = {
  /** Consecutive submitted weeks, ending this week or last week. */
  weeks: number;
  /** True when the streak reaches past what the page loaded. */
  orMore: boolean;
};

/**
 * Consecutive submitted weeks. The streak ends this week when this week is
 * submitted, otherwise last week, so an open week never breaks it.
 */
export function reviewStreak(
  reviews: Array<Pick<ReviewArchiveItem, "weekStart" | "completedAt">>,
  weekStart: string,
  limitReached: boolean,
): ReviewStreak {
  const submitted = new Set(
    reviews.filter((review) => review.completedAt).map((r) => r.weekStart),
  );
  const oldestLoaded = reviews.reduce<string | null>(
    (oldest, review) =>
      oldest === null || review.weekStart < oldest ? review.weekStart : oldest,
    null,
  );
  let week = submitted.has(weekStart) ? weekStart : addDays(weekStart, -7);
  let weeks = 0;
  while (submitted.has(week)) {
    weeks += 1;
    week = addDays(week, -7);
  }
  return {
    weeks,
    orMore:
      limitReached &&
      weeks > 0 &&
      oldestLoaded !== null &&
      addDays(week, 7) === oldestLoaded,
  };
}

export function streakLabel(streak: ReviewStreak): string | null {
  if (streak.weeks < 2) return null;
  return `${streak.weeks}${streak.orMore ? "+" : ""}-week streak`;
}

export type Compass = {
  reviewId: string;
  weekStart: string;
  text: string;
};

/** The direction last week's review chose for this week, if it chose one. */
export function lastWeekCompass(
  reviews: ReviewArchiveItem[],
  weekStart: string,
): Compass | null {
  const lastWeek = addDays(weekStart, -7);
  const review = reviews.find((item) => item.weekStart === lastWeek);
  const text = review?.nextWeekFocus?.trim();
  return review && text
    ? { reviewId: review.id, weekStart: review.weekStart, text }
    : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scores(
  reviews: ReviewArchiveItem[],
  key: "energyScore" | "stressScore" | "overallScore",
) {
  return reviews.flatMap((review) =>
    review[key] === null ? [] : [review[key]],
  );
}

export type ArchiveSummary = {
  weeks: number;
  submitted: number;
  averages: {
    overall: number | null;
    energy: number | null;
    stress: number | null;
  };
  /** The week energy peaked; the most recent wins a tie. */
  peakEnergy: { score: number; weekStart: string } | null;
  /** Overall in the latest scored week against the scored week before it. */
  overallChange: {
    latest: number;
    previous: number;
    weekStart: string;
  } | null;
};

/** Averages and highlights across the loaded reviews (newest first). */
export function archiveSummary(reviews: ReviewArchiveItem[]): ArchiveSummary {
  const peak = reviews.reduce<ArchiveSummary["peakEnergy"]>(
    (best, review) =>
      review.energyScore !== null &&
      (best === null || review.energyScore > best.score)
        ? { score: review.energyScore, weekStart: review.weekStart }
        : best,
    null,
  );
  const scored = reviews.filter((review) => review.overallScore !== null);
  const [latest, previous] = scored;

  return {
    weeks: reviews.length,
    submitted: reviews.filter((review) => review.completedAt).length,
    averages: {
      overall: average(scores(reviews, "overallScore")),
      energy: average(scores(reviews, "energyScore")),
      stress: average(scores(reviews, "stressScore")),
    },
    peakEnergy: peak,
    overallChange:
      latest && previous
        ? {
            latest: latest.overallScore!,
            previous: previous.overallScore!,
            weekStart: latest.weekStart,
          }
        : null,
  };
}

/** "6.8", or "—" when there is nothing to average. */
export function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

/** One sentence on how the archive's weeks have felt. */
export function archiveSentence(summary: ArchiveSummary): string {
  const parts: string[] = [];
  if (summary.averages.overall !== null) {
    parts.push(
      `Weeks have felt ${formatAverage(summary.averages.overall)} out of 10 on average`,
    );
  }
  if (summary.peakEnergy) {
    parts.push(
      `energy peaked at ${summary.peakEnergy.score} in the week of ${compactReviewWeekLabel(summary.peakEnergy.weekStart)}`,
    );
  }
  if (parts.length === 0) {
    return "Scores are optional. Your written reflections carry the meaning.";
  }
  const sentence = parts.join(", and ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

/** The headline a past review leads with. */
export function reviewHeadline(review: ReviewArchiveItem): string {
  return (
    review.nextWeekFocus?.trim() ||
    review.wins?.trim() ||
    "A week worth remembering"
  );
}

/** The line a past review is summed up by, beneath its headline. */
export function reviewSummary(review: ReviewArchiveItem): string {
  const headline = reviewHeadline(review);
  return (
    [review.lessons, review.challenges, review.wins]
      .map((text) => text?.trim())
      .find((text) => text && text !== headline) ??
    "This reflection keeps the week in view."
  );
}
