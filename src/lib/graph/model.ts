import type {
  GraphEntitySummary,
  GraphEntityType,
  GraphRelationshipType,
} from "@/lib/graph/registry";

export type GraphEdge = {
  id: string;
  sourceType: GraphEntityType;
  sourceId: string;
  targetType: GraphEntityType;
  targetId: string;
  kind: GraphRelationshipType;
  origin: "native" | "manual";
};

export type RelatedEntity = {
  id: string;
  source: GraphEntitySummary;
  target: GraphEntitySummary;
  related: GraphEntitySummary;
  kind: GraphRelationshipType;
  origin: "native" | "manual";
  removable: boolean;
};

export function materializeRelationships(
  edges: GraphEdge[],
  summaries: Map<string, GraphEntitySummary>,
  anchor: { type: GraphEntityType; id: string },
  limit: number,
) {
  const items = edges.flatMap((edge): RelatedEntity[] => {
    const source = summaries.get(`${edge.sourceType}:${edge.sourceId}`);
    const target = summaries.get(`${edge.targetType}:${edge.targetId}`);
    if (!source || !target) return [];
    const fromSource = source.type === anchor.type && source.id === anchor.id;
    const fromTarget = target.type === anchor.type && target.id === anchor.id;
    if (!fromSource && !fromTarget) return [];
    return [
      {
        id: edge.id,
        source,
        target,
        related: fromSource ? target : source,
        kind: edge.kind,
        origin: edge.origin,
        removable: edge.origin === "manual",
      },
    ];
  });
  return {
    items: items.slice(0, limit),
    hasMore: items.length > limit || edges.length > limit,
  };
}

export function groupRelatedItems(items: RelatedEntity[]) {
  return items.reduce<Partial<Record<GraphEntityType, RelatedEntity[]>>>(
    (groups, item) => {
      (groups[item.related.type] ??= []).push(item);
      return groups;
    },
    {},
  );
}
