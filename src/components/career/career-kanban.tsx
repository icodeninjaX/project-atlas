"use client";

import {
  AlarmClock,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Inbox,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";
import { ApplicationEditForm } from "@/components/career/application-edit-form";
import { CompanyMark } from "@/components/career/company-mark";
import { DueChip } from "@/components/career/due-chip";
import { StageSelect } from "@/components/career/stage-select";
import { stageTone, stageTones } from "@/components/career/stage-tone";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { updateApplicationStageAction } from "@/lib/career/actions";
import {
  careerStages,
  dueChip,
  formatCareerDate,
  isCareerStage,
  pipelineStages,
  placeLabel,
  stageLabel,
  stageLabels,
  type CareerApplication,
  type CareerStage,
} from "@/lib/career/view";
import { cn, safeExternalHref } from "@/lib/utils";
import { useScrollStrip } from "@/components/shared/scroll-strip";

export type { CareerApplication } from "@/lib/career/view";

type SortMode = "attention" | "newest" | "oldest";
type BoardDensity = "comfortable" | "compact";

type BoardPreferences = {
  density: BoardDensity;
  showAppliedDate: boolean;
  showLocation: boolean;
  visibleStages: CareerStage[];
};

const storageKey = "atlas-career-board-preferences-v1";
const preferenceListeners = new Set<() => void>();
const defaultPreferences: BoardPreferences = {
  density: "comfortable",
  showAppliedDate: true,
  showLocation: true,
  visibleStages: [...careerStages],
};

function subscribeToPreferences(listener: () => void) {
  preferenceListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    preferenceListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getPreferencesSnapshot() {
  return window.localStorage.getItem(storageKey) ?? "";
}

function getServerPreferencesSnapshot() {
  return "";
}

function initialStage(applications: CareerApplication[]): CareerStage {
  const overdue = applications.find(
    (application) =>
      application.is_follow_up_overdue && isCareerStage(application.stage),
  );
  if (overdue && isCareerStage(overdue.stage)) return overdue.stage;

  return (
    careerStages.find((stage) =>
      applications.some((application) => application.stage === stage),
    ) ?? "interested"
  );
}

function validPreferences(value: unknown): BoardPreferences | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BoardPreferences>;
  const visibleStages = Array.isArray(candidate.visibleStages)
    ? candidate.visibleStages.filter(
        (stage): stage is CareerStage =>
          typeof stage === "string" && isCareerStage(stage),
      )
    : [];

  if (visibleStages.length === 0) return null;

  return {
    density: candidate.density === "compact" ? "compact" : "comfortable",
    showAppliedDate: candidate.showAppliedDate !== false,
    showLocation: candidate.showLocation !== false,
    visibleStages,
  };
}

function sortApplications(
  applications: CareerApplication[],
  sortMode: SortMode,
) {
  return [...applications].sort((a, b) => {
    if (sortMode === "attention") {
      const overdueDifference =
        Number(b.is_follow_up_overdue) - Number(a.is_follow_up_overdue);
      if (overdueDifference) return overdueDifference;

      const aDue = Date.parse(a.next_action_at ?? "9999-12-31");
      const bDue = Date.parse(b.next_action_at ?? "9999-12-31");
      if (aDue !== bDue) return aDue - bDue;
    }

    const dateDifference =
      Date.parse(b.applied_at ?? "1970-01-01") -
      Date.parse(a.applied_at ?? "1970-01-01");
    return sortMode === "oldest" ? -dateDifference : dateDifference;
  });
}

const toolbarControlClass =
  "bg-background/70 ring-border/80 hover:bg-background focus-visible:ring-ring min-h-11 rounded-full text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-10";

const legendClass =
  "text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase";

function ApplicationCard({
  application,
  density,
  moving,
  nowIso,
  onDragEnd,
  onDragStart,
  onStageChange,
  showAppliedDate,
  showLocation,
}: {
  application: CareerApplication;
  density: BoardDensity;
  moving: boolean;
  nowIso: string;
  onDragEnd: () => void;
  onDragStart: (applicationId: string) => void;
  onStageChange: (stage: string) => void;
  showAppliedDate: boolean;
  showLocation: boolean;
}) {
  const overdue = application.is_follow_up_overdue;
  const due = dueChip(application, nowIso);
  const place = showLocation ? placeLabel(application) : "";
  const applied =
    showAppliedDate && application.applied_at ? application.applied_at : null;
  const compact = density === "compact";
  const jobHref = safeExternalHref(application.job_url);
  const closed = !pipelineStages.includes(
    application.stage as (typeof pipelineStages)[number],
  );

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", application.id);
        onDragStart(application.id);
      }}
      onDragEnd={onDragEnd}
      data-testid={`kanban-card-${application.id}`}
      aria-label={`${application.company_name}, ${application.role_title}`}
      className={cn(
        "group bg-card relative overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(7_10_15/0.06),0_14px_30px_-22px_rgb(7_10_15/0.55)] ring-1 transition-[box-shadow,opacity,transform] duration-200 lg:cursor-grab lg:active:cursor-grabbing",
        overdue
          ? "ring-destructive/30 dark:bg-[color-mix(in_srgb,var(--destructive)_5%,var(--card))]"
          : "ring-border/80 hover:ring-primary/35",
        "lg:hover:-translate-y-px motion-reduce:lg:hover:translate-y-0",
        moving && "opacity-55",
      )}
    >
      {overdue ? (
        <span
          aria-hidden="true"
          className="bg-destructive absolute inset-y-3 left-0 w-[3px] rounded-r-full"
        />
      ) : null}
      <div className={cn("@container p-4", compact ? "lg:p-3" : "lg:p-4")}>
        {/* Phones show one column at a time; this keeps each card's stage
            and date in view as it is read. */}
        <div
          data-testid={`kanban-card-mobile-status-${application.id}`}
          className="text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs lg:hidden"
        >
          <span className="flex min-w-0 items-center gap-2 font-semibold">
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                stageTone(application.stage).dot,
              )}
            />
            <span className="text-foreground truncate">
              {stageLabel(application.stage)}
            </span>
          </span>
          {applied ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 font-medium">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              <time dateTime={applied}>{formatCareerDate(applied)}</time>
            </span>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <CompanyMark
            name={application.company_name}
            size="sm"
            muted={closed}
            className="@max-[15rem]:hidden"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base leading-6 font-semibold tracking-[-0.015em] lg:text-sm lg:leading-5">
              {application.company_name}
            </h3>
            <p className="text-muted-foreground line-clamp-2 text-[0.8125rem] leading-5 lg:text-xs lg:leading-4">
              {application.role_title}
            </p>
          </div>
          <GripVertical
            className="text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5 hidden size-4 shrink-0 transition-colors lg:block"
            aria-hidden="true"
          />
        </div>

        {place || applied ? (
          <p
            className={cn(
              "text-muted-foreground mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs lg:text-[11px]",
              !place && "max-lg:hidden",
            )}
          >
            {place ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </span>
            ) : null}
            {applied ? (
              <span className="hidden items-center gap-1.5 lg:inline-flex">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <time dateTime={applied}>{formatCareerDate(applied)}</time>
              </span>
            ) : null}
          </p>
        ) : null}

        <div
          className={cn(
            "mt-3 rounded-xl px-3 py-2.5 ring-1",
            overdue
              ? "bg-destructive/[0.06] ring-destructive/20"
              : "bg-background/60 ring-border/70",
            compact && "lg:mt-2.5 lg:py-2",
          )}
        >
          <p
            className={cn(
              "text-[10px] font-semibold tracking-[0.14em] uppercase",
              overdue
                ? "text-red-700 dark:text-red-300"
                : "text-muted-foreground",
            )}
          >
            Next action
          </p>
          <p
            className={cn(
              "mt-1 line-clamp-2 text-sm leading-5 font-medium break-words lg:text-[0.8125rem]",
              !application.next_action && "text-muted-foreground font-normal",
            )}
          >
            {application.next_action ?? "Add a next action"}
          </p>
          {due ? <DueChip due={due} className="mt-2" /> : null}
        </div>

        <div
          className={cn(
            "mt-3 flex flex-wrap items-center justify-end gap-1",
            compact && "lg:mt-2.5",
          )}
        >
          <StageSelect
            applicationId={application.id}
            companyName={application.company_name}
            stage={application.stage}
            onStageChange={onStageChange}
            className="grow basis-40"
          />
          {jobHref ? (
            <a
              href={jobHref}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open job post for ${application.company_name}`}
              title="Open job post"
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : null}
          <ApplicationEditForm application={application} />
        </div>
      </div>
    </article>
  );
}

export function CareerKanban({
  applications,
  nowIso,
}: {
  applications: CareerApplication[];
  nowIso: string;
}) {
  const [selectedStage, setSelectedStage] = useState<CareerStage>(() =>
    initialStage(applications),
  );
  const [sortMode, setSortMode] = useState<SortMode>("attention");
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const storedPreferences = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    getServerPreferencesSnapshot,
  );
  const preferences = useMemo(() => {
    if (!storedPreferences) return defaultPreferences;
    try {
      return (
        validPreferences(JSON.parse(storedPreferences)) ?? defaultPreferences
      );
    } catch {
      return defaultPreferences;
    }
  }, [storedPreferences]);
  const [localStages, setLocalStages] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<CareerStage | null>(null);
  const [movingApplicationId, setMovingApplicationId] = useState<string | null>(
    null,
  );
  const stageTabs = useRef<
    Partial<Record<CareerStage, HTMLButtonElement | null>>
  >({});
  const stageTabList = useRef<HTMLDivElement | null>(null);
  useScrollStrip(stageTabList, { centerActive: false });
  const boardScroll = useRef<HTMLDivElement | null>(null);
  const customizationTrigger = useRef<HTMLButtonElement | null>(null);
  const customizationPanel = useRef<HTMLDivElement | null>(null);
  const customizationClose = useRef<HTMLButtonElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [, startTransition] = useTransition();
  const { submit, userId } = useOfflineSync();

  const updatePreferences = (next: BoardPreferences) => {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    preferenceListeners.forEach((listener) => listener());
  };

  const resolvedApplications = useMemo(
    () =>
      applications.map((application) => ({
        ...application,
        stage: localStages[application.id] ?? application.stage,
      })),
    [applications, localStages],
  );

  const stageTotals = useMemo(
    () =>
      Object.fromEntries(
        careerStages.map((stage) => [
          stage,
          resolvedApplications.filter(
            (application) => application.stage === stage,
          ).length,
        ]),
      ) as Record<CareerStage, number>,
    [resolvedApplications],
  );

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return resolvedApplications.filter((application) => {
      if (attentionOnly && !application.is_follow_up_overdue) return false;
      if (!normalizedQuery) return true;
      return [
        application.company_name,
        application.role_title,
        application.location,
        application.next_action,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [attentionOnly, query, resolvedApplications]);

  const filteredCounts = useMemo(
    () =>
      Object.fromEntries(
        careerStages.map((stage) => [
          stage,
          filteredApplications.filter(
            (application) => application.stage === stage,
          ).length,
        ]),
      ) as Record<CareerStage, number>,
    [filteredApplications],
  );

  const visibleStages = preferences.visibleStages;
  const activeStage = visibleStages.includes(selectedStage)
    ? selectedStage
    : visibleStages[0]!;
  const overdueCount = resolvedApplications.filter(
    (application) => application.is_follow_up_overdue,
  ).length;
  const hiddenCount = careerStages
    .filter((stage) => !visibleStages.includes(stage))
    .reduce((total, stage) => total + stageTotals[stage], 0);
  const filtersActive = Boolean(query.trim()) || attentionOnly;
  const stageCount = (stage: CareerStage) =>
    filtersActive
      ? `${filteredCounts[stage]}/${stageTotals[stage]}`
      : String(stageTotals[stage]);

  useEffect(() => {
    const tab = stageTabs.current[activeStage];
    const scroller = stageTabList.current;
    if (tab && scroller) {
      scroller.scrollLeft = Math.max(
        0,
        tab.offsetLeft -
          scroller.offsetLeft -
          (scroller.clientWidth - tab.clientWidth) / 2,
      );
    }
  }, [activeStage]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!customizationOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = customizationTrigger.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCustomizationOpen(false);
        return;
      }
      if (event.key !== "Tab" || !isMobileViewport) return;

      const focusable =
        customizationPanel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    if (isMobileViewport) {
      document.body.style.overflow = "hidden";
      window.requestAnimationFrame(() => customizationClose.current?.focus());
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (isMobileViewport) trigger?.focus();
    };
  }, [customizationOpen, isMobileViewport]);

  const moveApplication = (
    application: CareerApplication,
    nextStage: CareerStage,
  ) => {
    if (application.stage === nextStage) return;
    const previousStage = application.stage;
    setLocalStages((current) => ({ ...current, [application.id]: nextStage }));
    setMovingApplicationId(application.id);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("applicationId", application.id);
        formData.set("stage", nextStage);
        const result = userId
          ? await submit("application.setStage", formData)
          : await updateApplicationStageAction(application.id, nextStage);

        if (result.success) {
          toast.success(
            `${application.company_name} moved to ${stageLabels[nextStage]}.`,
          );
        } else {
          setLocalStages((current) => ({
            ...current,
            [application.id]: previousStage,
          }));
          toast.error(result.message);
        }
      } catch {
        setLocalStages((current) => ({
          ...current,
          [application.id]: previousStage,
        }));
        toast.error("The application stage could not be updated.");
      } finally {
        setMovingApplicationId(null);
      }
    });
  };

  const scrollBoard = (direction: -1 | 1) =>
    boardScroll.current?.scrollBy({
      left: direction * 624,
      behavior: "smooth",
    });

  return (
    <section className="mt-8 sm:mt-10" aria-labelledby="career-board-heading">
      <h2 id="career-board-heading" className="sr-only">
        Pipeline board
      </h2>
      <div className="bg-card/70 ring-border/80 rounded-[1.5rem] p-2 shadow-[0_1px_2px_rgb(7_10_15/0.05),0_18px_40px_-30px_rgb(7_10_15/0.45)] ring-1 backdrop-blur-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="bg-background/70 ring-border/80 focus-within:ring-ring/60 relative flex min-h-11 min-w-0 flex-1 items-center rounded-full pl-10 ring-1 transition-shadow focus-within:ring-2 sm:min-h-10">
            <Search
              className="text-muted-foreground absolute left-3.5 size-4"
              aria-hidden="true"
            />
            <span className="sr-only">Search applications</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search company, role, or next action"
              className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent pr-2 text-base outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear application search"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mr-0.5 grid size-10 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none sm:size-9"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={attentionOnly}
              title="Show only overdue follow-ups"
              onClick={() => setAttentionOnly((current) => !current)}
              className={cn(
                toolbarControlClass,
                "inline-flex shrink-0 items-center gap-2 px-3.5",
                attentionOnly &&
                  "bg-destructive/10 text-destructive ring-destructive/35 hover:bg-destructive/15",
              )}
            >
              <AlarmClock
                className={cn(
                  "size-4 max-[379px]:hidden",
                  !attentionOnly && overdueCount > 0 && "text-destructive",
                )}
                aria-hidden="true"
              />
              Overdue
              {overdueCount > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none",
                    attentionOnly
                      ? "bg-destructive text-white"
                      : "bg-destructive text-white dark:bg-red-500/20 dark:text-red-300",
                  )}
                >
                  {overdueCount}
                </span>
              ) : null}
            </button>

            <label
              className={cn(
                toolbarControlClass,
                "relative inline-flex min-w-0 grow basis-36 items-center overflow-hidden max-sm:order-last md:flex-none md:basis-auto",
              )}
            >
              <ArrowUpDown
                className="text-muted-foreground pointer-events-none absolute left-3 size-3.5"
                aria-hidden="true"
              />
              <span className="sr-only">Sort applications</span>
              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.currentTarget.value as SortMode)
                }
                aria-label="Sort applications"
                className="h-full min-h-[inherit] w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent pr-3 pl-8 text-xs font-semibold outline-none"
              >
                <option value="attention" className="bg-card">
                  Urgent first
                </option>
                <option value="newest" className="bg-card">
                  Newest first
                </option>
                <option value="oldest" className="bg-card">
                  Oldest first
                </option>
              </select>
            </label>

            <button
              type="button"
              ref={customizationTrigger}
              aria-label="Customize"
              aria-expanded={customizationOpen}
              aria-controls="career-board-customization"
              onClick={() => setCustomizationOpen((open) => !open)}
              title="Customize board"
              className={cn(
                toolbarControlClass,
                "inline-flex shrink-0 items-center justify-center gap-2 max-sm:size-11 max-sm:px-0 sm:px-3.5",
                customizationOpen &&
                  "bg-primary/10 text-primary ring-primary/30",
              )}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">Customize</span>
            </button>

            <div className="ring-border/80 bg-background/70 hidden shrink-0 items-center rounded-full p-0.5 ring-1 lg:flex">
              <button
                type="button"
                aria-label="Scroll to previous stages"
                onClick={() => scrollBoard(-1)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-9 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Scroll to next stages"
                onClick={() => scrollBoard(1)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-9 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {customizationOpen ? (
          <div className="fixed inset-0 z-50 lg:static lg:z-auto">
            <button
              type="button"
              aria-label="Close board customization"
              onClick={() => setCustomizationOpen(false)}
              className="bg-background/70 absolute inset-0 backdrop-blur-sm lg:hidden"
            />
            <div
              ref={customizationPanel}
              id="career-board-customization"
              role="dialog"
              aria-modal={isMobileViewport || undefined}
              aria-labelledby="career-board-customization-title"
              className="bg-card ring-border motion-safe:max-lg:animate-analyst-sheet lg:bg-background/60 absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-[1.75rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 lg:relative lg:inset-auto lg:mt-2 lg:max-h-none lg:overflow-visible lg:rounded-[1.125rem] lg:p-4 lg:shadow-none"
            >
              <div
                className="bg-muted-foreground/25 mx-auto mb-4 h-1 w-10 rounded-full lg:hidden"
                aria-hidden="true"
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="career-board-customization-title"
                    className="text-base font-semibold tracking-[-0.01em] lg:text-sm"
                  >
                    Make the board yours
                  </h3>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Your layout stays on this device.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => updatePreferences(defaultPreferences)}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Reset
                  </Button>
                  <Button
                    ref={customizationClose}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close customization"
                    onClick={() => setCustomizationOpen(false)}
                    className="rounded-full lg:hidden"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:mt-4 lg:grid-cols-[0.75fr_1fr_2fr]">
                <fieldset>
                  <legend className={legendClass}>Card density</legend>
                  <div className="bg-muted/60 ring-border/70 mt-2 grid grid-cols-2 rounded-full p-1 ring-1">
                    {(["comfortable", "compact"] as const).map((density) => (
                      <button
                        key={density}
                        type="button"
                        aria-pressed={preferences.density === density}
                        onClick={() =>
                          updatePreferences({ ...preferences, density })
                        }
                        className={cn(
                          "focus-visible:ring-ring min-h-9 rounded-full px-2 text-xs font-semibold capitalize transition-colors focus-visible:ring-2 focus-visible:outline-none",
                          preferences.density === density
                            ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className={legendClass}>Card details</legend>
                  <div className="mt-2 space-y-2">
                    {[
                      ["showLocation", "Location & setup"],
                      ["showAppliedDate", "Applied date"],
                    ].map(([key, itemLabel]) => {
                      const preferenceKey = key as
                        "showLocation" | "showAppliedDate";
                      return (
                        <label
                          key={key}
                          className="bg-background/70 ring-border/80 flex min-h-11 cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-medium ring-1 sm:min-h-10"
                        >
                          {itemLabel}
                          <input
                            type="checkbox"
                            checked={preferences[preferenceKey]}
                            onChange={(event) =>
                              updatePreferences({
                                ...preferences,
                                [preferenceKey]: event.currentTarget.checked,
                              })
                            }
                            className="accent-primary size-4"
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className={legendClass}>Visible columns</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {careerStages.map((stage) => {
                      const checked = visibleStages.includes(stage);
                      return (
                        <label
                          key={stage}
                          className={cn(
                            "focus-within:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-medium ring-1 transition-colors focus-within:ring-2 sm:min-h-10",
                            checked
                              ? "bg-primary/8 ring-primary/30"
                              : "bg-background/70 ring-border/80 text-muted-foreground",
                          )}
                        >
                          <input
                            type="checkbox"
                            aria-label={`${stageLabels[stage]} column`}
                            checked={checked}
                            disabled={checked && visibleStages.length === 1}
                            onChange={(event) => {
                              const nextStages = event.currentTarget.checked
                                ? careerStages.filter(
                                    (item) =>
                                      visibleStages.includes(item) ||
                                      item === stage,
                                  )
                                : visibleStages.filter(
                                    (item) => item !== stage,
                                  );
                              updatePreferences({
                                ...preferences,
                                visibleStages: nextStages,
                              });
                            }}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid size-4 place-items-center rounded-full ring-1",
                              checked
                                ? "bg-primary-solid text-primary-solid-foreground ring-primary-solid"
                                : "ring-border",
                            )}
                          >
                            {checked ? <Check className="size-3" /> : null}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-2 rounded-full",
                              stageTones[stage].dot,
                            )}
                          />
                          {stageLabels[stage]}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="bg-card sticky bottom-0 -mx-4 mt-5 border-t px-4 pt-3 pb-[max(0rem,env(safe-area-inset-bottom))] lg:hidden">
                <Button
                  type="button"
                  onClick={() => setCustomizationOpen(false)}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-3 hidden px-2 text-xs lg:block">
        Drag a card to another column to move it, or change its stage on the
        card.
        {hiddenCount > 0
          ? ` ${hiddenCount} ${hiddenCount === 1 ? "application is" : "applications are"} in hidden columns.`
          : ""}
      </p>

      <div
        ref={stageTabList}
        role="tablist"
        aria-label="Application stages"
        // `relative` keeps the tabs' screen-reader text inside the strip.
        className="bg-muted/50 ring-border/80 relative mt-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-1 overflow-x-auto rounded-full p-1 ring-1 backdrop-blur lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {visibleStages.map((stage) => {
          const selected = activeStage === stage;
          const urgent = resolvedApplications.some(
            (application) =>
              application.stage === stage && application.is_follow_up_overdue,
          );
          return (
            <button
              key={stage}
              ref={(tab) => {
                stageTabs.current[stage] = tab;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`career-kanban-column-${stage}`}
              onClick={() => setSelectedStage(stage)}
              className={cn(
                "focus-visible:ring-ring inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", stageTones[stage].dot)}
              />
              {stageLabels[stage]}
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none tabular-nums",
                  urgent
                    ? "bg-destructive text-white dark:bg-red-500/20 dark:text-red-300"
                    : selected
                      ? "bg-primary/12 text-primary"
                      : "bg-foreground/[0.07]",
                )}
              >
                {stageCount(stage)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={boardScroll}
        data-testid="career-board-scroll"
        className="-mx-4 mt-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-3 lg:px-0"
      >
        <div className="flex min-w-full items-start gap-3 lg:w-max">
          {visibleStages.map((stage) => {
            const stageApplications = sortApplications(
              filteredApplications.filter(
                (application) => application.stage === stage,
              ),
              sortMode,
            );
            const tone = stageTones[stage];
            const selected = activeStage === stage;
            const overdueInStage = resolvedApplications.filter(
              (application) =>
                application.stage === stage && application.is_follow_up_overdue,
            ).length;
            const dropping = dropStage === stage && Boolean(draggingId);

            return (
              <section
                key={stage}
                id={`career-kanban-column-${stage}`}
                data-testid={`kanban-column-${stage}`}
                aria-label={`${stageLabels[stage]} applications`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropStage(stage);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setDropStage(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const applicationId =
                    event.dataTransfer.getData("text/plain") || draggingId;
                  const application = resolvedApplications.find(
                    (item) => item.id === applicationId,
                  );
                  setDropStage(null);
                  setDraggingId(null);
                  if (application) moveApplication(application, stage);
                }}
                className={cn(
                  "lg:bg-card/45 lg:ring-border/70 relative w-full min-w-0 flex-col transition-[background-color,box-shadow] lg:flex lg:w-[300px] lg:shrink-0 lg:rounded-[1.375rem] lg:p-2 lg:ring-1 lg:backdrop-blur",
                  selected ? "flex" : "hidden",
                  !selected && "lg:flex",
                  dropping &&
                    "lg:bg-primary/[0.06] ring-primary/45 lg:ring-primary/45 rounded-[1.375rem] ring-2 lg:ring-2",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-5 top-0 hidden h-0.5 rounded-b-full opacity-80 lg:block",
                    tone.dot,
                  )}
                />
                <header className="hidden min-h-11 items-center justify-between gap-3 px-2 pt-1 pb-1.5 lg:flex">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                    />
                    <h3 className="truncate text-sm font-semibold tracking-[-0.01em]">
                      {stageLabels[stage]}
                    </h3>
                    <span
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none font-semibold tabular-nums ring-1",
                        tone.soft,
                        tone.text,
                        tone.ring,
                      )}
                    >
                      {stageCount(stage)}
                    </span>
                  </div>
                  {overdueInStage > 0 ? (
                    <span
                      className="text-destructive inline-flex items-center gap-1 text-[11px] font-semibold"
                      title={`${overdueInStage} overdue`}
                    >
                      <AlarmClock className="size-3.5" aria-hidden="true" />
                      {overdueInStage}
                      <span className="sr-only"> overdue</span>
                    </span>
                  ) : null}
                </header>

                <div
                  className={cn(
                    "flex min-h-32 flex-col",
                    preferences.density === "compact" ? "gap-2" : "gap-2.5",
                  )}
                >
                  {stageApplications.length > 0 ? (
                    stageApplications.map((application) => (
                      <ApplicationCard
                        key={application.id}
                        application={application}
                        density={preferences.density}
                        moving={movingApplicationId === application.id}
                        nowIso={nowIso}
                        showAppliedDate={preferences.showAppliedDate}
                        showLocation={preferences.showLocation}
                        onDragStart={setDraggingId}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropStage(null);
                        }}
                        onStageChange={(nextStage) =>
                          setLocalStages((current) => ({
                            ...current,
                            [application.id]: nextStage,
                          }))
                        }
                      />
                    ))
                  ) : (
                    <div
                      className={cn(
                        "text-muted-foreground grid min-h-32 place-items-center rounded-2xl px-4 text-center outline-1 -outline-offset-1 transition-colors outline-dashed",
                        dropping
                          ? "bg-primary/[0.06] text-primary outline-primary/50"
                          : "bg-background/40 outline-border",
                      )}
                    >
                      <div>
                        <Inbox
                          className="mx-auto size-5 opacity-60"
                          aria-hidden="true"
                        />
                        <p className="mt-2 text-xs font-medium">
                          {dropping
                            ? `Drop to move to ${stageLabels[stage].toLowerCase()}`
                            : filtersActive
                              ? "No matching applications"
                              : `Nothing in ${stageLabels[stage].toLowerCase()}`}
                        </p>
                        {filtersActive && !dropping ? (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setAttentionOnly(false);
                            }}
                            className="text-primary hover:bg-primary/10 focus-visible:ring-ring mt-2 min-h-9 rounded-full px-3 text-[11px] font-semibold focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Clear filters
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
