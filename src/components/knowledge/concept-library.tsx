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
    <li
      id={`concept-${concept.id}`}
      className="relative scroll-mt-24 first:rounded-t-[inherit] last:rounded-b-[inherit]"
    >
      {/* The selection only shows where its concept sits beside the list;
          a concept opened from a link is marked at every width. */}
      {active || highlighted ? (
        <span
          aria-hidden="true"
          className={cn(
            "bg-primary absolute inset-y-3 left-0 z-10 w-1 rounded-r-full",
            !highlighted && "max-xl:hidden",
          )}
        />
      ) : null}
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={() => onSelect(concept.id)}
        className={cn(
          "focus-visible:ring-ring @container relative grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset min-[360px]:px-5 sm:items-center",
          "hover:bg-foreground/[0.025] rounded-[inherit] @lg:grid-cols-[auto_minmax(0,1fr)_auto]",
          highlighted && "bg-primary/[0.06] hover:bg-primary/[0.08]",
          active &&
            !highlighted &&
            "xl:bg-primary/[0.06] xl:hover:bg-primary/[0.08]",
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
              <span
                key={tag}
                className="bg-muted/80 max-w-full truncate rounded-full px-1.5 text-[0.6875rem]"
              >
                #{tag}
              </span>
            ))}
            {concept.tags.length > 3 ? (
              <span className="text-[0.6875rem]">
                +{concept.tags.length - 3}
              </span>
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
 * The library in sections, each one glass card of rows. A row opens its
 * concept beside the list on wide screens and in a sheet on smaller ones.
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
    <section aria-label="Knowledge library" className="min-w-0 space-y-8">
      {groups.length === 0 ? empty : null}
      {groups.map((group) => {
        const headingId = `knowledge-group-${group.id}`;
        const { icon: Icon, tone } = groupIcons[group.id];
        const count = group.concepts.length;
        return (
          <section key={group.id} aria-labelledby={headingId}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg ring-1",
                  tone === "attention" &&
                    "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
                  tone === "default" &&
                    "bg-primary/10 text-primary ring-primary/15",
                  tone === "muted" &&
                    "bg-muted/70 text-muted-foreground ring-border/80",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <h2
                id={headingId}
                className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]"
              >
                {group.label}
                <span className="bg-foreground/[0.07] text-muted-foreground grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none font-semibold">
                  <span className="sr-only">, </span>
                  {count}
                  <span className="sr-only">
                    {count === 1 ? " concept" : " concepts"}
                  </span>
                </span>
              </h2>
              <p className="text-muted-foreground text-xs max-sm:basis-full max-sm:pl-10 sm:ml-auto">
                {group.detail}
              </p>
            </div>
            <ul
              className={cn(
                surfaceClass,
                "bg-card/90 divide-border/70 relative mt-3 divide-y rounded-[1.5rem] shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)]",
              )}
            >
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
      })}
    </section>
  );
}
