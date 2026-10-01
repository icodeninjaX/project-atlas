import {
  AlarmClock,
  Clock3,
  Hourglass,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { formatTaskTime } from "@/lib/tasks/task-time";
import {
  formatTaskMinutes,
  type TodayPlanSummary,
} from "@/lib/tasks/task-view";
import { cn } from "@/lib/utils";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ done, total }: { done: number; total: number }) {
  const ratio = total === 0 ? 0 : done / total;
  const percent = Math.round(ratio * 100);
  const finished = total > 0 && done === total;

  return (
    <div
      role="progressbar"
      aria-label="Today’s tasks finished"
      aria-valuemin={0}
      aria-valuemax={Math.max(total, 1)}
      aria-valuenow={done}
      aria-valuetext={
        total === 0 ? "Nothing scheduled" : `${done} of ${total} finished`
      }
      className="relative grid size-[4.75rem] shrink-0 place-items-center sm:size-28"
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="9"
          className="stroke-primary/12"
        />
        {done > 0 ? (
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - ratio)}
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
              finished
                ? "stroke-green-600 dark:stroke-green-500"
                : "stroke-primary",
            )}
          />
        ) : null}
      </svg>
      {/* An empty day is open, not 0% done. */}
      {total === 0 ? (
        <Sun className="text-primary size-6 sm:size-8" aria-hidden="true" />
      ) : (
        <p className="font-mono text-base leading-none font-semibold tracking-[-0.03em] sm:text-2xl">
          {percent}
          <span className="text-muted-foreground text-[0.6875rem] font-medium sm:text-sm">
            %
          </span>
        </p>
      )}
    </div>
  );
}

function PlanStat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "attention";
}) {
  return (
    // Phones show plain stats; a box inside the card would only add noise.
    <div className="border-border bg-background/60 min-w-0 rounded-2xl border p-3.5 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:p-0 sm:p-4">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium sm:gap-2">
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full max-[359px]:hidden sm:size-6",
            tone === "attention"
              ? "bg-destructive/12 text-destructive"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-3 sm:size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          "mt-2 font-mono text-base leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] sm:mt-2.5 sm:text-xl",
          tone === "attention" && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** The Tasks page lead: how today is going and what comes next. */
export function TaskOverview({
  summary,
  overdueCount,
}: {
  summary: TodayPlanSummary;
  overdueCount: number;
}) {
  const { total, done, remaining, minutesLeft, nextTime } = summary;
  const headline =
    total === 0
      ? "Open day"
      : remaining === 0
        ? "All done"
        : `${remaining} left`;
  const detail =
    total === 0
      ? "Nothing is scheduled for today yet."
      : remaining === 0
        ? `You finished ${total === 1 ? "today’s task" : `all ${total} of today’s tasks`}.`
        : `${done} of ${total} done today`;

  return (
    <section
      aria-labelledby="today-plan-title"
      className="border-border bg-card relative mt-6 overflow-hidden rounded-[1.75rem] border shadow-[0_24px_70px_rgb(7_10_15/0.1)] sm:mt-7"
    >
      <div
        aria-hidden="true"
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute -top-24 -right-16 size-56 rounded-full blur-3xl"
      />
      <div className="relative grid gap-5 p-5 sm:gap-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-10">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <ProgressRing done={done} total={total} />
          <div className="min-w-0">
            <h2
              id="today-plan-title"
              className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
            >
              Today’s plan
            </h2>
            <p className="mt-2 text-[clamp(1.75rem,8vw,2.75rem)] leading-none font-semibold tracking-[-0.045em] sm:mt-2.5">
              {headline}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">{detail}</p>
          </div>
        </div>
        <dl className="max-sm:border-border grid grid-cols-[repeat(auto-fit,minmax(min(100%,4.5rem),1fr))] gap-3 max-sm:gap-x-3 max-sm:gap-y-4 max-sm:border-t max-sm:pt-4 sm:grid-cols-3">
          <PlanStat
            icon={Hourglass}
            label="Time left"
            value={
              minutesLeft > 0
                ? formatTaskMinutes(minutesLeft, { compact: true })
                : "—"
            }
          />
          <PlanStat
            icon={Clock3}
            label="Next up"
            value={nextTime ? formatTaskTime(nextTime) : "—"}
          />
          <PlanStat
            icon={AlarmClock}
            label="Overdue"
            value={String(overdueCount)}
            tone={overdueCount > 0 ? "attention" : "default"}
          />
        </dl>
      </div>
    </section>
  );
}
