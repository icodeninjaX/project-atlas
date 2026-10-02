import styles from "@/components/history/history.module.css";
import { metricTones } from "@/components/history/metric-tone";
import type { AssociationResult } from "@/lib/history/associations";
import { metricDefinitions, type MetricKey } from "@/lib/history/metrics";
import {
  pairMatrix,
  withheldReasons,
  type WithheldReason,
} from "@/lib/history/pattern-view";
import { metricKeys } from "@/lib/history/view";
import { cn } from "@/lib/utils";

export type PairMark = "together" | "opposite" | WithheldReason;

/** Where a finding's card lives on the page. */
export function findingAnchor([first, second]: [MetricKey, MetricKey]) {
  return `finding-${first}-${second}`;
}

export function markOf(result: AssociationResult): PairMark {
  return result.status === "found" ? result.direction : result.reason;
}

export const markWords: Record<PairMark, string> = {
  together: "Move together",
  opposite: "Move in opposite directions",
  ...Object.fromEntries(
    Object.entries(withheldReasons).map(([reason, { label }]) => [
      reason,
      label,
    ]),
  ),
} as Record<PairMark, string>;

/**
 * A pair's outcome as a small glyph: rising parallel lines when the series
 * move together, crossing lines when they move apart, and quiet marks for
 * each reason a pair was withheld.
 */
export function PairGlyph({
  mark,
  className,
}: {
  mark: PairMark;
  className?: string;
}) {
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0", className)}
    >
      {mark === "together" ? (
        <>
          <path d="M2.5 10.5 7 6.5l2.5 2 4-4.5" {...stroke} />
          <path d="M2.5 14 7 10l2.5 2 4-4.5" {...stroke} opacity={0.55} />
        </>
      ) : mark === "opposite" ? (
        <>
          <path d="M2.5 12 13.5 4" {...stroke} />
          <path d="M2.5 4 13.5 12" {...stroke} opacity={0.55} />
        </>
      ) : mark === "too_few_records" ? (
        <>
          <circle cx="5" cy="8" r="1.1" fill="currentColor" />
          <circle cx="11" cy="8" r="1.1" fill="currentColor" />
        </>
      ) : mark === "no_variation" ? (
        <path d="M3.5 8h9" {...stroke} />
      ) : mark === "weak_or_uncertain" ? (
        <path
          d="M2.5 9c1.5-2.5 2.75-2.5 4 0s2.75 2.5 4 0 2-2 3-1"
          {...stroke}
        />
      ) : null}
    </svg>
  );
}

/** How a pair's cell looks for each outcome. */
export const markCell: Record<PairMark, string> = {
  together: "bg-positive/14 text-positive ring-1 ring-positive/35",
  opposite:
    "bg-violet-500/14 text-violet-700 ring-1 ring-violet-500/35 dark:text-violet-300",
  incomplete_history:
    "text-muted-foreground outline-1 -outline-offset-1 outline-border outline-dashed",
  too_few_records: "bg-muted/80 text-muted-foreground",
  no_variation: "bg-muted/80 text-muted-foreground",
  weak_or_uncertain: "bg-muted/80 text-muted-foreground",
};

/** Every pair ATLAS tested, as the lower half of a grid of the series. */
export function PatternMatrix({ results }: { results: AssociationResult[] }) {
  const rows = pairMatrix(results);
  const columns = metricKeys.slice(0, -1);
  return (
    // Keeps a usable size and scrolls sideways when text is very large.
    <div
      tabIndex={0}
      role="region"
      aria-label="Every pair tested"
      className="focus-visible:ring-ring min-w-0 overflow-x-auto rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <table className="w-full min-w-[13rem] table-fixed border-separate border-spacing-1 sm:border-spacing-1.5">
        <caption className="sr-only">
          Every pair of series ATLAS tested, and what it found
        </caption>
        <colgroup>
          <col className="w-[5.25rem] sm:w-28" />
          {columns.map((metric) => (
            <col key={metric} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <td />
            {columns.map((metric) => {
              const tone = metricTones[metric];
              const Icon = tone.icon;
              return (
                <th
                  key={metric}
                  scope="col"
                  title={metricDefinitions[metric].label}
                  className="pb-1 align-bottom"
                >
                  <span className="sr-only">
                    {metricDefinitions[metric].label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mx-auto grid aspect-square w-full max-w-7 place-items-center rounded-lg ring-1",
                      tone.soft,
                      tone.text,
                      tone.ring,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const tone = metricTones[row.metric];
            return (
              <tr key={row.metric}>
                <th
                  scope="row"
                  className="pr-1 text-left text-[0.6875rem] leading-4 font-medium sm:text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
                    />
                    <span className="min-w-0 break-words">{tone.short}</span>
                  </span>
                </th>
                {columns.map((column, columnIndex) => {
                  const cell = row.cells[columnIndex];
                  if (!cell?.result) return <td key={column} />;
                  const mark = markOf(cell.result);
                  const name = `${metricDefinitions[column].label} and ${metricDefinitions[row.metric].label}: ${markWords[mark]}`;
                  const face = (
                    <span
                      style={{
                        animationDelay: `${(rowIndex + columnIndex) * 40}ms`,
                      }}
                      className={cn(
                        "grid aspect-square w-full max-w-11 place-items-center rounded-[0.625rem]",
                        markCell[mark],
                        styles.appear,
                      )}
                    >
                      <PairGlyph mark={mark} />
                    </span>
                  );
                  return (
                    <td key={column} className="p-0 align-middle">
                      {cell.result.status === "found" ? (
                        <a
                          href={`#${findingAnchor(cell.result.metrics)}`}
                          title={name}
                          className="focus-visible:ring-ring mx-auto block max-w-11 rounded-[0.625rem] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {face}
                          <span className="sr-only">{name}</span>
                        </a>
                      ) : (
                        <span title={name} className="mx-auto block max-w-11">
                          {face}
                          <span className="sr-only">{name}</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
