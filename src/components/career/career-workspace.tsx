import { BriefcaseBusiness, Columns3, List } from "lucide-react";
import Link from "next/link";
import { ApplicationCreateDialog } from "@/components/career/application-create-dialog";
import { ApplicationList } from "@/components/career/application-list";
import { CareerEmptyHero, CareerHero } from "@/components/career/career-hero";
import { CareerKanban } from "@/components/career/career-kanban";
import { SpotlightArea } from "@/components/dashboard/spotlight-area";
import todayStyles from "@/components/dashboard/today.module.css";
import {
  listGroups,
  nextFollowUp,
  pipelineConversions,
  pipelineSummary,
  type CareerApplication,
  type CareerEvent,
} from "@/lib/career/view";
import { cn } from "@/lib/utils";

export type CareerView = "list" | "board";

/** `?view=board` (or the older `kanban`) opens the board; anything else, the list. */
export function parseCareerView(value: string | undefined): CareerView {
  return value === "board" || value === "kanban" ? "board" : "list";
}

const views = [
  { value: "list", label: "List", icon: List, href: "/career" },
  {
    value: "board",
    label: "Board",
    icon: Columns3,
    href: "/career?view=board",
  },
] as const;

function ViewSwitch({ view }: { view: CareerView }) {
  return (
    <nav
      aria-label="Career views"
      className="bg-muted/50 ring-border/80 flex min-w-0 rounded-full p-1 ring-1 backdrop-blur"
    >
      {views.map(({ value, label, icon: Icon, href }) => {
        const active = view === value;
        return (
          <Link
            key={value}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8 sm:px-4",
              active
                ? "bg-card text-foreground shadow-[0_1px_3px_rgb(7_10_15/0.18)]"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 max-[379px]:hidden",
                active && "text-primary",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The Career page body, from data the page has already loaded. */
export function CareerWorkspace({
  applications,
  events,
  view,
  nowIso,
  highlightId,
}: {
  applications: CareerApplication[];
  events: CareerEvent[];
  view: CareerView;
  nowIso: string;
  highlightId?: string;
}) {
  const empty = applications.length === 0;
  const summary = pipelineSummary(applications);

  return (
    <SpotlightArea className="relative isolate mx-auto w-full max-w-[1500px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className={cn(todayStyles.aurora, todayStyles.grain)}
      />

      <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <p className="bg-card/60 text-primary ring-border/70 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase ring-1 backdrop-blur">
            <BriefcaseBusiness aria-hidden="true" className="size-3.5" />
            Opportunity pipeline
          </p>
          <h1 className="from-foreground via-foreground to-foreground/60 mt-4 bg-gradient-to-br bg-clip-text pb-[0.08em] text-[2.125rem] leading-[1.04] font-semibold tracking-[-0.05em] text-transparent sm:text-[2.75rem] lg:text-[3.25rem]">
            Career
          </h1>
          <p className="text-muted-foreground mt-2.5 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            {view === "board"
              ? "Every opportunity by stage. Drag a card, or change its stage, to move it forward."
              : "Every application tied to a stage, a date, and one clear next action."}
          </p>
        </div>
        {/* Until something is tracked, the hero holds the only add button
            and there is nothing to switch between. */}
        {empty ? null : (
          <div className="flex flex-wrap items-center gap-2 [&>*]:grow sm:[&>*]:grow-0">
            <ViewSwitch view={view} />
            <ApplicationCreateDialog />
          </div>
        )}
      </header>

      {empty ? (
        <CareerEmptyHero />
      ) : (
        <>
          <CareerHero
            summary={summary}
            conversions={pipelineConversions(applications, events)}
            next={nextFollowUp(applications)}
            nowIso={nowIso}
          />
          {view === "board" ? (
            <CareerKanban applications={applications} nowIso={nowIso} />
          ) : (
            <ApplicationList
              groups={listGroups(applications, nowIso)}
              nowIso={nowIso}
              highlightId={highlightId}
            />
          )}
        </>
      )}
    </SpotlightArea>
  );
}
