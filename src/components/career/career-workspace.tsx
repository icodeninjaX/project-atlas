import { BriefcaseBusiness, Columns3, List } from "lucide-react";
import Link from "next/link";
import { ApplicationCreateDialog } from "@/components/career/application-create-dialog";
import { ApplicationList } from "@/components/career/application-list";
import { CareerEmptyHero, CareerHero } from "@/components/career/career-hero";
import { CareerKanban } from "@/components/career/career-kanban";
import {
  listGroups,
  nextFollowUp,
  pipelineConversions,
  pipelineSummary,
  type CareerApplication,
  type CareerEvent,
} from "@/lib/career/view";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/shared/page-heading";
import { PageShell } from "@/components/shared/page-shell";

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
    <PageShell>
      <PageHeading
        eyebrow="Opportunity pipeline"
        icon={BriefcaseBusiness}
        title="Career"
        description={
          view === "board"
            ? "Every opportunity by stage. Drag a card, or change its stage, to move it forward."
            : "Every application tied to a stage, a date, and one clear next action."
        }
        actions={
          // Until something is tracked, the hero holds the only add button
          // and there is nothing to switch between.
          empty ? undefined : (
            <>
              <ViewSwitch view={view} />
              <ApplicationCreateDialog />
            </>
          )
        }
      />

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
    </PageShell>
  );
}
