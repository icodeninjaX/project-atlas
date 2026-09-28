import type { AnalysisBrief, EvidenceV2 } from "./contracts";

/**
 * Requirement- and coverage-aware evidence selection (AI-04). The legacy
 * path fell back when evidence exceeded a count. Here every requirement and
 * every distinct measure within its scopes gets a turn before any group gets
 * a second item, so an opposing record (an overdue task beside completed
 * ones) is not crowded out by more of the same. Exact duplicates and items
 * that restate the same value are removed. Scopes stay labeled so goal
 * evidence and whole-domain context can be presented side by side, never
 * merged.
 */

export type RetrievedEvidence = {
  evidence: EvidenceV2;
  requirementIds: string[];
};

export type Selection = {
  selected: EvidenceV2[];
  scopes: Array<{
    scopeId: string;
    type: EvidenceV2["scope"]["type"];
    description: string;
    evidenceIds: string[];
  }>;
  byRequirement: Record<string, string[]>;
  duplicates: number;
  dropped: number;
  limitations: string[];
};

function valueKey(item: EvidenceV2) {
  const value =
    item.kind === "text_excerpt"
      ? item.text
      : item.kind === "graph_path"
        ? item.path.map((step) => step.handle).join(">")
        : String(item.value);
  return [
    item.kind,
    item.semantics.metricKey,
    item.scope.id,
    item.scope.cohort?.member ?? "",
    item.time.period.from,
    item.time.period.through,
    value,
  ].join("|");
}

export function selectEvidence(
  brief: AnalysisBrief,
  retrieved: RetrievedEvidence[],
  limits: { items: number; bytes: number },
): Selection {
  const seenIds = new Set<string>();
  const seenValues = new Set<string>();
  let duplicates = 0;
  const unique: RetrievedEvidence[] = [];
  for (const entry of retrieved) {
    const key = valueKey(entry.evidence);
    const existing = unique.find(
      (item) =>
        item.evidence.id === entry.evidence.id ||
        valueKey(item.evidence) === key,
    );
    if (seenIds.has(entry.evidence.id) || seenValues.has(key)) {
      duplicates += 1;
      // The same fact serving two requirements is kept once, for both.
      if (existing)
        existing.requirementIds = [
          ...new Set([...existing.requirementIds, ...entry.requirementIds]),
        ];
      continue;
    }
    seenIds.add(entry.evidence.id);
    seenValues.add(key);
    unique.push({
      evidence: entry.evidence,
      requirementIds: [...entry.requirementIds],
    });
  }
  const order = [
    ...brief.requirements.filter((item) => item.essential),
    ...brief.requirements.filter((item) => !item.essential),
  ].map((item) => item.id);
  const rank = (ids: string[]) => {
    const positions = ids
      .map((id) => order.indexOf(id))
      .filter((index) => index >= 0);
    return positions.length ? Math.min(...positions) : order.length;
  };
  const groups = new Map<string, RetrievedEvidence[]>();
  for (const entry of unique) {
    const requirement = rank(entry.requirementIds);
    // A categorical state ("completed", "todo") is its own group, so each
    // distinct state of a measure is represented, and states come first.
    const item = entry.evidence;
    const categorical =
      item.kind === "record_fact" &&
      typeof item.value === "string" &&
      ["text", "stage", "priority"].includes(item.unit);
    const key = categorical
      ? `${String(requirement).padStart(3, "0")}|0|${item.semantics.metricKey}|${String(item.kind === "record_fact" ? item.value : "")}`
      : `${String(requirement).padStart(3, "0")}|1|${item.scope.id}|${item.semantics.metricKey}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  // Requirements take turns, and within a requirement its groups take
  // turns, so no requirement or measure crowds out another.
  const byRank = new Map<string, RetrievedEvidence[][]>();
  for (const [key, items] of [...groups.entries()].sort(([x], [y]) =>
    x.localeCompare(y),
  )) {
    const rankKey = key.slice(0, 3);
    byRank.set(rankKey, [...(byRank.get(rankKey) ?? []), [...items]]);
  }
  const rotations = [...byRank.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([, queues]) => ({ queues, next: 0 }));
  const selected: RetrievedEvidence[] = [];
  let bytes = 0;
  let progress = true;
  while (progress && selected.length < limits.items) {
    progress = false;
    for (const rotation of rotations) {
      if (selected.length >= limits.items) break;
      for (let tries = 0; tries < rotation.queues.length; tries += 1) {
        const queue = rotation.queues[rotation.next % rotation.queues.length]!;
        rotation.next += 1;
        const next = queue.shift();
        if (!next) continue;
        const size = Buffer.byteLength(JSON.stringify(next.evidence));
        if (bytes + size > limits.bytes) continue;
        bytes += size;
        selected.push(next);
        progress = true;
        break;
      }
    }
  }
  const dropped = unique.length - selected.length;
  const scopes = new Map<string, Selection["scopes"][number]>();
  for (const { evidence } of selected) {
    const scope = scopes.get(evidence.scope.id) ?? {
      scopeId: evidence.scope.id,
      type: evidence.scope.type,
      description: evidence.scope.description,
      evidenceIds: [],
    };
    scope.evidenceIds.push(evidence.id);
    scopes.set(evidence.scope.id, scope);
  }
  const byRequirement: Record<string, string[]> = {};
  for (const entry of selected)
    for (const id of entry.requirementIds)
      byRequirement[id] = [...(byRequirement[id] ?? []), entry.evidence.id];
  const limitations = [
    ...new Set(selected.flatMap((entry) => entry.evidence.limitations)),
  ];
  if (dropped > 0)
    limitations.push(
      `${dropped} further item(s) of the same kinds were left out to keep the answer within its limit.`,
    );
  return {
    selected: selected.map((entry) => entry.evidence),
    scopes: [...scopes.values()],
    byRequirement,
    duplicates,
    dropped,
    limitations,
  };
}
