"use client";

import {
  Archive,
  CalendarClock,
  CalendarDays,
  Hourglass,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { DueChip } from "@/components/career/due-chip";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { strengthTones } from "@/components/knowledge/knowledge-tone";
import { StrengthRing } from "@/components/knowledge/strength";
import {
  formatKnowledgeDate,
  reviewChip,
  strengthLabels,
  strengthLevel,
  type KnowledgeConcept,
  type LibraryGroup,
  type LibraryGroupId,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";

const groupIcons: Record<
  LibraryGroupId,
  { icon: LucideIcon; tone: "attention" | "default" | "muted" }
> = {
  due: { icon: Hourglass, tone: "attention" },
  week: { icon: CalendarClock, tone: "default" },
  later: { icon: CalendarDays, tone: "muted" },
  sorted: { icon: ListOrdered, tone: "default" },
  archived: { icon: Archive, tone: "muted" },
};

function ConceptRow({
  concept,
  nowIso,
  active,
  highlighted,
  onSelect,
}: {
  concept: KnowledgeConcept;
  nowIso: string;
  active: boolean;
  highlighted: boolean;
  onSelect: (conceptId: string) => void;
}) {
  const chip = reviewChip(concept, nowIso);
  const level = strengthLevel(concept.confidence);
  const archived = Boolean(concept.archived_at);
  return (
    <li id={`concept-${concept.id}`} className="relative scroll-mt-24">
      {/* The selection only shows where its concept sits beside the list;
          a concept opened from a link is marked at every width. */}
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={() => onSelect(concept.id)}
        className={cn(
          "focus-visible:ring-ring @container relative grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset min-[360px]:px-5 sm:items-center",
          "hover:bg-foreground/[0.025] @lg:grid-cols-[auto_minmax(0,1fr)_auto]",
          highlighted && "ring-primary/60 ring-2 ring-inset",
          active &&
            !highlighted &&
            "xl:ring-primary/50 xl:ring-2 xl:ring-inset",
        )}
      >
        <StrengthRing
          confidence={concept.confidence}
          muted={archived}
          className="row-span-2 @lg:row-span-1"
        />
        <span className="min-w-0">
          <span className="block text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words">
            {concept.title}
          </span>
          <span className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5">
            <span className="text-foreground/80 font-medium">
              {concept.category}
            </span>
            {concept.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="max-w-full truncate">
                #{tag}
              </span>
            ))}
            {concept.tags.length > 3 ? (
              <span>+{concept.tags.length - 3}</span>
            ) : null}
          </span>
        </span>
        <span className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 @lg:col-start-3 @lg:flex-col @lg:items-end @lg:gap-1">
          {chip ? (
            <DueChip due={chip} showDate={false} />
          ) : (
            <span className="text-muted-foreground text-xs">
              Archived {formatKnowledgeDate(concept.archived_at!)}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            <span
              className={cn(
                "font-semibold",
                !archived && strengthTones[level].text,
              )}
            >
              {strengthLabels[level]}
            </span>
            {" · "}
            {concept.review_count === 0
              ? "Not reviewed"
              : `${concept.review_count} ${concept.review_count === 1 ? "review" : "reviews"}`}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * The library as one card of rows, in sections under sub-headers. A row
 * opens its concept beside the list on wide screens and in a sheet on
 * smaller ones.
 */
export function ConceptLibrary({
  groups,
  activeId,
  highlightId,
  nowIso,
  onSelect,
  empty,
}: {
  groups: LibraryGroup[];
  activeId?: string;
  highlightId?: string;
  nowIso: string;
  onSelect: (conceptId: string) => void;
  /** Shown when no concept is in view. */
  empty: ReactNode;
}) {
  return (
    <section aria-label="Knowledge library" className="min-w-0">
      {groups.length === 0 ? (
        empty
      ) : (
        <div
          className={cn(
            surfaceClass,
            "bg-card/90 relative overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.04)]",
          )}
        >
          {groups.map((group) => (
            <LibrarySection
              key={group.id}
              group={group}
              activeId={activeId}
              highlightId={highlightId}
              nowIso={nowIso}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LibrarySection({
  group,
  activeId,
  highlightId,
  nowIso,
  onSelect,
}: {
  group: LibraryGroup;
  activeId?: string;
  highlightId?: string;
  nowIso: string;
  onSelect: (conceptId: string) => void;
}) {
  const headingId = `knowledge-group-${group.id}`;
  const { icon: Icon, tone } = groupIcons[group.id];
  const count = group.concepts.length;
  return (
    <section aria-labelledby={headingId} className="border-t first:border-t-0">
      <div className="bg-muted/30 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b px-4 py-2.5 min-[360px]:px-5">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]"
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0",
              tone === "attention"
                ? "text-amber-700 dark:text-amber-300"
                : "text-muted-foreground",
            )}
          />
          {group.label}
          <span className="text-muted-foreground font-mono text-xs font-medium tabular-nums">
            <span className="sr-only">, </span>
            {count}
            <span className="sr-only">
              {count === 1 ? " concept" : " concepts"}
            </span>
          </span>
        </h2>
        <p className="text-muted-foreground text-xs max-sm:basis-full sm:ml-auto">
          {group.detail}
        </p>
      </div>
      <ul className="divide-border/70 divide-y">
        {group.concepts.map((concept) => (
          <ConceptRow
            key={concept.id}
            concept={concept}
            nowIso={nowIso}
            active={concept.id === activeId}
            highlighted={concept.id === highlightId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}
