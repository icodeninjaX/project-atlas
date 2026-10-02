"use client";

import { BookOpenCheck, CalendarDays } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ReviewArchive } from "@/components/reviews/review-archive";
import type { ReviewArchiveItem } from "@/lib/reviews/view";
import { cn } from "@/lib/utils";

export type { ReviewArchiveItem } from "@/lib/reviews/view";

type ReviewView = "current" | "archive";

const ShowReviewContext = createContext<((reviewId: string) => void) | null>(
  null,
);

/**
 * Opens a past review in the archive tab without leaving the page, so
 * anything typed into this week's review stays put. Null outside a
 * ReviewWorkspace.
 */
export function useShowReview() {
  return useContext(ShowReviewContext);
}

const views = [
  { name: "current", label: "This week", icon: CalendarDays },
  { name: "archive", label: "Past reviews", icon: BookOpenCheck },
] as const;

export function ReviewWorkspace({
  reviews,
  currentContent,
  initialView = "current",
  highlightReviewId,
  streak = null,
}: {
  /** Past reviews, newest first. */
  reviews: ReviewArchiveItem[];
  currentContent: ReactNode;
  initialView?: ReviewView;
  highlightReviewId?: string;
  /** "4-week streak", when there is one. */
  streak?: string | null;
}) {
  const [view, setView] = useState<ReviewView>(initialView);
  const [archiveOpened, setArchiveOpened] = useState(initialView === "archive");
  const [selectedId, setSelectedId] = useState(
    () =>
      reviews.find((review) => review.id === highlightReviewId)?.id ??
      reviews[0]?.id ??
      null,
  );
  const tabs = useRef<Record<ReviewView, HTMLButtonElement | null>>({
    current: null,
    archive: null,
  });
  const tabRow = useRef<HTMLDivElement>(null);

  const selectView = useCallback((next: ReviewView, focus = false) => {
    setView(next);
    if (next === "archive") setArchiveOpened(true);
    if (focus) tabs.current[next]?.focus();
  }, []);

  const showReview = useCallback(
    (reviewId: string) => {
      setSelectedId(reviewId);
      selectView("archive");
      tabs.current.archive?.focus({ preventScroll: true });
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      tabRow.current?.scrollIntoView?.({
        block: "start",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [selectView],
  );

  return (
    <ShowReviewContext.Provider value={showReview}>
      {/* Phones keep the switch in reach while the page scrolls. */}
      <div
        ref={tabRow}
        className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-20 mt-6 scroll-mt-24 sm:static sm:mt-8"
      >
        <div
          role="tablist"
          aria-label="Review views"
          className="bg-background/90 ring-border/80 sm:bg-muted/50 flex w-full rounded-full p-1 shadow-[0_12px_32px_-14px_rgb(7_10_15/0.55)] ring-1 backdrop-blur-xl sm:w-fit sm:shadow-none"
        >
          {views.map(({ name, label, icon: Icon }) => {
            const selected = view === name;
            return (
              <button
                key={name}
                ref={(button) => {
                  tabs.current[name] = button;
                }}
                id={`reviews-${name}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`reviews-${name}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectView(name)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    selectView("current", true);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    selectView("archive", true);
                  }
                }}
                className={cn(
                  "focus-visible:ring-ring inline-flex min-h-10 min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full px-3 py-1 text-center text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9 sm:flex-none sm:px-5",
                  selected
                    ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("size-4 shrink-0", selected && "text-primary")}
                />
                {label}{" "}
                {name === "archive" ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums",
                      selected
                        ? "bg-primary/12 text-primary"
                        : "bg-background/70 text-muted-foreground",
                    )}
                  >
                    {reviews.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section
        id="reviews-current-panel"
        role="tabpanel"
        aria-labelledby="reviews-current-tab"
        hidden={view !== "current"}
        className="mt-5 sm:mt-6"
      >
        {currentContent}
      </section>
      <section
        id="reviews-archive-panel"
        role="tabpanel"
        aria-labelledby="reviews-archive-tab"
        hidden={view !== "archive"}
        className="mt-5 sm:mt-6"
      >
        {archiveOpened ? (
          <ReviewArchive
            reviews={reviews}
            active={view === "archive"}
            selectedId={selectedId}
            onSelect={setSelectedId}
            streak={streak}
          />
        ) : null}
      </section>
    </ShowReviewContext.Provider>
  );
}
