import { History } from "lucide-react";
import Link from "next/link";
import todayStyles from "@/components/dashboard/today.module.css";
import {
  CoverageSwatch,
  HeroShell,
  StatusPill,
  eyebrowClass,
  tileClass,
} from "@/components/history/history-chrome";
import styles from "@/components/history/history.module.css";
import { metricTones } from "@/components/history/metric-tone";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { metricDefinitions, type MetricGrain } from "@/lib/history/metrics";
import { formatPeriodLabel } from "@/lib/history/period-label";
import {
  countGrain,
  formatMetricValue,
  grainWord,
  metricKeys,
  type HistoryOverview,
  type HistorySeries,
  type HistoryWindow,
} from "@/lib/history/view";
import { formatCentavos } from "@/lib/money/money";
import { cn } from "@/lib/utils";

function signed(centavos: number) {
  return `${centavos > 0 ? "+" : centavos < 0 ? "−" : ""}${formatCentavos(Math.abs(centavos))}`;
}

/** Income against expenses in view, with the net and debt paid beside. */
function MoneyInWindow({ money }: { money: HistoryOverview["money"] }) {
  const recorded = money.income !== null || money.expenses !== null;
  const largest = Math.max(money.income ?? 0, money.expenses ?? 0);
  const rows = [
    {
      key: "in",
      label: "In",
      sign: "+",
      centavos: money.income,
      count: money.incomeSources,
      bar: "bg-emerald-500",
      text: "text-positive",
    },
    {
      key: "out",
      label: "Out",
      sign: "−",
      centavos: money.expenses,
      count: money.expenseSources,
      bar: "bg-rose-500",
      text: "",
    },
  ];

  return (
    <div className={cn(tileClass, "sm:p-5")}>
      <p className={eyebrowClass}>Money recorded</p>
      {recorded ? (
        <>
          <dl className="mt-3 space-y-2 sm:space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-wrap items-baseline justify-between gap-x-3"
              >
                <dt className="text-muted-foreground text-xs font-medium">
                  {row.label}
                  <SensitiveValue className="text-muted-foreground/80 ml-1.5 font-mono text-[0.6875rem]">
                    {row.count}
                  </SensitiveValue>
                  <span className="sr-only">
                    {row.count === 1 ? " record" : " records"}
                  </span>
                </dt>
                <dd
                  className={cn(
                    "font-mono text-base font-semibold tracking-[-0.02em] tabular-nums sm:text-lg",
                    row.centavos === null ? "text-muted-foreground" : row.text,
                  )}
                >
                  {row.centavos === null ? (
                    <>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">No supported history</span>
                    </>
                  ) : (
                    <SensitiveValue>
                      {row.sign}
                      {formatCentavos(row.centavos)}
                    </SensitiveValue>
                  )}
                </dd>
                <dd
                  aria-hidden="true"
                  className="bg-muted mt-1.5 h-1 basis-full overflow-hidden rounded-full max-sm:hidden"
                >
                  {largest > 0 && row.centavos ? (
                    <span
                      style={{
                        width: `${Math.max(2, (row.centavos / largest) * 100)}%`,
                      }}
                      className={cn(
                        "block h-full rounded-full",
                        row.bar,
                        todayStyles.fill,
                      )}
                    />
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          <dl className="border-border/70 mt-3 space-y-1.5 border-t pt-3 sm:mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt className="text-muted-foreground text-xs font-medium">Net</dt>
              <dd
                className={cn(
                  "font-mono text-sm font-semibold tabular-nums",
                  money.net !== null && money.net > 0 && "text-positive",
                  money.net === null && "text-muted-foreground",
                )}
              >
                {money.net === null ? (
                  <span title="Needs both income and expenses in view">—</span>
                ) : (
                  <SensitiveValue>{signed(money.net)}</SensitiveValue>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt className="text-muted-foreground text-xs font-medium">
                Debt paid
              </dt>
              <dd className="font-mono text-sm font-semibold tabular-nums">
                {money.debtPayments === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <SensitiveValue>
                    {formatCentavos(money.debtPayments)}
                  </SensitiveValue>
                )}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          No income or expenses are recorded in this window.
        </p>
      )}
      <p className="text-muted-foreground mt-3 text-[0.6875rem] leading-4">
        Transfers between your accounts are left out.
      </p>
    </div>
  );
}

/**
 * Each series as a strip of its buckets: deeper where the value is higher,
 * striped where partial, outlined with no history. Each row jumps to its
 * card; the strip itself is decorative.
 */
function SeriesGlance({ series }: { series: HistorySeries[] }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h3 className={eyebrowClass}>Series at a glance</h3>
        <ul
          aria-label="Legend"
          className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem]"
        >
          <li className="flex items-center gap-1.5">
            <CoverageSwatch coverage="recorded" />
            Recorded
          </li>
          <li className="flex items-center gap-1.5">
            <CoverageSwatch coverage="partial" />
            Partial
          </li>
          <li className="flex items-center gap-1.5">
            <CoverageSwatch coverage="insufficient" />
            No history
          </li>
          <li className="max-sm:hidden">Deeper is higher</li>
        </ul>
      </div>
      <ul className="mt-3 grid gap-1">
        {series.map((item) => {
          const tone = metricTones[item.metric];
          return (
            <li key={item.metric}>
              <a
                href={`#series-${item.metric}`}
                className="hover:bg-background/60 focus-visible:ring-ring -mx-2 grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none @xl:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                  />
                  <span className="truncate text-xs font-medium">
                    <span aria-hidden="true">{tone.short}</span>
                    <span className="sr-only">
                      {metricDefinitions[item.metric].label}
                      {item.metric === "review_overall_score"
                        ? ", average"
                        : ", total"}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="col-span-2 row-start-2 flex h-4 min-w-0 gap-[3px] @xl:col-span-1 @xl:col-start-2 @xl:row-start-1"
                >
                  {item.points.map((point) => {
                    if (point.value === null)
                      return (
                        <span
                          key={point.from}
                          className="ring-border/80 min-w-0 flex-1 rounded-[4px] ring-1 ring-inset"
                        />
                      );
                    if (point.value === 0)
                      return (
                        <span
                          key={point.from}
                          className={cn(
                            "min-w-0 flex-1 rounded-[4px] bg-current opacity-[0.16]",
                            tone.bar,
                          )}
                        />
                      );
                    return (
                      <span
                        key={point.from}
                        style={{
                          opacity: 0.32 + 0.68 * (point.value / item.scaleMax),
                        }}
                        className={cn(
                          "min-w-0 flex-1 rounded-[4px]",
                          tone.bar,
                          point.coverage === "partial"
                            ? styles.partial
                            : "bg-current",
                          styles.appear,
                        )}
                      />
                    );
                  })}
                </span>
                <span className="text-right font-mono text-xs font-semibold tabular-nums @xl:col-start-3 @xl:row-start-1">
                  {item.headline === null ? (
                    <span className="text-muted-foreground">
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">No supported history</span>
                    </span>
                  ) : (
                    <SensitiveValue>
                      {formatMetricValue(item.metric, item.headline)}
                    </SensitiveValue>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The History lead: what is in view, how much, and how money moved. */
export function HistoryHero({
  overview,
  series,
  window,
  grain,
  updatedAt,
  version,
}: {
  overview: HistoryOverview;
  series: HistorySeries[];
  window: HistoryWindow;
  grain: MetricGrain;
  /** When the values were recalculated, in Manila words. */
  updatedAt: string;
  version: string;
}) {
  const buckets = series[0]?.points.length ?? 0;
  return (
    <HeroShell labelledBy="history-window-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="history-window-heading"
          className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
        >
          In this window
        </h2>
        <StatusPill tone={overview.status.tone}>
          {overview.status.label}
        </StatusPill>
      </div>

      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-12">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <SensitiveValue className="from-foreground via-foreground to-foreground/55 bg-gradient-to-br bg-clip-text pb-[0.06em] font-mono text-[clamp(3.25rem,16vw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-transparent">
              {overview.records.toLocaleString("en-PH")}
            </SensitiveValue>
            <span className="text-muted-foreground text-xl font-medium tracking-[-0.02em] sm:text-2xl">
              {overview.records === 1 ? "record" : "records"}
            </span>
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 sm:text-[0.9375rem]">
            <span className="text-foreground font-semibold">
              {formatPeriodLabel(window.from, window.through)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {countGrain(buckets, grain)}, by {grainWord(grain)}
            </span>
          </p>
          <p className="text-muted-foreground mt-1.5 max-w-xl text-xs leading-5">
            Rebuilt from your surviving source records · updated {updatedAt} ·
            Asia/Manila · metric version {version}
          </p>
        </div>

        <div className="min-w-0">
          <MoneyInWindow money={overview.money} />
        </div>
      </div>

      <div className="border-border/70 mt-7 border-t pt-6">
        <SeriesGlance series={series} />
      </div>
    </HeroShell>
  );
}

/** The hero before anything is recorded: what feeds each series. */
export function HistoryEmptyHero() {
  return (
    <HeroShell labelledBy="history-window-heading">
      <h2
        id="history-window-heading"
        className="text-primary text-xs font-semibold tracking-[0.12em] uppercase"
      >
        Your history
      </h2>
      <div className="mt-6 flex max-w-2xl gap-4">
        <span className="bg-primary/12 text-primary ring-primary/20 grid size-11 shrink-0 place-items-center rounded-2xl ring-1 max-sm:hidden">
          <History aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.875rem]">
            Nothing recorded yet
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Recorded history rebuilds six series from what you log in ATLAS.
            Each one begins on the date of its first record, and nothing before
            it is filled in with zero.
          </p>
        </div>
      </div>
      <ul
        aria-label="Where each series comes from"
        className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-3"
      >
        {metricKeys.map((metric) => {
          const tone = metricTones[metric];
          const Icon = tone.icon;
          return (
            <li key={metric} className="min-w-0">
              <Link
                href={metricDefinitions[metric].href}
                className="bg-background/55 ring-border/70 hover:bg-background/80 hover:ring-border focus-visible:ring-ring flex min-h-11 min-w-0 items-center gap-3 rounded-2xl p-3 ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl ring-1",
                    tone.soft,
                    tone.text,
                    tone.ring,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-5 font-semibold">
                    {metricDefinitions[metric].label}
                  </span>
                  <span className="text-muted-foreground block text-xs leading-4">
                    {tone.hint} in {tone.place}
                  </span>
                  <span className="text-muted-foreground/90 mt-0.5 block text-[0.6875rem] leading-4">
                    No source records yet
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </HeroShell>
  );
}
