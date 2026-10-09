"use client";

import {
  Archive,
  BookOpen,
  CalendarCheck2,
  GraduationCap,
  Plus,
  SearchX,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { ConceptFormSheet } from "@/components/knowledge/concept-form-sheet";
import { ConceptLibrary } from "@/components/knowledge/concept-library";
import { ConceptPanel } from "@/components/knowledge/concept-panel";
import {
  KnowledgeEmptyHero,
  KnowledgeHero,
} from "@/components/knowledge/knowledge-hero";
import { KnowledgeToolbar } from "@/components/knowledge/knowledge-toolbar";
import {
  ReviewSession,
  type SessionMode,
} from "@/components/knowledge/review-session";
import { MoneySheet } from "@/components/money/money-sheet";
import { Button } from "@/components/ui/button";
import {
  conceptCategories,
  conceptReviews,
  filterConcepts,
  isDue,
  libraryGroups,
  memorySummary,
  recallStats,
  reviewForecast,
  reviewStreak,
  sortConcepts,
  viewCounts,
  whenPhrase,
  type KnowledgeConcept,
  type KnowledgeReview,
  type KnowledgeSort,
  type KnowledgeView,
} from "@/lib/knowledge/view";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

export type { KnowledgeConcept, KnowledgeReview } from "@/lib/knowledge/view";

/** Where the selected concept sits beside the list instead of in a sheet. */
const WIDE = "(min-width: 80rem)";

function isWide() {
  return typeof window === "undefined" || !window.matchMedia
    ? true
    : window.matchMedia(WIDE).matches;
}

function scrollToConcept(conceptId: string) {
  document
    .getElementById(`concept-${conceptId}`)
    ?.scrollIntoView({ block: "center" });
}

function LibraryEmpty({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className={cn(
        surfaceClass,
        "bg-card/80 relative grid min-h-56 place-items-center rounded-[1.5rem] p-6 text-center",
      )}
    >
      <div className="max-w-sm">
        <span className="bg-primary/10 text-primary ring-primary/15 mx-auto grid size-11 place-items-center rounded-2xl ring-1">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-4 font-semibold">{title}</p>
        {detail ? (
          <p className="text-muted-foreground mt-1.5 text-sm leading-6">
            {detail}
          </p>
        ) : null}
        {action ? (
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** The Knowledge page body, from data the page has already loaded. */
export function KnowledgeWorkspace({
  concepts,
  reviews,
  initialView,
  initialQuery,
  initialCategory,
  initialSort,
  initialConceptId,
  nowIso,
}: {
  concepts: KnowledgeConcept[];
  reviews: KnowledgeReview[];
  initialView: KnowledgeView;
  initialQuery: string;
  initialCategory: string;
  initialSort: KnowledgeSort;
  /** Opened from a link elsewhere in ATLAS. */
  initialConceptId?: string;
  nowIso: string;
}) {
  const linked = initialConceptId
    ? concepts.find((item) => item.id === initialConceptId)
    : undefined;
  // A link to an archived concept opens the archive, where it is listed.
  const [view, setView] = useState<KnowledgeView>(
    linked?.archived_at ? "archived" : initialView,
  );
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<KnowledgeSort>(initialSort);
  const [activeId, setActiveId] = useState(linked?.id ?? "");
  const [highlightId, setHighlightId] = useState(linked?.id);
  // A concept just rated stays in view, though it may have left the list,
  // until the reader moves on.
  const [heldId, setHeldId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<{ open: boolean; conceptId: string | null }>(
    { open: false, conceptId: null },
  );
  const [session, setSession] = useState<{
    key: number;
    ids: string[];
    mode: SessionMode;
  } | null>(null);
  const pendingScroll = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const counts = useMemo(
    () => viewCounts(concepts, nowIso),
    [concepts, nowIso],
  );
  const categories = useMemo(() => conceptCategories(concepts), [concepts]);
  const selectedCategory =
    category === "all" || categories.includes(category) ? category : "all";
  const visible = useMemo(
    () =>
      sortConcepts(
        filterConcepts(concepts, {
          view,
          query,
          category: selectedCategory,
          nowIso,
        }),
        sort,
      ),
    [concepts, nowIso, query, selectedCategory, sort, view],
  );
  const groups = useMemo(
    () => libraryGroups(visible, { view, sort, nowIso }),
    [nowIso, sort, view, visible],
  );
  const summary = useMemo(
    () => memorySummary(concepts, nowIso),
    [concepts, nowIso],
  );
  const forecast = useMemo(
    () => reviewForecast(concepts, nowIso),
    [concepts, nowIso],
  );
  const recall = useMemo(() => recallStats(reviews, nowIso), [nowIso, reviews]);
  const streak = useMemo(
    () => reviewStreak(reviews, nowIso),
    [nowIso, reviews],
  );

  const active =
    visible.find((item) => item.id === activeId) ??
    (heldId && heldId === activeId
      ? concepts.find((item) => item.id === heldId)
      : undefined) ??
    visible[0];
  const activeReviews = useMemo(
    () => (active ? conceptReviews(reviews, active.id) : []),
    [active, reviews],
  );
  const nextDue = visible.find(
    (item) => item.id !== active?.id && isDue(item, nowIso),
  );
  const filtersActive =
    query.trim() !== "" || selectedCategory !== "all" || sort !== "next-review";
  const editing = form.conceptId
    ? (concepts.find((item) => item.id === form.conceptId) ?? null)
    : null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "all") params.set("view", view);
    if (query.trim()) params.set("query", query.trim());
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (sort !== "next-review") params.set("sort", sort);
    const nextUrl = params.size ? `${pathname}?${params}` : pathname;
    router.replace(nextUrl as never);
  }, [pathname, query, router, selectedCategory, sort, view]);

  // Opened from a link: bring its row into view, and below the wide layout
  // open the concept itself.
  const linkedId = linked?.id;
  useEffect(() => {
    if (!linkedId) return;
    scrollToConcept(linkedId);
    if (isWide()) return;
    const frame = requestAnimationFrame(() => setSheetOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [linkedId]);

  // A concept just added scrolls into view once it arrives in the list.
  useEffect(() => {
    const conceptId = pendingScroll.current;
    if (!conceptId || !visible.some((item) => item.id === conceptId)) return;
    pendingScroll.current = null;
    scrollToConcept(conceptId);
  }, [visible]);

  // The sheet gives way when the panel takes its place beside the list.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const wide = window.matchMedia(WIDE);
    const onChange = () => {
      if (wide.matches) setSheetOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  const moveOn = () => setHeldId(null);
  const select = (conceptId: string) => {
    moveOn();
    setActiveId(conceptId);
    if (conceptId !== highlightId) setHighlightId(undefined);
    if (!isWide()) setSheetOpen(true);
  };
  const changeView = (next: KnowledgeView) => {
    moveOn();
    setView(next);
  };
  const changeQuery = (next: string) => {
    moveOn();
    setQuery(next);
  };
  const changeCategory = (next: string) => {
    moveOn();
    setCategory(next);
  };
  const changeSort = (next: KnowledgeSort) => {
    moveOn();
    setSort(next);
  };
  const clearFilters = () => {
    moveOn();
    setQuery("");
    setCategory("all");
    setSort("next-review");
  };
  const startSession = (mode: SessionMode) => {
    const queue = mode === "due" ? summary.queue : summary.practice;
    if (queue.length === 0) return;
    setSheetOpen(false);
    setSession({ key: Date.now(), ids: queue.map((item) => item.id), mode });
  };
  const openCreate = () => setForm({ open: true, conceptId: null });
  const openEdit = (conceptId: string) => {
    setSheetOpen(false);
    setForm({ open: true, conceptId });
  };
  const onSaved = (conceptId: string | null) => {
    if (!conceptId || form.conceptId) return;
    // A new concept is due at once; show it where it lands.
    moveOn();
    if (view === "archived") setView("all");
    setActiveId(conceptId);
    setHighlightId(conceptId);
    pendingScroll.current = conceptId;
  };

  const panelProps = active
    ? {
        concept: active,
        reviews: activeReviews,
        nowIso,
        onEdit: () => openEdit(active.id),
        onRecorded: () => setHeldId(active.id),
        onNext: nextDue ? () => select(nextDue.id) : undefined,
      }
    : null;

  const empty = filtersActive ? (
    <LibraryEmpty
      icon={SearchX}
      title="No concepts match these filters."
      detail="Clear the filters above to see more concepts."
    />
  ) : view === "due" ? (
    <LibraryEmpty
      icon={CalendarCheck2}
      title="Nothing is due for review right now."
      detail={
        summary.nextScheduled
          ? `Your next review is ${whenPhrase(summary.nextScheduled.next_review_at, nowIso)}.`
          : undefined
      }
    />
  ) : view === "archived" ? (
    <LibraryEmpty
      icon={Archive}
      title="Your archive is empty."
      detail="Archive a concept to pause its reviews without losing it."
    />
  ) : view === "weak" ? (
    <LibraryEmpty
      icon={Sprout}
      title="No concepts need extra practice right now."
      detail="Concepts you rate Again or Hard gather here."
    />
  ) : (
    <LibraryEmpty
      icon={BookOpen}
      title="Your knowledge library is empty."
      action={{ label: "Add a concept", onClick: openCreate }}
    />
  );

  return (
    <PageShell>
      <PageHeading
        eyebrow="Learning system"
        icon={GraduationCap}
        title="Knowledge"
        description="Capture what you learn, explain it in your own words, and let spaced reviews make it stick."
        actions={
          // Until something is saved, the hero holds the only add button.
          concepts.length ? (
            <Button type="button" onClick={openCreate}>
              <Plus aria-hidden="true" className="size-4" />
              Add concept
            </Button>
          ) : undefined
        }
      />

      {concepts.length === 0 ? (
        <KnowledgeEmptyHero onAdd={openCreate} />
      ) : (
        <>
          <KnowledgeHero
            summary={summary}
            forecast={forecast}
            recall={recall}
            streak={streak}
            nowIso={nowIso}
            onStart={startSession}
            onOpen={(conceptId) => {
              const target = concepts.find((item) => item.id === conceptId);
              if (target && !visible.includes(target)) {
                // Make room for it in the list before opening it.
                setView("all");
                setQuery("");
                setCategory("all");
              }
              select(conceptId);
              requestAnimationFrame(() => scrollToConcept(conceptId));
            }}
          />
          <KnowledgeToolbar
            view={view}
            counts={counts}
            query={query}
            category={selectedCategory}
            categories={categories}
            sort={sort}
            onView={changeView}
            onQuery={changeQuery}
            onCategory={changeCategory}
            onSort={changeSort}
            onClear={clearFilters}
          />
          <div
            className={cn(
              "mt-8 grid gap-6",
              panelProps &&
                "xl:grid-cols-[minmax(0,1fr)_minmax(22rem,25rem)] xl:items-start",
            )}
          >
            <ConceptLibrary
              groups={groups}
              activeId={active?.id}
              highlightId={highlightId}
              nowIso={nowIso}
              onSelect={select}
              empty={empty}
            />
            {panelProps ? (
              <aside
                aria-label="Selected concept"
                className={cn(
                  surfaceClass,
                  "bg-card/90 relative [scrollbar-width:thin] rounded-[1.5rem] p-5 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_22px_44px_-30px_rgb(7_10_15/0.4)] max-xl:hidden sm:p-6 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:overscroll-contain",
                )}
              >
                <ConceptPanel {...panelProps} onArchived={moveOn} />
              </aside>
            ) : null}
          </div>
        </>
      )}

      {panelProps ? (
        <MoneySheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          eyebrow={`Knowledge / ${panelProps.concept.category}`}
          title={panelProps.concept.title}
          closeLabel="Close concept"
        >
          <ConceptPanel
            {...panelProps}
            showTitle={false}
            onArchived={() => {
              moveOn();
              setSheetOpen(false);
            }}
          />
        </MoneySheet>
      ) : null}

      <ConceptFormSheet
        open={form.open}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
        concept={editing}
        categories={categories}
        onSaved={onSaved}
      />

      {session ? (
        <ReviewSession
          key={session.key}
          open
          onOpenChange={(open) => {
            if (!open) setSession(null);
          }}
          ids={session.ids}
          concepts={concepts}
          mode={session.mode}
          nowIso={nowIso}
        />
      ) : null}
    </PageShell>
  );
}
