"use client";

import { useShowReview } from "@/components/reviews/review-workspace";

/**
 * Opens the review that chose this week's compass, in the archive tab. The
 * address still works without scripts.
 */
export function CompassLink({
  reviewId,
  children,
}: {
  reviewId: string;
  children: React.ReactNode;
}) {
  const showReview = useShowReview();
  return (
    <a
      href={`/reviews?view=archive&highlight=${reviewId}`}
      onClick={(event) => {
        if (!showReview) return;
        event.preventDefault();
        showReview(reviewId);
      }}
      className="text-primary focus-visible:ring-ring -mb-2 inline-flex min-h-11 items-center rounded-md text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
    >
      {children}
    </a>
  );
}
