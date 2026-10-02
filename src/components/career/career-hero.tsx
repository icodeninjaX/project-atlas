import { ArrowRight, BriefcaseBusiness, CalendarCheck2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ApplicationCreateDialog } from "@/components/career/application-create-dialog";
import { CompanyMark } from "@/components/career/company-mark";
import { DueChip } from "@/components/career/due-chip";
import { stageTones } from "@/components/career/stage-tone";
import { surfaceClass } from "@/components/dashboard/dashboard-card";
import todayStyles from "@/components/dashboard/today.module.css";
import {
  closedStages,
  dueChip,
  joinWords,
  momentumParts,
  pipelineStages,
  pipelineStatus,
  stageLabel,
  stageLabels,
  type CareerApplication,
  type Conversion,
  type PipelineSummary,
  type PipelineTone,
} from "@/lib/career/view";
import { cn } from "@/lib/utils";

const eyebrowClass =
  "text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase";

function StatusPill({
  tone,
  children,
}: {
  tone: PipelineTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] leading-tight font-semibold ring-1",
        tone === "positive" && "bg-positive/10 text-positive ring-positive/25",
        tone === "caution" &&
          "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
        tone === "destructive" &&
          "bg-destructive/10 text-destructive ring-destructive/25",
        tone === "neutral" &&
          "bg-background/60 text-muted-foreground ring-border",
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

/** A wash of light from the top, two soft glows, and a faint grid. */
function HeroLight() {
  return (
    <>
      <div
        aria-hidden="true"
        className="from-primary/14 pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -left-24 -z-10 size-80 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="atlas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)] opacity-40"
      />
      <div
        aria-hidden="true"
        className="via-primary/70 pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
    </>
  );
}

function HeroShell({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="pipeline-heading"
      data-spotlight
      className={cn(
        surfaceClass,
        "bg-card @container relative isolate mt-6 overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(7_10_15/0.06),0_32px_90px_-34px_rgb(7_10_15/0.5)] sm:mt-8 sm:rounded-[2rem]",
      )}
    >
      <HeroLight />
      <div className="relative p-5 sm:p-7 lg:p-8">{children}</div>
    </section>
  );
}

/**
 * The open stages as one bar, each as long as its share, with every stage
 * named beneath. The bar is decorative; the legend carries the counts.
 */
function PipelineTrack({ counts }: { counts: PipelineSummary["counts"] }) {
  const filled = pipelineStages.filter((stage) => counts[stage] > 0);
  return (
    <div>
      <p className={cn(eyebrowClass, "mb-3")}>Where they stand</p>
      <div
        aria-hidden="true"
        className="bg-muted/70 ring-border/60 flex h-2.5 overflow-hidden rounded-full ring-1"
      >
        {filled.length ? (
          <div className={cn("flex w-full gap-1", todayStyles.fill)}>
            {filled.map((stage) => (
              <span
                key={stage}
                style={{ flexGrow: counts[stage] }}
                className={cn(
                  "h-full min-w-2 basis-0 rounded-full",
                  stageTones[stage].dot,
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ul
        aria-label="Open applications by stage"
        className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,6.5rem),1fr))] gap-x-4 gap-y-2.5 lg:grid-cols-7 lg:gap-x-2"
      >
        {pipelineStages.map((stage) => {
          const count = counts[stage];
          const dot = cn("size-2 shrink-0 rounded-full", stageTones[stage].dot);
          return (
            // Phones: dot, name, and count on one line. Wide screens: the
            // count over its name, one column per stage.
            <li
              key={stage}
              className={cn(
                "flex min-w-0 items-center gap-2 lg:grid lg:content-start lg:gap-1",
                count === 0 && "opacity-55",
              )}
            >
              <span aria-hidden="true" className={cn(dot, "lg:hidden")} />
              <span className="text-muted-foreground min-w-0 text-xs max-lg:truncate lg:order-2 lg:text-[0.6875rem] lg:leading-4">
                {stageLabels[stage]}
              </span>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums lg:order-1 lg:ml-0 lg:text-xl lg:tracking-[-0.03em]">
                <span aria-hidden="true" className={cn(dot, "max-lg:hidden")} />
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function closedSentence(counts: PipelineSummary["counts"]) {
  const parts = closedStages
    .filter((stage) => counts[stage] > 0)
    .map((stage) => `${counts[stage]} ${stageLabels[stage].toLowerCase()}`);
  return parts.length ? `Closed: ${parts.join(" · ")}` : null;
}

function UpNext({
  application,
  nowIso,
  unplanned,
}: {
  application: CareerApplication | null;
  nowIso: string;
  unplanned: number;
}) {
  if (!application) {
    return (
      <div className="bg-background/55 ring-border/80 rounded-2xl p-4 ring-1 sm:p-5">
        <p className={eyebrowClass}>Up next</p>
        <div className="mt-3 flex items-start gap-3">
          <span className="bg-primary/10 text-primary ring-primary/15 grid size-10 shrink-0 place-items-center rounded-xl ring-1">
            <CalendarCheck2 aria-hidden="true" className="size-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] leading-6 font-semibold">
              No follow-ups scheduled
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-5">
              {unplanned > 0
                ? `Give ${unplanned === 1 ? "your open application" : `your ${unplanned} open applications`} a next action and a date.`
                : "Add a role you want, and its next step will show here."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const due = dueChip(application, nowIso);
  const overdue = application.is_follow_up_overdue;
  return (
    <div
      className={cn(
        "@container relative rounded-2xl p-4 ring-1 sm:p-5",
        overdue
          ? "bg-destructive/[0.06] ring-destructive/25"
          : "bg-background/55 ring-border/80",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={eyebrowClass}>Up next</p>
        {due ? <DueChip due={due} /> : null}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <CompanyMark
          name={application.company_name}
          className="@max-[15rem]:hidden"
        />
        <div className="min-w-0">
          <p className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] break-words">
            {application.next_action}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {application.company_name} · {stageLabel(application.stage)}
          </p>
        </div>
      </div>
      <Link
        href={`/career?highlight=${application.id}#application-${application.id}`}
        className="text-primary hover:bg-primary/10 focus-visible:ring-ring mt-3 -mb-1.5 -ml-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9"
      >
        Open in list
        <span className="sr-only">: {application.company_name}</span>
        <ArrowRight aria-hidden="true" className="size-3" />
      </Link>
    </div>
  );
}

function Conversions({ conversions }: { conversions: Conversion[] }) {
  return (
    <div>
      <p className={eyebrowClass}>How far applications get</p>
      <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-3 @max-[15rem]:grid-cols-1">
        {conversions.map((conversion) => {
          const percent =
            conversion.rate == null ? null : Math.round(conversion.rate * 100);
          return (
            // Phones show plain figures; tiles from `sm`, where there is room.
            <div
              key={conversion.key}
              className="sm:bg-background/55 sm:ring-border/80 min-w-0 sm:rounded-2xl sm:p-4 sm:ring-1"
            >
              <dt className="text-muted-foreground text-xs leading-4 font-medium">
                {conversion.label}
              </dt>
              <dd className="mt-1.5 font-mono text-xl leading-tight font-semibold tracking-[-0.03em] sm:text-2xl">
                {percent == null ? "—" : `${percent}%`}
              </dd>
              <dd
                aria-hidden="true"
                className="bg-muted mt-2 h-1 overflow-hidden rounded-full"
              >
                {percent ? (
                  <span
                    style={{ width: `${percent}%` }}
                    className={cn(
                      "bg-primary block h-full rounded-full",
                      todayStyles.fill,
                    )}
                  />
                ) : null}
              </dd>
              <dd className="text-muted-foreground mt-1.5 text-[0.6875rem] leading-4">
                {conversion.total
                  ? `${conversion.reached} of ${conversion.total} ${conversion.base}`
                  : `None ${conversion.base} yet`}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** The Career page lead: what is open, where it stands, and what is next. */
export function CareerHero({
  summary,
  conversions,
  next,
  nowIso,
}: {
  summary: PipelineSummary;
  conversions: Conversion[];
  next: CareerApplication | null;
  nowIso: string;
}) {
  const status = pipelineStatus(summary);
  const momentum = momentumParts(summary);
  const closed = closedSentence(summary.counts);

  return (
    <HeroShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="pipeline-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          Pipeline
        </h2>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {/* Phones read top to bottom: the count, what is next, then the
          detail. Wide screens pair the count with what is next, and the
          stages with how far applications get. */}
      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-9">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
              {summary.active}
            </span>
            <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
              {summary.active === 1
                ? "active application"
                : "active applications"}
            </span>
          </p>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            {summary.active === 0 ? (
              "Every application is closed. Add a role to start the next search."
            ) : (
              <span className="text-foreground font-semibold">
                {joinWords(momentum)}.
              </span>
            )}
          </p>
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <UpNext
            application={next}
            nowIso={nowIso}
            unplanned={summary.unplanned}
          />
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <PipelineTrack counts={summary.counts} />
          {closed ? (
            <p className="text-muted-foreground border-border/70 mt-5 border-t pt-4 text-xs">
              {closed}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <Conversions conversions={conversions} />
        </div>
      </div>
    </HeroShell>
  );
}

/** The hero before anything is tracked: the stages ahead and how to start. */
export function CareerEmptyHero() {
  return (
    <HeroShell>
      <h2
        id="pipeline-heading"
        className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
      >
        Pipeline
      </h2>
      <div className="mt-6 flex max-w-2xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-sm:hidden">
          <BriefcaseBusiness aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
            Build your opportunity pipeline
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Add a role before you apply. ATLAS keeps each one tied to a stage, a
            date, and one clear next action, so nothing goes quiet.
          </p>
          <div className="mt-6">
            <ApplicationCreateDialog />
          </div>
        </div>
      </div>
      <ol
        aria-label="Stages an application moves through"
        className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,7rem),1fr))] gap-3 lg:grid-cols-7"
      >
        {pipelineStages.map((stage, index) => (
          <li
            key={stage}
            className="bg-background/55 ring-border/70 flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 ring-1"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                stageTones[stage].dot,
              )}
            />
            <span className="truncate text-xs font-medium">
              <span className="text-muted-foreground mr-1 font-mono">
                {index + 1}
              </span>
              {stageLabels[stage]}
            </span>
          </li>
        ))}
      </ol>
    </HeroShell>
  );
}
