import {
  evidenceV2Schema,
  type ConsentDomain,
  type EvidenceCoverage,
  type EvidenceScope,
  type EvidenceUnit,
  type EvidenceV2,
  type Period,
} from "../contracts";
import type { FieldProfile } from "../policy";
import { semanticsFor } from "../semantics";
import type { V2ToolName } from "./contracts";

/** Shared EvidenceV2 construction for the V2 tools; every item is validated. */

export type BuildContext = { tool: V2ToolName; retrievedAt: string };

type Common = {
  local: string;
  domain: ConsentDomain;
  metricKey: string;
  definition?: string;
  period: Period;
  basis?: EvidenceV2["time"]["basis"];
  scope: EvidenceScope;
  coverage?: Partial<EvidenceCoverage>;
  refs?: Array<{ handle: string; href: string }>;
  profile?: FieldProfile;
  limitations?: string[];
};

function base(ctx: BuildContext, input: Common, unit: EvidenceUnit) {
  const semantics = semanticsFor(input.metricKey, unit);
  return {
    version: "2" as const,
    id: `${ctx.tool}.${input.local}`,
    sourceType: ctx.tool,
    domain: input.domain,
    calculationVersion: "1",
    semantics: {
      metricKey: semantics.key,
      definition: (input.definition ?? semantics.definition).slice(0, 400),
      aggregation: semantics.aggregation,
      comparableGroup: semantics.comparableGroup,
      ...(unit === "centavos" && { currency: "PHP" as const }),
    },
    scope: input.scope,
    time: {
      period: input.period,
      timeZone: "Asia/Manila" as const,
      basis: input.basis ?? ("snapshot" as const),
      retrievedAt: ctx.retrievedAt,
      asOf: null,
    },
    coverage: {
      query: "complete" as const,
      recording: "unknown" as const,
      period: "not_applicable" as const,
      relationship: "not_applicable" as const,
      recordsConsidered: null,
      truncated: false,
      missingPeriods: [],
      ...input.coverage,
    },
    provenance: {
      tool: ctx.tool,
      sourceRefs: (input.refs ?? []).slice(0, 20),
      inputs: [],
      legacyId: null,
    },
    sharing: {
      route: input.profile ?? ("aggregate" as const),
      allowedFields:
        input.profile === "sensitive_narrative"
          ? ["text", "period"]
          : ["metric", "value", "unit", "period"],
    },
    limitations: (input.limitations ?? []).map((item) => item.slice(0, 400)),
  };
}

export function metric(
  ctx: BuildContext,
  input: Common & { value: number; unit: EvidenceUnit },
): EvidenceV2 {
  return evidenceV2Schema.parse({
    ...base(ctx, input, input.unit),
    kind: "metric",
    value: input.value,
    unit: input.unit,
  });
}

export function recordFact(
  ctx: BuildContext,
  input: Common & { value: string | number | boolean; unit: EvidenceUnit },
): EvidenceV2 {
  return evidenceV2Schema.parse({
    ...base(ctx, input, input.unit),
    kind: "record_fact",
    value:
      typeof input.value === "string" ? input.value.slice(0, 200) : input.value,
    unit: input.unit,
  });
}

export function excerpt(
  ctx: BuildContext,
  input: Omit<Common, "profile"> & { text: string },
): EvidenceV2 {
  return evidenceV2Schema.parse({
    ...base(ctx, { ...input, profile: "sensitive_narrative" }, "text"),
    kind: "text_excerpt",
    text: input.text.slice(0, 600),
    // Private text is the user's own account, never an established fact.
    attributedTo: "user",
  });
}

export function path(
  ctx: BuildContext,
  input: Common & {
    nodes: Array<{ type: string; handle: string }>;
    origin: "native" | "manual";
  },
): EvidenceV2 {
  return evidenceV2Schema.parse({
    ...base(ctx, input, "relationship"),
    kind: "graph_path",
    path: input.nodes,
    origin: input.origin,
  });
}

export const entityScope = (
  handle: string,
  type: string,
  description: string,
): EvidenceScope => ({
  id: handle,
  type: "entity",
  description,
  entity: { type, handle },
});

export const snapshot = (today: string): Period => ({
  from: today,
  through: today,
});
export const onDay = (day: string): Period => ({ from: day, through: day });
