import {
  AlarmClock,
  Archive,
  CalendarClock,
  CalendarDays,
  CircleDashed,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { ApplicationEditForm } from "@/components/career/application-edit-form";
import { CompanyMark } from "@/components/career/company-mark";
import { DueChip } from "@/components/career/due-chip";
import { StageSelect } from "@/components/career/stage-select";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import {
  dueChip,
  formatCareerDate,
  isOpenStage,
  placeLabel,
  salaryRangeLabel,
  type CareerApplication,
  type ListGroup,
  type ListGroupId,
} from "@/lib/career/view";
import { cn } from "@/lib/utils";

const groupIcons: Record<
  ListGroupId,
  { icon: LucideIcon; tone: "attention" | "default" | "muted" }
> = {
  attention: { icon: AlarmClock, tone: "attention" },
  week: { icon: CalendarClock, tone: "default" },
  later: { icon: CalendarDays, tone: "default" },
  unplanned: { icon: CircleDashed, tone: "muted" },
  closed: { icon: Archive, tone: "muted" },
};

const iconLinkClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9";

function NextAction({
  application,
  nowIso,
}: {
  application: CareerApplication;
  nowIso: string;
}) {
  const due = dueChip(application, nowIso);
  const open = isOpenStage(application.stage);

  if (!application.next_action && !due) {
    return (
      <p className="text-muted-foreground text-sm leading-5">
        {open
          ? "No next action yet"
          : application.applied_at
            ? `Applied ${formatCareerDate(application.applied_at)}`
            : "Closed"}
      </p>
    );
  }
  return (
    <>
      <p
        className={cn(
          "text-sm leading-5 font-medium break-words",
          !application.next_action && "text-muted-foreground font-normal",
          !open && "text-muted-foreground",
        )}
      >
        {application.next_action ?? "No next action written"}
      </p>
      {due ? <DueChip due={due} className="mt-1.5" /> : null}
    </>
  );
}

function ApplicationRow({
  application,
  nowIso,
  highlighted,
}: {
  application: CareerApplication;
  nowIso: string;
  highlighted: boolean;
}) {
  const place = placeLabel(application);
  const salary = salaryRangeLabel(
    application.salary_min_centavos,
    application.salary_max_centavos,
  );
  const closed = !isOpenStage(application.stage);

  return (
    <li
      id={`application-${application.id}`}
      className={cn(
        "relative scroll-mt-24 first:rounded-t-[inherit] last:rounded-b-[inherit]",
        highlighted && "bg-primary/[0.07]",
      )}
    >
      {highlighted ? (
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-y-3 left-0 w-1 rounded-r-full"
        />
      ) : null}
      <div className="@container grid gap-3 p-4 min-[360px]:px-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.3fr)_minmax(9.5rem,11rem)_7.5rem_5.5rem] lg:items-center lg:gap-5 lg:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark
            name={application.company_name}
            muted={closed}
            className="@max-[15rem]:hidden"
          />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
              <p className="truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em]">
                {application.company_name}
              </p>
              {/* Below lg the salary rides on the name line, leaving the
                  stage chip room to name the stage in full. */}
              {salary ? (
                <p className="text-muted-foreground shrink-0 font-mono text-xs font-semibold lg:hidden">
                  <span className="sr-only">Salary: </span>
                  <SensitiveValue>{salary}</SensitiveValue>
                </p>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-xs leading-5">
              {application.role_title}
              {place ? <span className="lg:hidden"> · {place}</span> : null}
            </p>
            {place ? (
              <p className="text-muted-foreground hidden truncate text-xs leading-5 lg:block">
                {place}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 sm:pl-[3.25rem] lg:pl-0">
          <NextAction application={application} nowIso={nowIso} />
        </div>

        {/* Phones and tablets: the stage and the actions share one row, and
            wrap apart when text is large. On wide screens the stage, the
            salary, and the actions each take a column. */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:pl-[3.25rem] lg:contents">
          <StageSelect
            applicationId={application.id}
            companyName={application.company_name}
            stage={application.stage}
            className="grow basis-40 sm:max-w-[13rem] lg:max-w-none"
          />
          <div className="min-w-0 max-lg:hidden">
            {salary ? (
              <>
                <p className="truncate font-mono text-sm font-semibold tracking-[-0.01em]">
                  <span className="sr-only">Salary: </span>
                  <SensitiveValue>{salary}</SensitiveValue>
                </p>
                <p className="text-muted-foreground text-[0.6875rem] leading-4">
                  a month
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                <span aria-hidden="true">—</span>
                <span className="sr-only">No salary range</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-0.5 max-lg:ml-auto">
            {application.job_url ? (
              <a
                href={application.job_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open job post for ${application.company_name}`}
                title="Open job post"
                className={iconLinkClass}
              >
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : (
              <span aria-hidden="true" className="size-11 sm:size-9" />
            )}
            <ApplicationEditForm application={application} />
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Every application in sections by what it needs next: overdue first, then
 * this week, later, open with nothing scheduled, and closed.
 */
export function ApplicationList({
  groups,
  nowIso,
  highlightId,
}: {
  groups: ListGroup[];
  nowIso: string;
  highlightId?: string;
}) {
  return (
    <div className="mt-8 space-y-8 sm:mt-10">
      {groups.map((group) => {
        const headingId = `career-group-${group.id}`;
        const { icon: Icon, tone } = groupIcons[group.id];
        const count = group.applications.length;
        return (
          <section key={group.id} aria-labelledby={headingId}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg ring-1",
                  tone === "attention" &&
                    "bg-destructive/10 text-destructive ring-destructive/20",
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
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.6875rem] leading-none font-semibold",
                    tone === "attention"
                      ? "bg-destructive text-white dark:bg-red-500/20 dark:text-red-300"
                      : "bg-foreground/[0.07] text-muted-foreground",
                  )}
                >
                  <span className="sr-only">, </span>
                  {count}
                  <span className="sr-only">
                    {count === 1 ? " application" : " applications"}
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
                group.id === "attention" &&
                  "ring-destructive/20 ring-1 dark:bg-[color-mix(in_srgb,var(--destructive)_4%,var(--card))]",
              )}
            >
              {group.applications.map((application) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  nowIso={nowIso}
                  highlighted={application.id === highlightId}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
