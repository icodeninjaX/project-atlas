"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ReviewTrend({
  data,
}: {
  data: Array<{
    week: string;
    energy: number | null;
    stress: number | null;
    overall: number | null;
  }>;
}) {
  return (
    <div>
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Weekly energy, stress, and overall score trends from one to ten"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              domain={[1, 10]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="energy"
              stroke="#3977f6"
              strokeWidth={2}
              connectNulls
              name="Energy"
            />
            <Line
              type="monotone"
              dataKey="stress"
              stroke="#e04f5f"
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls
              name="Stress"
            />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#8d99aa"
              strokeWidth={2}
              connectNulls
              name="Overall"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Solid blue: energy · dashed red: stress · gray: overall. Scores range
        from 1 to 10.
      </p>
    </div>
  );
}
