"use client";

import { Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  addGraphRelationshipAction,
  dismissGraphSuggestionAction,
} from "@/lib/graph/actions";
import { explicitGraphPairs, graphRegistry } from "@/lib/graph/registry";
import type { GraphLinkSuggestion } from "@/lib/graph/suggestions";

function goalPair(type: string) {
  return explicitGraphPairs.find(
    (pair) => pair.source === type && pair.target === "goal",
  );
}

/** Suggested links for a goal. Nothing is linked until the owner confirms. */
export function GoalLinkSuggestions({
  goalId,
  suggestions,
}: {
  goalId: string;
  suggestions: GraphLinkSuggestion[];
}) {
  const router = useRouter();
  // Hidden keys belong to one server snapshot. A refresh (for example after
  // an unlink) brings fresh suggestions, so an unlinked record can return.
  const [handled, setHandled] = useState({
    source: suggestions,
    keys: new Set<string>(),
  });
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const hiddenKeys =
    handled.source === suggestions ? handled.keys : new Set<string>();
  const visible = suggestions.filter(
    (suggestion) =>
      !hiddenKeys.has(`${suggestion.item.type}:${suggestion.item.id}`),
  );

  function hide(key: string) {
    setHandled((current) => ({
      source: suggestions,
      keys: new Set(current.source === suggestions ? current.keys : []).add(
        key,
      ),
    }));
  }

  async function link(suggestions: GraphLinkSuggestion[]) {
    let linked = 0;
    let failed = 0;
    for (const { item } of suggestions) {
      const pair = goalPair(item.type);
      if (!pair) continue;
      setPending(`${item.type}:${item.id}`);
      const result = await addGraphRelationshipAction({
        sourceType: pair.source,
        sourceId: item.id,
        targetType: "goal",
        targetId: goalId,
        kind: pair.kind,
      });
      if (result.success) {
        linked += 1;
        hide(`${item.type}:${item.id}`);
      } else failed += 1;
    }
    setPending(null);
    setMessage(
      failed > 0
        ? `Linked ${linked}; ${failed} could not be linked.`
        : linked === 1
          ? "Linked to this goal."
          : `Linked ${linked} items to this goal.`,
    );
    if (linked > 0) router.refresh();
  }

  async function dismiss({ item }: GraphLinkSuggestion) {
    const key = `${item.type}:${item.id}`;
    setPending(key);
    const result = await dismissGraphSuggestionAction({
      goalId,
      entityType: item.type,
      entityId: item.id,
    });
    setPending(null);
    if (result.success) hide(key);
    setMessage(result.success ? "Suggestion hidden." : result.message);
  }

  if (visible.length === 0)
    return message ? (
      <p role="status" className="text-muted-foreground text-sm">
        {message}
      </p>
    ) : null;

  return (
    <section
      aria-labelledby="graph-suggestions"
      className="border-primary/30 bg-primary/5 min-w-0 rounded-2xl border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id="graph-suggestions"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Sparkles className="text-primary size-4" aria-hidden="true" />
            Suggested for this goal
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Based on shared words and the goal’s area. Nothing is linked until
            you confirm.
          </p>
        </div>
        {visible.length > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending !== null}
            onClick={() => void link(visible)}
          >
            Link all {visible.length}
          </Button>
        ) : null}
      </div>
      <ul className="divide-border mt-3 divide-y">
        {visible.map((suggestion) => {
          const { item } = suggestion;
          const key = `${item.type}:${item.id}`;
          return (
            <li
              key={key}
              className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={item.href as never}
                  className="text-primary focus-visible:ring-ring text-sm font-semibold break-words hover:underline focus-visible:ring-2"
                >
                  {item.title}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                  {graphRegistry[item.type].label} · {suggestion.reason}
                  {item.subtitle ? ` · ${item.subtitle}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => void link([suggestion])}
                  aria-label={`Link ${item.title}`}
                >
                  <Check className="size-4" aria-hidden="true" />
                  {pending === key ? "Linking…" : "Link"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending !== null}
                  onClick={() => void dismiss(suggestion)}
                  aria-label={`Not related: ${item.title}`}
                >
                  <X className="size-4" aria-hidden="true" />
                  Not related
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p
        role="status"
        aria-live="polite"
        className="text-muted-foreground mt-2 text-sm empty:hidden"
      >
        {message}
      </p>
    </section>
  );
}
