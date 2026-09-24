"use client";

import { useState } from "react";
import type { MetricGrain } from "@/lib/history/metrics";

export function HistoryFilters({
  initialGrain,
  initialMonths,
}: {
  initialGrain: MetricGrain;
  initialMonths: 1 | 3 | 6 | 12;
}) {
  const [grain, setGrain] = useState(initialGrain);
  const [months, setMonths] = useState(
    initialGrain === "day" ? 1 : initialMonths,
  );
  return (
    <form
      method="get"
      className="border-border bg-card mt-6 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
    >
      <label className="grid min-w-36 flex-1 gap-1 text-sm font-medium">
        Group by
        <select
          name="grain"
          value={grain}
          onChange={(event) => {
            const next = event.target.value as MetricGrain;
            setGrain(next);
            if (next === "day") setMonths(1);
          }}
          className="border-input bg-background min-h-11 rounded-lg border px-3"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </label>
      <label className="grid min-w-36 flex-1 gap-1 text-sm font-medium">
        Lookback
        <select
          name="months"
          value={months}
          onChange={(event) =>
            setMonths(Number(event.target.value) as 1 | 3 | 6 | 12)
          }
          className="border-input bg-background min-h-11 rounded-lg border px-3"
        >
          {grain === "day" ? (
            <option value="1">30 days</option>
          ) : (
            <>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </>
          )}
        </select>
      </label>
      <button
        type="submit"
        className="bg-primary text-primary-foreground min-h-11 rounded-lg px-5 text-sm font-semibold"
      >
        Update view
      </button>
    </form>
  );
}
