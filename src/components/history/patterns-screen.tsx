import {
  Check,
  CloudOff,
  History,
  LogIn,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { DashboardCardHeading } from "@/components/dashboard/dashboard-card";
import { FindingCard } from "@/components/history/finding-card";
import {
  HeroShell,
  HistoryHeader,
  HistoryMessage,
  SectionHeading,
  StatusPill,
  eyebrowClass,
  glassCardClass,
} from "@/components/history/history-chrome";
import {
  PairGlyph,
  PatternMatrix,
  markCell,
  markWords,
} from "@/components/history/pattern-matrix";
import {
  ASSOCIATION_MONTHS,
  ASSOCIATION_TESTS,
  type AssociationResult,
} from "@/lib/history/associations";
import type { HistoricalMetric } from "@/lib/history/metrics";
import { formatPeriodLabel } from "@/lib/history/period-label";
import {
  summarizeScan,
  withheldOrder,
  withheldReasons,
  type ScanSummary,
} from "@/lib/history/pattern-view";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/shared/page-shell";

const RULES = [
  "Both series have all eleven completed Asia/Manila months fully recorded.",
  "Each series has at least twelve contributing records and activity in six months.",
  "Month-to-month changes correlate at 0.75 or more, either way, and still at 0.55 with any one month left out.",
  `A 20,000-draw permutation test, adjusted for all ${ASSOCIATION_TESTS} supported metric pairs, reaches an estimated adjusted p of at most 0.01.`,
];

/** The scan: how many pairs qualified, why the rest were held back. */
function ScanHero({
  scan,
  results,
  window,
}: {
  scan: ScanSummary;
  results: AssociationResult[];
  window: { from: string; through: string };
}) {
  const found = scan.findings.length;
  return (
    <HeroShell labelledBy="patterns-scan-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="patterns-scan-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          The scan
        </h2>
        <StatusPill tone={found ? "positive" : "neutral"}>
          {found
            ? `${found} ${found === 1 ? "pattern" : "patterns"} found`
            : "Nothing qualified"}
        </StatusPill>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12">
        <div className="min-w-0">
          {found ? (
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.75rem,19vw,6rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
                {found}
              </span>
              <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
                of {scan.total} pairs move in step
              </span>
            </p>
          ) : (
            <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
              No reliable pattern to show yet
            </p>
          )}
          <p className="mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            <span className="text-foreground font-semibold">
              {formatPeriodLabel(window.from, window.through)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {ASSOCIATION_MONTHS} completed months, Asia/Manila
            </span>
          </p>
          <p className="text-muted-foreground mt-1.5 max-w-xl text-xs leading-5">
            {found
              ? "These pairs passed every coverage, activity, and statistical check. Findings describe associations, never causes."
              : "The recorded months do not meet all coverage, activity and statistical checks. ATLAS withholds weak or uncertain associations."}
          </p>

          <div className="border-border/70 mt-6 border-t pt-5">
            <h3 className={eyebrowClass}>Held back</h3>
            <dl className="mt-3 grid gap-2.5">
              {withheldOrder.map((reason) => {
                const count = scan.withheld[reason];
                return (
                  <div
                    key={reason}
                    className={cn(
                      "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-x-3 @max-[26rem]:grid-cols-[minmax(0,1fr)_auto]",
                      count === 0 && "opacity-60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-px grid size-7 place-items-center rounded-lg @max-[26rem]:hidden",
                        markCell[reason],
                      )}
                    >
                      <PairGlyph mark={reason} className="size-3.5" />
                    </span>
                    <dt className="min-w-0">
                      <span className="block text-sm leading-5 font-semibold">
                        {withheldReasons[reason].label}
                      </span>
                      <span className="text-muted-foreground block text-xs leading-5">
                        {withheldReasons[reason].description}
                      </span>
                    </dt>
                    <dd className="font-mono text-sm leading-5 font-semibold tabular-nums">
                      {count}
                      <span className="sr-only">
                        {count === 1 ? " pair" : " pairs"}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        <div className="min-w-0">
          <div className="bg-background/55 ring-border/80 rounded-2xl p-2 ring-1 min-[360px]:p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1">
              <h3 className={eyebrowClass}>Every pair tested</h3>
              <ul
                aria-label="Legend"
                className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem]"
              >
                {(["together", "opposite"] as const).map((mark) => (
                  <li key={mark} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-4 place-items-center rounded",
                        markCell[mark],
                      )}
                    >
                      <PairGlyph mark={mark} className="size-3" />
                    </span>
                    {markWords[mark]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3">
              <PatternMatrix results={results} />
            </div>
          </div>
        </div>
      </div>
    </HeroShell>
  );
}

/** The checks a pair must pass, and what a finding can and cannot say. */
function PatternsMethod({ version }: { version: string }) {
  return (
    <section
      aria-labelledby="patterns-method"
      data-spotlight
      className={cn(
        glassCardClass,
        "mt-10 p-4 min-[360px]:p-5 sm:mt-12 sm:p-6",
      )}
    >
      <DashboardCardHeading
        id="patterns-method"
        icon={ShieldCheck}
        title="How the scan decides"
        description={`Each of the ${ASSOCIATION_TESTS} pairs must pass every check. The test compares changes, not levels, and checks each month for outlier influence.`}
      />
      <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {RULES.map((rule) => (
          <li
            key={rule}
            className="text-muted-foreground flex gap-2.5 text-xs leading-5"
          >
            <span
              aria-hidden="true"
              className="bg-positive/12 text-positive mt-0.5 grid size-4 shrink-0 place-items-center rounded-full"
            >
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            {rule}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-5 border-t pt-4 text-xs leading-5">
        These calculations use surviving records as they exist now. Deleted,
        edited or unrecorded activity may change a result. Shared trends,
        seasonality and other factors can still explain a finding. A lack of a
        finding does not prove no relationship. Method version {version}.
      </p>
    </section>
  );
}

/** The Patterns page body, from rows and results the page has computed. */
export function PatternsScreen({
  rows,
  results,
  unavailable,
  window,
  version,
}: {
  /** Null when no one is signed in. */
  rows: HistoricalMetric[] | null;
  results: AssociationResult[];
  unavailable: boolean;
  window: { from: string; through: string };
  version: string;
}) {
  const scan = summarizeScan(results);
  return (
    <PageShell>
      <HistoryHeader
        eyebrow="Recorded history"
        eyebrowIcon={Waypoints}
        title="Patterns"
        description="Look for repeated monthly movement in your surviving records. Findings describe associations, not causes."
        link={{
          href: "/history",
          label: "View monthly history",
          icon: History,
        }}
      />

      {unavailable || rows === null ? (
        <HistoryMessage
          icon={unavailable ? CloudOff : LogIn}
          title={unavailable ? "Patterns could not be loaded" : "Signed out"}
        >
          {unavailable
            ? "Try again when recorded history is available."
            : "Sign in to see your recorded patterns."}
        </HistoryMessage>
      ) : (
        <>
          <ScanHero scan={scan} results={results} window={window} />
          {scan.findings.length ? (
            <section
              aria-labelledby="patterns-findings-heading"
              className="mt-10 sm:mt-12"
            >
              <SectionHeading
                id="patterns-findings-heading"
                title="Findings"
                note={`${scan.findings.length} of ${scan.total} pairs`}
              />
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {scan.findings.map((finding) => (
                  <FindingCard
                    key={finding.metrics.join(".")}
                    finding={finding}
                    rows={rows}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <PatternsMethod version={version} />
        </>
      )}
    </PageShell>
  );
}
