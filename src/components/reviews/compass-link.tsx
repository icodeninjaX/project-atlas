"use client";

import { ArrowRight } from "lucide-react";
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
      className="text-primary hover:bg-primary/10 focus-visible:ring-ring -mb-1.5 -ml-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-3" />
    </a>
  );
}
