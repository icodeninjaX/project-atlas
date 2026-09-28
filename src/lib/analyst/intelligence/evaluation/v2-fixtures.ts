import { spendingEvidence } from "@/lib/analyst/evidence";
import type { ToolEvidence } from "@/lib/analyst/tools/contracts";
import type { AnalysisBrief, EvidenceV2, Period } from "../contracts";
import { adaptLegacyCall } from "../legacy-evidence";
import { semanticsFor } from "../semantics";
import { transactionsIn, sumCentavos } from "./expected";
import {
  BULK_PAGE_ROWS,
  FIXTURE_CLOCK,
  OWNER_A,
  PERIODS,
  ownerDataset,
  type FixtureDataset,
} from "./fixtures";

/**
 * EvidenceV2 built from the synthetic fixtures. Whole-domain spending comes
 * through the legacy tool and the legacy adapter; the complete category
 * breakdown is what an AI-02 breakdown tool must return (every member,
 * including uncategorized, with a complete set), and the sampled breakdown is
 * one retrieval page, marked incomplete.
 */

export const V2_NOW = new Date(FIXTURE_CLOCK);
const retrievedAt = FIXTURE_CLOCK;

/** Owner A's whole-domain spending evidence via the unchanged legacy tool. */
export function legacySpendingV2(
  data: FixtureDataset = ownerDataset("rich", OWNER_A),
) {
  const rows = data.transactions
    .filter((row) => row.kind === "expense")
    .map((row) => ({
      id: row.id,
      category_id: row.categoryId ?? "uncategorized",
      amount_centavos: row.amountCentavos,
      transaction_date: row.date,
    }));
  const result = spendingEvidence(rows, new Map(), V2_NOW);
  const evidence: ToolEvidence[] = result.evidence.map((item) => ({
    ...item,
    id: `getSpendingChange.${item.id}.${"0".repeat(16)}`,
    claimType: "FACT",
    provenance: {
      tool: "getSpendingChange",
      calculationVersion: "1",
      retrievedAt,
      textTrust: "untrusted_data",
    },
  }));
  return adaptLegacyCall({ tool: "getSpendingChange", input: {}, evidence });
}

const legacyId = (local: string) =>
  `getSpendingChange.${local}.${"0".repeat(16)}`;
export const SPENDING_IDS = {
  current: legacyId("spending.current"),
  previous: legacyId("spending.previous"),
  change: legacyId("spending.change"),
};

type MetricInput = {
  id: string;
  metricKey: string;
  value: number;
  period: Period;
  scope: EvidenceV2["scope"];
  query?: EvidenceV2["coverage"]["query"];
};

export function metricEvidence(input: MetricInput): EvidenceV2 {
  const unitByKey: Record<string, "centavos" | "count"> = {
    expense_centavos: "centavos",
    income_centavos: "centavos",
    task_completions: "count",
    knowledge_reviews: "count",
  };
  const unit = unitByKey[input.metricKey] ?? "count";
  const semantics = semanticsFor(input.metricKey, unit);
  return {
    version: "2",
    kind: "metric",
    id: input.id,
    sourceType: "fixture",
    domain: input.metricKey.endsWith("_centavos")
      ? "money"
      : input.metricKey === "task_completions"
        ? "tasks"
        : "knowledge",
    calculationVersion: "1",
    semantics: {
      metricKey: semantics.key,
      definition: semantics.definition.slice(0, 400),
      aggregation: semantics.aggregation,
      comparableGroup: semantics.comparableGroup,
      ...(unit === "centavos" && { currency: "PHP" as const }),
    },
    scope: input.scope,
    time: {
      period: input.period,
      timeZone: "Asia/Manila",
      basis: "event_date",
      retrievedAt,
      asOf: null,
    },
    coverage: {
      query: input.query ?? "complete",
      recording: "unknown",
      period: "complete",
      relationship: "not_applicable",
      recordsConsidered: null,
      truncated: input.query === "partial",
      missingPeriods: [],
    },
    provenance: {
      tool: "fixture",
      sourceRefs: [
        { handle: `record:${input.id}`, href: "/money/transactions" },
      ],
      inputs: [],
      legacyId: null,
    },
    sharing: {
      route: "aggregate",
      allowedFields: ["metric", "value", "unit", "period"],
    },
    limitations: [],
    value: input.value,
    unit,
  };
}

const wholeExpense: EvidenceV2["scope"] = {
  id: "whole_domain:expense",
  type: "whole_domain",
  description: "All of the owner's recorded expense",
};

function byCategory(
  data: FixtureDataset,
  period: Period,
  rows = transactionsIn(data, "expense", period),
) {
  const totals = new Map<string, number>();
  for (const category of data.categories.filter(
    (item) => item.kind === "expense",
  ))
    totals.set(category.id, 0);
  totals.set("uncategorized", 0);
  for (const row of rows) {
    const key = row.categoryId ?? "uncategorized";
    totals.set(key, sumCentavos([totals.get(key) ?? 0, row.amountCentavos]));
  }
  return totals;
}

/** Every expense category in a period, as one complete set. */
export function categoryBreakdown(
  label: string,
  period: Period,
  data = ownerDataset("rich", OWNER_A),
) {
  const totals = byCategory(data, period);
  return [...totals].map(([member, value]) =>
    metricEvidence({
      id: `breakdown.${label}.${member}`,
      metricKey: "expense_centavos",
      value,
      period,
      scope: {
        id: "cohort:expense_by_category",
        type: "cohort",
        description: "Recorded expenses by category",
        cohort: {
          setId: "expense_by_category",
          member,
          setSize: totals.size,
          setComplete: true,
        },
      },
    }),
  );
}

/** One retrieval page of the large month: an incomplete set. */
export function sampledBreakdown() {
  const data = ownerDataset("bulk", OWNER_A);
  const period = PERIODS.currentMonthToDate;
  const page = [...transactionsIn(data, "expense", period)]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(0, BULK_PAGE_ROWS);
  const totals = byCategory(data, period, page);
  return [...totals].map(([member, value]) =>
    metricEvidence({
      id: `sample.${member}`,
      metricKey: "expense_centavos",
      value,
      period,
      query: "partial",
      scope: {
        id: "cohort:expense_by_category",
        type: "cohort",
        description: "Recorded expenses by category (first page only)",
        cohort: {
          setId: "expense_by_category",
          member,
          setSize: totals.size,
          setComplete: false,
        },
      },
    }),
  );
}

export function wholeExpenseTotal(
  id: string,
  period: Period,
  data = ownerDataset("rich", OWNER_A),
) {
  return metricEvidence({
    id,
    metricKey: "expense_centavos",
    value: sumCentavos(
      transactionsIn(data, "expense", period).map((row) => row.amountCentavos),
    ),
    period,
    scope: wholeExpense,
  });
}

export function brief(
  requirements: Array<[string, boolean]>,
  extra: Partial<AnalysisBrief> = {},
): AnalysisBrief {
  return {
    version: "1",
    intent: "explain_change",
    language: "en",
    responseStyle: "standard",
    question: "Synthetic question",
    resolvedEntities: [],
    periods: [
      {
        id: "current",
        ...PERIODS.currentMonthToDate,
        timeZone: "Asia/Manila",
        basis: "disclosed_default",
      },
      {
        id: "previous",
        ...PERIODS.previousAligned,
        timeZone: "Asia/Manila",
        basis: "disclosed_default",
      },
    ],
    requirements: requirements.map(([id, essential]) => ({
      id,
      question: `Requirement ${id}`,
      essential,
      evidenceNeeded: [],
    })),
    assumptions: [],
    unresolvedReferences: [],
    ...extra,
  };
}
