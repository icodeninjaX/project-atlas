export type ReviewOutcome = "again" | "hard" | "good" | "easy";

export const REVIEW_INTERVAL_LABELS: Record<ReviewOutcome, string> = {
  again: "10 min",
  hard: "1+ day",
  good: "3+ days",
  easy: "7+ days",
};

const multipliers: Record<Exclude<ReviewOutcome, "again">, number> = {
  hard: 1.2,
  good: 2.2,
  easy: 3.5,
};

const minimumDays: Record<Exclude<ReviewOutcome, "again">, number> = {
  hard: 1,
  good: 3,
  easy: 7,
};

export function nextReviewSchedule(
  outcome: ReviewOutcome,
  currentIntervalDays: number,
  reviewedAt = new Date(),
) {
  if (outcome === "again") {
    return {
      intervalDays: 0,
      nextReviewAt: new Date(reviewedAt.getTime() + 10 * 60 * 1000),
    };
  }

  const intervalDays = Math.max(
    minimumDays[outcome],
    Math.round(Math.max(1, currentIntervalDays) * multipliers[outcome]),
  );
  return {
    intervalDays,
    nextReviewAt: new Date(
      reviewedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000,
    ),
  };
}

export function isReviewDue(nextReviewAt: string, now = new Date()) {
  return new Date(nextReviewAt).getTime() <= now.getTime();
}
