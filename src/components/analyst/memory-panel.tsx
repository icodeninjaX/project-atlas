"use client";

import { Bookmark, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Analyst's saved priorities: an offer to remember one the person just
 * stated (nothing is saved until they confirm the exact text), and the list
 * of what Analyst remembers, where each can be deleted.
 */

export type SavedMemory = { id: string; text: string; daysLeft: number };

const DISCLOSURE =
  "Saved priorities are sent to the AI provider with your questions, so answers can take them into account.";

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "That did not work. Try again.";
  } catch {
    return "That did not work. Try again.";
  }
}

/** The owner's saved priorities, with actions to reload, save and delete. */
export function useMemories(enabled: boolean) {
  const [memories, setMemories] = useState<SavedMemory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/analyst/memories", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const body = (await response.json()) as { memories: SavedMemory[] };
      setMemories(body.memories);
      setError(null);
    } catch {
      setError("Saved priorities are unavailable.");
    }
  }, []);
  useEffect(() => {
    // Loading after consent is a fetch, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) void reload();
  }, [enabled, reload]);
  const save = async (text: string) => {
    const response = await fetch("/api/analyst/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return readError(response);
    await reload();
    return null;
  };
  const remove = async (id: string) => {
    const response = await fetch(
      `/api/analyst/memories/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!response.ok) setError(await readError(response));
    await reload();
  };
  return { memories, error, save, remove };
}

/** Offers to remember a priority the person stated in their question. */
export function MemoryOffer({
  text,
  onSave,
}: {
  text: string;
  onSave: (text: string) => Promise<string | null>;
}) {
  const [state, setState] = useState<
    "offered" | "saving" | "saved" | "dismissed"
  >("offered");
  const [error, setError] = useState<string | null>(null);
  if (state === "dismissed") return null;
  if (state === "saved")
    return (
      <p className="text-muted-foreground text-xs" role="status">
        Analyst will remember this. You can delete it under What Analyst
        remembers.
      </p>
    );
  return (
    <div className="border-border bg-background/40 flex min-w-0 flex-col gap-2 rounded-2xl border p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Bookmark aria-hidden="true" className="size-4" /> Remember this for
        future answers?
      </p>
      <p className="break-words">“{text}”</p>
      <p className="text-muted-foreground text-xs">{DISCLOSURE}</p>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={state === "saving"}
          onClick={async () => {
            setState("saving");
            const failure = await onSave(text);
            setError(failure);
            setState(failure ? "offered" : "saved");
          }}
          className="bg-primary-solid text-primary-solid-foreground min-h-9 rounded-full px-4 text-xs font-semibold disabled:opacity-50"
        >
          Remember
        </button>
        <button
          type="button"
          onClick={() => setState("dismissed")}
          className="text-muted-foreground min-h-9 px-2 text-xs underline underline-offset-2"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

/** What Analyst remembers, each with how long it is kept and a delete. */
export function MemoryList({
  memories,
  error,
  onRemove,
}: {
  memories: SavedMemory[] | null;
  error: string | null;
  onRemove: (id: string) => void;
}) {
  return (
    <details className="border-border rounded-2xl border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">
        What Analyst remembers{memories ? ` (${memories.length})` : ""}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}
        {memories?.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Nothing yet. When you mention a lasting goal, such as saving for
            something, Analyst offers to remember it.
          </p>
        )}
        {memories && memories.length > 0 && (
          <ul className="flex flex-col gap-2">
            {memories.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words">{item.text}</p>
                  <p className="text-muted-foreground text-xs">
                    Forgotten in {item.daysLeft}{" "}
                    {item.daysLeft === 1 ? "day" : "days"} unless it comes up
                    again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Forget “${item.text}”`}
                  className="text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">{DISCLOSURE}</p>
      </div>
    </details>
  );
}
