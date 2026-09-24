import { z } from "zod";

export const questionTypes = [
  "spending_change",
  "debt_progress",
  "task_focus",
  "career_pipeline",
  "goal_progress",
  "weekly_review_trends",
  "signals_summary",
] as const;
export type QuestionType = (typeof questionTypes)[number];

// The Analyst deliberately accepts templates, not an open-ended intent guess.
export function classifyQuestion(question: string): QuestionType | null {
  const q = question
    .toLowerCase()
    .trim()
    .replace(/[?.!]+$/, "");
  if (
    /^(what changed in my spending this month|how has my spending changed this month)$/.test(
      q,
    )
  )
    return "spending_change";
  if (
    /^(am i making progress toward becoming debt-free|how are my debts progressing|what is my debt progress)$/.test(
      q,
    )
  )
    return "debt_progress";
  if (
    /^(what should i focus on this week|which tasks should i focus on this week)$/.test(
      q,
    )
  )
    return "task_focus";
  if (
    /^(which area of my career pipeline is weakest|how is my career application pipeline)$/.test(
      q,
    )
  )
    return "career_pipeline";
  if (/^(how are my goals progressing|which goals need attention)$/.test(q))
    return "goal_progress";
  if (
    /^(what patterns do you see in my last 12 weekly reviews|how have my weekly review scores changed)$/.test(
      q,
    )
  )
    return "weekly_review_trends";
  if (
    /^(what are my current signals|what should i know from my signals)$/.test(q)
  )
    return "signals_summary";
  return null;
}

export type Evidence = {
  id: string;
  metric: string;
  value: number | string;
  unit:
    | "centavos"
    | "count"
    | "percent"
    | "score"
    | "stage"
    | "severity"
    | "priority";
  period: { from: string; through: string };
  comparisonBasis: string;
  source: { description: string; recordIds: string[]; href: string };
  completeness: "complete" | "partial" | "insufficient";
  note?: string;
};
export type EvidencePackage = {
  type: QuestionType;
  status: "ready" | "partial" | "insufficient";
  note: string;
  evidence: Evidence[];
};

const responseSchema = z
  .object({
    explanation: z.string().min(1).max(1000),
    evidenceIds: z.array(z.string()).min(1).max(12),
    uncertainty: z.string().max(300),
  })
  .strict();

export function validateExplanation(raw: unknown, evidence: Evidence[]) {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return null;
  const ids = new Set(evidence.map((item) => item.id));
  if (parsed.data.evidenceIds.some((id) => !ids.has(id))) return null;
  // Numbers belong in the server-rendered evidence. Reject model numeric claims.
  if (
    /\d|₱|PHP|pesos|centavos|%/i.test(
      parsed.data.explanation + parsed.data.uncertainty,
    )
  )
    return null;
  const change = evidence.find((item) => item.id === "spending.change")?.value;
  if (typeof change === "number") {
    const claim = parsed.data.explanation.toLowerCase();
    if (/\b(because|caused by|due to|driven by|resulted from)\b/.test(claim))
      return null;
    if (change < 0 && /\b(increas\w*|ris\w*|rose|higher|more)\b/.test(claim))
      return null;
    if (change > 0 && /\b(decreas\w*|fell|lower|less)\b/.test(claim))
      return null;
    if (
      change === 0 &&
      /\b(increas\w*|ris\w*|rose|higher|decreas\w*|fell|lower)\b/.test(claim)
    )
      return null;
  }
  return parsed.data;
}

export function manilaToday(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
export function spendingPeriods(now: Date) {
  const today = manilaToday(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));
  const currentLast = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousLast = new Date(
    Date.UTC(previousYear, previousMonth, 0),
  ).getUTCDate();
  const elapsed = Math.min(day, previousLast);
  const cappedCurrent = day < currentLast && day > previousLast;
  const currentThroughDay = cappedCurrent ? previousLast : day;
  return {
    current: {
      from: iso(year, month, 1),
      through: iso(year, month, currentThroughDay),
    },
    previous: {
      from: iso(previousYear, previousMonth, 1),
      through: iso(previousYear, previousMonth, elapsed),
    },
    basis:
      currentThroughDay > previousLast
        ? `Current days 1–${currentThroughDay} versus previous days 1–${previousLast}`
        : `Days 1–${elapsed} of each month`,
    unequalDays: day > previousLast,
    cappedCurrent,
  };
}

export type SpendingRow = {
  id: string;
  category_id: string;
  amount_centavos: number;
  transaction_date: string;
};
export function spendingEvidence(
  rows: SpendingRow[],
  categories: Map<string, string>,
  now: Date,
  truncated = false,
): EvidencePackage {
  const periods = spendingPeriods(now);
  const current = rows.filter(
    (r) =>
      r.transaction_date >= periods.current.from &&
      r.transaction_date <= periods.current.through,
  );
  const previous = rows.filter(
    (r) =>
      r.transaction_date >= periods.previous.from &&
      r.transaction_date <= periods.previous.through,
  );
  const valid = rows.every(
    (r) => Number.isSafeInteger(r.amount_centavos) && r.amount_centavos > 0,
  );
  if (!valid) throw new Error("Invalid transaction amount");
  if (truncated)
    return {
      type: "spending_change",
      status: "partial",
      note: "The retrieval limit was reached. ATLAS cannot calculate a reliable spending comparison from this partial history.",
      evidence: [
        {
          id: "spending.records_inspected",
          metric: "Expense records inspected",
          value: rows.length,
          unit: "count",
          period: {
            from: periods.previous.from,
            through: periods.current.through,
          },
          comparisonBasis: periods.basis,
          source: {
            description: "Expense transactions",
            recordIds: rows.slice(0, 20).map((r) => r.id),
            href: "/money/transactions",
          },
          completeness: "partial",
        },
      ],
    };
  const total = (items: SpendingRow[]) =>
    items.reduce((sum, r) => {
      const next = sum + r.amount_centavos;
      if (!Number.isSafeInteger(next))
        throw new Error("Spending exceeds safe centavo range");
      return next;
    }, 0);
  const partial = periods.unequalDays;
  const completeness =
    previous.length === 0 ? "insufficient" : partial ? "partial" : "complete";
  const item = (
    id: string,
    metric: string,
    value: number,
    period: { from: string; through: string },
    records: SpendingRow[],
  ): Evidence => ({
    id,
    metric,
    value,
    unit: "centavos",
    period,
    comparisonBasis: periods.basis,
    source: {
      description: "Expense transactions",
      recordIds: records.slice(0, 20).map((r) => r.id),
      href: records[0]
        ? `/money/transactions?highlight=${records[0].id}`
        : "/money/transactions",
    },
    completeness,
  });
  const evidence = [
    item(
      "spending.current",
      "Recorded spending this month",
      total(current),
      periods.current,
      current,
    ),
    item(
      "spending.previous",
      "Recorded spending in comparison period",
      total(previous),
      periods.previous,
      previous,
    ),
    item(
      "spending.change",
      "Recorded spending change",
      total(current) - total(previous),
      periods.current,
      [...current, ...previous],
    ),
  ];
  if (total(previous) > 0)
    evidence.push({
      id: "spending.change_percent",
      metric: "Recorded spending change percentage",
      value:
        Math.round(
          ((total(current) - total(previous)) / total(previous)) * 1000,
        ) / 10,
      unit: "percent",
      period: periods.current,
      comparisonBasis: periods.basis,
      source: {
        description: "Expense transactions in both periods",
        recordIds: [...current, ...previous].slice(0, 20).map((r) => r.id),
        href: "/money/transactions",
      },
      completeness,
    });
  const categoryIds = new Set(
    [...current, ...previous].map((r) => r.category_id),
  );
  const changes = [...categoryIds]
    .map((id) => ({
      id,
      value:
        total(current.filter((r) => r.category_id === id)) -
        total(previous.filter((r) => r.category_id === id)),
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 5);
  for (const change of changes) {
    const matches = [...current, ...previous].filter(
      (r) => r.category_id === change.id,
    );
    evidence.push(
      item(
        `spending.category.${change.id}`,
        `Category: ${categories.get(change.id)?.slice(0, 80) ?? "Uncategorized"} change`,
        change.value,
        periods.current,
        matches,
      ),
    );
  }
  return {
    type: "spending_change",
    status: completeness === "complete" ? "ready" : completeness,
    note:
      previous.length === 0
        ? "No expense records in the previous comparison period. A change cannot be established."
        : periods.cappedCurrent
          ? "Later current-month days are excluded to keep the comparison periods equal."
          : periods.unequalDays
            ? "Month lengths differ, so the full-month comparison has unequal days."
            : "Recorded expenses only; changes do not establish a cause. Transfers and income are excluded.",
    evidence,
  };
}
