"use client";

import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripVertical,
  LayoutGrid,
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
import { StageSelect } from "@/components/career/stage-select";
import { useOfflineSync } from "@/components/offline/offline-mutation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateApplicationStageAction } from "@/lib/career/actions";
import { cn } from "@/lib/utils";

const pipelineStages = [
  "interested",
  "preparing",
  "applied",
  "assessment",
  "interview",
  "final_interview",
  "offer",
] as const;

const careerStages = [
  ...pipelineStages,
  "accepted",
  "rejected",
  "withdrawn",
] as const;

type CareerStage = (typeof careerStages)[number];
type SortMode = "attention" | "newest" | "oldest";
type BoardDensity = "comfortable" | "compact";

type BoardPreferences = {
  density: BoardDensity;
  showAppliedDate: boolean;
  showLocation: boolean;
  visibleStages: CareerStage[];
};

const stageLabels: Record<CareerStage, string> = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  final_interview: "Final interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const stageTones: Record<
  CareerStage,
  { dot: string; soft: string; text: string }
> = {
  interested: {
    dot: "bg-slate-400",
    soft: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
  },
  preparing: {
    dot: "bg-violet-500",
    soft: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
  },
  applied: {
    dot: "bg-blue-500",
    soft: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
  },
  assessment: {
    dot: "bg-amber-500",
    soft: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
  },
  interview: {
    dot: "bg-cyan-500",
    soft: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  final_interview: {
    dot: "bg-indigo-500",
    soft: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  offer: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  accepted: {
    dot: "bg-green-500",
    soft: "bg-green-500/10",
    text: "text-green-700 dark:text-green-300",
  },
  rejected: {
    dot: "bg-rose-500",
    soft: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
  },
  withdrawn: {
    dot: "bg-zinc-400",
    soft: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-300",
  },
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

export type CareerApplication = {
  id: string;
  company_name: string;
  role_title: string;
  job_url: string | null;
  location: string | null;
  work_setup: string;
  employment_type: string;
  stage: string;
  salary_min_centavos: number | null;
  salary_max_centavos: number | null;
  next_action: string | null;
  next_action_at: string | null;
  applied_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  resume_version: string | null;
  notes: string | null;
  is_follow_up_overdue: boolean;
};

const manilaDateKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const friendlyDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function isCareerStage(stage: string): stage is CareerStage {
  return careerStages.includes(stage as CareerStage);
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function dateDistance(from: string, to: string) {
  const fromDate = Date.parse(
    `${manilaDateKey.format(new Date(from))}T00:00:00Z`,
  );
  const toDate = Date.parse(`${manilaDateKey.format(new Date(to))}T00:00:00Z`);
  return Math.round((toDate - fromDate) / 86_400_000);
}

function dueLabel(application: CareerApplication, nowIso: string) {
  if (!application.next_action_at) return null;
  if (application.is_follow_up_overdue) return "Overdue";

  const days = dateDistance(nowIso, application.next_action_at);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  return friendlyDate.format(new Date(application.next_action_at));
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
  const due = dueLabel(application, nowIso);
  const applicationStageLabel = isCareerStage(application.stage)
    ? stageLabels[application.stage]
    : label(application.stage);
  const applicationStageTone = isCareerStage(application.stage)
    ? stageTones[application.stage]
    : stageTones.interested;

  return (
    <Card
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", application.id);
        onDragStart(application.id);
      }}
      onDragEnd={onDragEnd}
      data-testid={`kanban-card-${application.id}`}
      className={cn(
        "group hover:border-primary/45 bg-card/95 lg:bg-card overflow-hidden rounded-2xl shadow-md shadow-black/20 transition-[border-color,box-shadow,opacity,transform] lg:cursor-grab lg:shadow-sm lg:active:cursor-grabbing",
        moving && "opacity-55",
      )}
    >
      <CardContent
        className={cn(
          "p-4 sm:p-4",
          density === "compact" ? "lg:p-3" : "lg:p-4",
        )}
      >
        <div
          data-testid={`kanban-card-mobile-status-${application.id}`}
          className="border-border/80 flex items-center justify-between gap-3 border-b pb-3 lg:hidden"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                applicationStageTone.dot,
              )}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold">
              {applicationStageLabel}
            </span>
          </div>
          {showAppliedDate && application.applied_at ? (
            <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
              <CalendarDays className="size-4" aria-hidden="true" />
              <time dateTime={application.applied_at}>
                {friendlyDate.format(new Date(application.applied_at))}
              </time>
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-start gap-3 lg:mt-0">
          <div className="border-primary/20 bg-primary/8 text-primary grid size-12 shrink-0 place-items-center rounded-xl border lg:size-10">
            <Building2 className="size-5 lg:size-[18px]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold tracking-[-0.025em] lg:text-sm lg:tracking-[-0.01em]">
                  {application.company_name}
                </h3>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-5 lg:mt-0.5 lg:text-xs">
                  {application.role_title}
                </p>
                {showLocation &&
                (application.location ||
                  application.work_setup !== "unspecified") ? (
                  <span className="text-muted-foreground mt-1.5 inline-flex min-w-0 items-center gap-1.5 text-xs lg:hidden">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {[
                        application.location,
                        application.work_setup !== "unspecified"
                          ? label(application.work_setup)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                ) : null}
              </div>
              <GripVertical
                className="text-muted-foreground/45 mt-0.5 hidden size-4 shrink-0 lg:block"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {(showLocation || showAppliedDate) && (
          <div className="text-muted-foreground mt-3 hidden flex-wrap items-center gap-x-3 gap-y-1.5 lg:flex lg:text-[11px]">
            {showLocation &&
            (application.location ||
              application.work_setup !== "unspecified") ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {[
                    application.location,
                    application.work_setup !== "unspecified"
                      ? label(application.work_setup)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            ) : null}
            {showAppliedDate && application.applied_at ? (
              <span className="hidden items-center gap-1.5 lg:inline-flex">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <time dateTime={application.applied_at}>
                  {friendlyDate.format(new Date(application.applied_at))}
                </time>
              </span>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "border-primary lg:border-border mt-3 border-t pt-3",
            density === "compact" ? "lg:mt-3 lg:pt-3" : "lg:mt-4 lg:pt-4",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  "font-mono text-[10px] font-semibold tracking-[0.16em] uppercase lg:text-[9px] lg:tracking-[0.14em]",
                  overdue ? "text-destructive" : "text-primary",
                )}
              >
                Next action
              </p>
              <p className="mt-1.5 line-clamp-2 text-xl leading-7 font-semibold tracking-[-0.02em] lg:text-xs lg:leading-5 lg:font-medium lg:tracking-normal">
                {application.next_action ?? "Add a next action"}
              </p>
            </div>
            {due ? (
              <span
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold lg:border lg:px-2 lg:py-1 lg:text-[10px]",
                  overdue
                    ? "bg-destructive lg:border-destructive/35 lg:bg-destructive/10 lg:text-destructive text-white"
                    : "bg-primary text-primary-foreground lg:border-primary/25 lg:bg-primary/8 lg:text-primary",
                )}
              >
                {due}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "mt-3 grid grid-cols-2 gap-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-2",
            density === "compact" ? "lg:mt-3" : "lg:mt-4",
          )}
        >
          <StageSelect
            applicationId={application.id}
            companyName={application.company_name}
            stage={application.stage}
            onStageChange={onStageChange}
            className="col-span-2 min-h-11 w-full rounded-xl px-4 text-sm font-semibold lg:col-span-1 lg:min-h-10 lg:px-3 lg:text-xs"
          />
          <ApplicationEditForm
            application={application}
            compact
            triggerClassName={cn(
              "border-border/80 text-primary col-span-1 mt-2.5 min-h-11 rounded-none border-0 border-t bg-transparent px-3 hover:bg-primary/5 lg:mt-0 lg:min-h-10 lg:rounded-xl lg:border lg:border-border lg:bg-secondary lg:text-secondary-foreground lg:hover:bg-muted",
              !application.job_url && "col-span-2 lg:col-span-1",
            )}
          />

          {application.job_url ? (
            <a
              href={application.job_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open job post for ${application.company_name}`}
              className="border-border/80 text-primary hover:bg-primary/5 focus-visible:ring-ring col-span-1 mt-2.5 inline-flex min-h-11 items-center justify-center gap-2 border-t border-l px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none lg:col-span-2 lg:mt-1 lg:min-h-8 lg:justify-start lg:rounded-lg lg:border-0 lg:px-0 lg:text-[11px]"
            >
              View job post
              <ExternalLink className="size-4 lg:size-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
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
  const activeCount = resolvedApplications.filter((application) =>
    pipelineStages.includes(
      application.stage as (typeof pipelineStages)[number],
    ),
  ).length;
  const overdueCount = resolvedApplications.filter(
    (application) => application.is_follow_up_overdue,
  ).length;
  const hiddenOutcomeCount = careerStages
    .filter((stage) => !visibleStages.includes(stage))
    .reduce((total, stage) => total + stageTotals[stage], 0);
  const filtersActive = Boolean(query.trim()) || attentionOnly;

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

  return (
    <section className="mt-5 sm:mt-6" aria-label="Career application Kanban">
      <div className="border-border bg-card rounded-2xl border p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
              <LayoutGrid className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-[-0.01em]">
                Pipeline board
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {activeCount} active · {overdueCount} need attention
                {hiddenOutcomeCount > 0
                  ? ` · ${hiddenOutcomeCount} in hidden columns`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <label className="border-border bg-background focus-within:border-primary focus-within:ring-primary/20 relative flex min-h-11 min-w-0 flex-1 items-center rounded-xl border pl-10 transition-shadow focus-within:ring-2 sm:min-h-10 sm:w-64 sm:flex-none">
              <Search
                className="text-muted-foreground absolute left-3 size-4"
                aria-hidden="true"
              />
              <span className="sr-only">Search applications</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search applications"
                className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent pr-2 text-sm outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear application search"
                  className="text-muted-foreground hover:text-foreground grid size-10 place-items-center"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <Button
              type="button"
              variant={attentionOnly ? "default" : "secondary"}
              size="sm"
              aria-pressed={attentionOnly}
              aria-label="Needs attention"
              title="Needs attention"
              onClick={() => setAttentionOnly((current) => !current)}
              className="relative size-11 shrink-0 justify-center px-0 sm:size-auto sm:px-3"
            >
              <AlertCircle className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Needs attention</span>
              {overdueCount > 0 ? (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] sm:static",
                    attentionOnly
                      ? "bg-primary-foreground/20"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {overdueCount}
                </span>
              ) : null}
            </Button>

            <Button
              type="button"
              ref={customizationTrigger}
              variant="secondary"
              size="sm"
              aria-label="Customize"
              aria-expanded={customizationOpen}
              aria-controls="career-board-customization"
              onClick={() => setCustomizationOpen((open) => !open)}
              title="Customize board"
              className="size-11 shrink-0 justify-center px-0 sm:size-auto sm:px-3"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Customize</span>
            </Button>
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
              className="border-border bg-card lg:bg-muted/25 absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-3xl border border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:relative lg:inset-auto lg:mt-4 lg:max-h-none lg:overflow-visible lg:rounded-xl lg:border lg:pb-4 lg:shadow-none"
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
                    Your layout preferences stay on this device.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
                    className="lg:hidden"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:mt-4 lg:grid-cols-[0.75fr_1fr_2fr]">
                <fieldset>
                  <legend className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                    Card density
                  </legend>
                  <div className="border-border bg-background mt-2 grid grid-cols-2 rounded-xl border p-1">
                    {(["comfortable", "compact"] as const).map((density) => (
                      <button
                        key={density}
                        type="button"
                        aria-pressed={preferences.density === density}
                        onClick={() =>
                          updatePreferences({ ...preferences, density })
                        }
                        className={cn(
                          "focus-visible:ring-ring min-h-9 rounded-lg px-2 text-xs font-semibold capitalize focus-visible:ring-2 focus-visible:outline-none",
                          preferences.density === density
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                    Card details
                  </legend>
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
                          className="border-border bg-background flex min-h-10 cursor-pointer items-center justify-between rounded-xl border px-3 text-xs font-medium"
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
                  <legend className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                    Visible columns
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {careerStages.map((stage) => {
                      const checked = visibleStages.includes(stage);
                      return (
                        <label
                          key={stage}
                          className={cn(
                            "border-border bg-background focus-within:ring-ring inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-medium focus-within:ring-2",
                            checked && "border-primary/35 bg-primary/5",
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
                            className={cn(
                              "border-border grid size-4 place-items-center rounded border",
                              checked &&
                                "border-primary bg-primary text-primary-foreground",
                            )}
                          >
                            {checked ? (
                              <Check className="size-3" aria-hidden="true" />
                            ) : null}
                          </span>
                          <span
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

      <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
        <p className="text-muted-foreground hidden text-xs lg:block">
          Drag cards between columns. Use the arrows to explore every stage.
        </p>
        <p className="text-muted-foreground text-xs lg:hidden">
          Select a stage.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <label>
            <span className="sr-only">Sort applications</span>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.currentTarget.value as SortMode)
              }
              aria-label="Sort applications"
              className="border-border bg-background min-h-10 rounded-xl border px-3 text-xs font-medium"
            >
              <option value="attention">Needs attention</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div className="border-border bg-card hidden rounded-xl border p-1 lg:flex">
            <button
              type="button"
              aria-label="Scroll to previous stages"
              onClick={() =>
                boardScroll.current?.scrollBy({
                  left: -608,
                  behavior: "smooth",
                })
              }
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Scroll to next stages"
              onClick={() =>
                boardScroll.current?.scrollBy({
                  left: 608,
                  behavior: "smooth",
                })
              }
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={stageTabList}
        role="tablist"
        aria-label="Application stages"
        className="border-border bg-card mt-3 flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-2xl border p-1.5 sm:mt-4 lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {visibleStages.map((stage) => {
          const selected = activeStage === stage;
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
                "focus-visible:ring-ring min-h-14 min-w-25 snap-start rounded-xl px-3 text-center focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="block text-[11px] font-semibold whitespace-nowrap">
                {stageLabels[stage]}
              </span>
              <span className="mt-1 block font-mono text-xs font-semibold tabular-nums">
                {filtersActive
                  ? `${filteredCounts[stage]}/${stageTotals[stage]}`
                  : stageTotals[stage]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={boardScroll}
        data-testid="career-board-scroll"
        className="-mx-4 mt-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:mt-4 sm:px-6 lg:mx-0 lg:px-0"
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
                  "lg:border-border lg:bg-muted/25 w-full min-w-0 flex-col transition-[border-color,background-color,box-shadow] lg:flex lg:w-[292px] lg:shrink-0 lg:rounded-2xl lg:border lg:p-2",
                  selected ? "flex" : "hidden",
                  !selected && "lg:flex",
                  dropStage === stage &&
                    draggingId &&
                    "border-primary bg-primary/5 ring-primary/20 rounded-2xl ring-2",
                )}
              >
                <header className="hidden min-h-12 items-center justify-between gap-3 px-2 py-1.5 lg:flex">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn("size-2.5 shrink-0 rounded-full", tone.dot)}
                    />
                    <h3 className="truncate text-sm font-semibold">
                      {stageLabels[stage]}
                    </h3>
                    <span
                      className={cn(
                        "rounded-lg px-2 py-1 font-mono text-[10px] font-semibold tabular-nums",
                        tone.soft,
                        tone.text,
                      )}
                    >
                      {filtersActive
                        ? `${filteredCounts[stage]}/${stageTotals[stage]}`
                        : stageTotals[stage]}
                    </span>
                  </div>
                  {overdueInStage > 0 ? (
                    <span
                      className="text-destructive inline-flex items-center gap-1 text-[10px] font-semibold"
                      title={`${overdueInStage} overdue`}
                    >
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {overdueInStage}
                    </span>
                  ) : null}
                </header>

                <div
                  className={cn(
                    "flex min-h-32 flex-col",
                    preferences.density === "compact" ? "gap-2" : "gap-3",
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
                    <div className="border-border/80 text-muted-foreground bg-background/45 grid min-h-32 place-items-center rounded-xl border border-dashed px-4 text-center">
                      <div>
                        <BriefcaseBusiness
                          className="mx-auto size-5 opacity-65"
                          aria-hidden="true"
                        />
                        <p className="mt-2 text-xs font-medium">
                          {filtersActive
                            ? "No matching applications"
                            : `No applications in ${stageLabels[stage].toLowerCase()}`}
                        </p>
                        {filtersActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setAttentionOnly(false);
                            }}
                            className="text-primary mt-2 min-h-8 text-[11px] font-semibold"
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
