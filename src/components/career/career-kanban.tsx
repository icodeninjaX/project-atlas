"use client";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  MapPin,
  MoveRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApplicationEditForm } from "@/components/career/application-edit-form";
import { StageSelect } from "@/components/career/stage-select";
import { Card, CardContent } from "@/components/ui/card";
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

type PipelineStage = (typeof pipelineStages)[number];
type SortMode = "attention" | "newest";

const stageLabels: Record<PipelineStage, string> = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  final_interview: "Final interview",
  offer: "Offer",
};

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

function isPipelineStage(stage: string): stage is PipelineStage {
  return pipelineStages.includes(stage as PipelineStage);
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

function initialStage(applications: CareerApplication[]): PipelineStage {
  const overdue = applications.find(
    (application) =>
      application.is_follow_up_overdue && isPipelineStage(application.stage),
  );
  if (overdue && isPipelineStage(overdue.stage)) return overdue.stage;

  return (
    pipelineStages.find((stage) =>
      applications.some((application) => application.stage === stage),
    ) ?? "interested"
  );
}

export function CareerKanban({
  applications,
  nowIso,
}: {
  applications: CareerApplication[];
  nowIso: string;
}) {
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(() =>
    initialStage(applications),
  );
  const [sortMode, setSortMode] = useState<SortMode>("attention");
  const [localStages, setLocalStages] = useState<Record<string, string>>({});
  const stageTabs = useRef<
    Partial<Record<PipelineStage, HTMLButtonElement | null>>
  >({});

  useEffect(() => {
    const selectedTab = stageTabs.current[selectedStage];
    if (typeof selectedTab?.scrollIntoView === "function") {
      selectedTab.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [selectedStage]);

  const resolvedApplications = useMemo(
    () =>
      applications.map((application) => ({
        ...application,
        stage: localStages[application.id] ?? application.stage,
      })),
    [applications, localStages],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        pipelineStages.map((stage) => [
          stage,
          resolvedApplications.filter(
            (application) => application.stage === stage,
          ).length,
        ]),
      ) as Record<PipelineStage, number>,
    [resolvedApplications],
  );

  const selectedApplications = useMemo(() => {
    const items = resolvedApplications.filter(
      (application) => application.stage === selectedStage,
    );

    return items.sort((a, b) => {
      if (sortMode === "attention") {
        const overdueDifference =
          Number(b.is_follow_up_overdue) - Number(a.is_follow_up_overdue);
        if (overdueDifference) return overdueDifference;
      }

      return (
        Date.parse(b.applied_at ?? "1970-01-01") -
        Date.parse(a.applied_at ?? "1970-01-01")
      );
    });
  }, [resolvedApplications, selectedStage, sortMode]);

  return (
    <section className="mt-6" aria-label="Career application Kanban">
      <div className="border-border bg-card/95 sticky top-0 z-30 -mx-4 border-y backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div
          role="tablist"
          aria-label="Application stages"
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto px-2 [&::-webkit-scrollbar]:hidden"
        >
          {pipelineStages.map((stage) => {
            const selected = selectedStage === stage;
            return (
              <button
                key={stage}
                ref={(button) => {
                  stageTabs.current[stage] = button;
                }}
                id={`career-stage-tab-${stage}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="career-stage-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setSelectedStage(stage)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                    return;
                  }
                  event.preventDefault();
                  const offset = event.key === "ArrowRight" ? 1 : -1;
                  const currentIndex = pipelineStages.indexOf(stage);
                  const nextIndex =
                    (currentIndex + offset + pipelineStages.length) %
                    pipelineStages.length;
                  const nextStage = pipelineStages[nextIndex]!;
                  setSelectedStage(nextStage);
                  stageTabs.current[nextStage]?.focus();
                }}
                className={cn(
                  "focus-visible:ring-ring relative min-h-20 min-w-26 snap-start px-3 py-3 text-center focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:min-w-30",
                  "after:bg-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:transition-transform",
                  selected
                    ? "bg-primary/7 text-primary after:scale-x-100"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="block text-xs font-semibold whitespace-nowrap sm:text-sm">
                  {stageLabels[stage]}
                </span>
                <span className="mt-2 block font-mono text-sm font-semibold tabular-nums">
                  {counts[stage]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-muted-foreground mt-3 text-center text-[11px] sm:hidden">
        Swipe to see more stages
      </p>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.025em]">
            {stageLabels[selectedStage]}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {counts[selectedStage]}{" "}
            {counts[selectedStage] === 1 ? "application" : "applications"}
          </p>
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="sr-only">Sort applications</span>
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.currentTarget.value as SortMode)
            }
            aria-label="Sort applications"
            className="border-border bg-background min-h-10 rounded-xl border px-3 text-xs"
          >
            <option value="attention">Needs attention</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>

      <div
        id="career-stage-panel"
        role="tabpanel"
        aria-labelledby={`career-stage-tab-${selectedStage}`}
        className="mt-4"
      >
        {selectedApplications.length === 0 ? (
          <div className="border-border grid min-h-52 place-items-center rounded-2xl border border-dashed px-6 text-center">
            <div>
              <BriefcaseBusiness className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No applications in {stageLabels[selectedStage].toLowerCase()}.
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Move an opportunity here or add a new application.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {selectedApplications.map((application) => {
              const overdue = application.is_follow_up_overdue;
              const due = dueLabel(application, nowIso);

              return (
                <Card
                  key={application.id}
                  className="hover:border-primary/45 overflow-hidden transition-colors"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="border-primary/20 bg-primary/8 text-primary grid size-11 shrink-0 place-items-center rounded-xl border">
                        <Building2 className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold tracking-[-0.015em]">
                              {application.company_name}
                            </h3>
                            <p className="text-muted-foreground mt-0.5 text-sm leading-5">
                              {application.role_title}
                            </p>
                          </div>
                          {application.applied_at ? (
                            <p className="text-muted-foreground shrink-0 text-right text-[11px] leading-4">
                              Applied
                              <br />
                              <time dateTime={application.applied_at}>
                                {friendlyDate.format(
                                  new Date(application.applied_at),
                                )}
                              </time>
                            </p>
                          ) : null}
                        </div>

                        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                          {application.location ||
                          application.work_setup !== "unspecified" ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="size-3.5" />
                              {[
                                application.location,
                                application.work_setup !== "unspecified"
                                  ? label(application.work_setup)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5">
                            <BriefcaseBusiness className="size-3.5" />
                            {label(application.employment_type)}
                          </span>
                          {application.job_url ? (
                            <a
                              href={application.job_url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open job link for ${application.company_name}`}
                              className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 font-semibold focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Job post <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="border-border mt-4 border-t pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-mono text-[10px] font-semibold tracking-[0.14em] uppercase",
                              overdue ? "text-destructive" : "text-primary",
                            )}
                          >
                            Next action
                          </p>
                          <p className="mt-2 flex items-start gap-2 text-sm leading-5 font-medium">
                            <CalendarDays
                              className={cn(
                                "mt-0.5 size-4 shrink-0",
                                overdue ? "text-destructive" : "text-primary",
                              )}
                            />
                            <span>
                              {application.next_action ?? "Add a next action"}
                            </span>
                          </p>
                          {application.next_action_at ? (
                            <time
                              dateTime={application.next_action_at}
                              className={cn(
                                "mt-1 block pl-6 text-xs",
                                overdue
                                  ? "text-destructive font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {friendlyDate.format(
                                new Date(application.next_action_at),
                              )}
                            </time>
                          ) : null}
                        </div>
                        {due ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
                              overdue
                                ? "border-destructive/35 bg-destructive/10 text-destructive"
                                : "border-primary/25 bg-primary/8 text-primary",
                            )}
                          >
                            {due}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <div className="border-primary/55 bg-primary/7 text-primary focus-within:ring-ring relative flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold focus-within:ring-2">
                        <MoveRight className="size-4" />
                        <span className="text-sm">Move stage</span>
                        <ChevronDown className="ml-auto size-4" />
                        <StageSelect
                          applicationId={application.id}
                          companyName={application.company_name}
                          stage={application.stage}
                          onStageChange={(stage) =>
                            setLocalStages((current) => ({
                              ...current,
                              [application.id]: stage,
                            }))
                          }
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
                        />
                      </div>

                      <ApplicationEditForm application={application} compact />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
